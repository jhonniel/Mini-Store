import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export type ImageFolder = "products" | "logos" | "payments";

function env(name: string, fallback?: string) {
  return (process.env[name] || fallback || "").trim();
}

function s3Config() {
  const bucket = env("S3_BUCKET", env("AWS_S3_BUCKET")) || "product-images";
  const assetsBucket = env("S3_ASSETS_BUCKET") || "organization-assets";
  const region = env("S3_REGION", env("AWS_REGION")) || "ap-southeast-1";
  const accessKeyId = env("S3_ACCESS_KEY_ID", env("AWS_ACCESS_KEY_ID"));
  const secretAccessKey = env("S3_SECRET_ACCESS_KEY", env("AWS_SECRET_ACCESS_KEY"));
  const endpoint = env("S3_ENDPOINT") || undefined;
  const publicBase = env("S3_PUBLIC_URL").replace(/\/$/, "");
  const supabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "");
  const forcePathStyle = env("S3_FORCE_PATH_STYLE") === "true" || Boolean(endpoint);
  return {
    bucket,
    assetsBucket,
    region,
    accessKeyId,
    secretAccessKey,
    endpoint,
    publicBase,
    supabaseUrl,
    forcePathStyle,
  };
}

function bucketFor(folder: ImageFolder) {
  const { bucket, assetsBucket } = s3Config();
  return folder === "products" ? bucket : assetsBucket;
}

export function isS3Configured() {
  const { accessKeyId, secretAccessKey } = s3Config();
  return Boolean(accessKeyId && secretAccessKey);
}

function client() {
  const { region, accessKeyId, secretAccessKey, endpoint, forcePathStyle } = s3Config();
  return new S3Client({
    region,
    endpoint,
    forcePathStyle,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function publicUrl(bucket: string, key: string) {
  const { endpoint, publicBase, supabaseUrl } = s3Config();
  if (publicBase) return `${publicBase}/${key}`;
  if (supabaseUrl && endpoint?.includes("storage.supabase.co")) {
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${key}`;
  }
  if (endpoint) return `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`;
  const { region } = s3Config();
  if (region === "us-east-1") return `https://${bucket}.s3.amazonaws.com/${key}`;
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

function extensionFor(file: { type?: string; name?: string }): { ext: string; contentType: string } | null {
  const fromType = file.type ? ALLOWED[file.type] : undefined;
  if (fromType && file.type) return { ext: fromType, contentType: file.type };
  const name = (file.name || "").toLowerCase();
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return { ext: "jpg", contentType: "image/jpeg" };
  if (name.endsWith(".png")) return { ext: "png", contentType: "image/png" };
  if (name.endsWith(".webp")) return { ext: "webp", contentType: "image/webp" };
  if (name.endsWith(".gif")) return { ext: "gif", contentType: "image/gif" };
  return null;
}

export async function uploadImageBuffer(
  body: Buffer,
  organizationId: string,
  folder: ImageFolder,
  contentType: string
) {
  if (!isS3Configured()) {
    return { error: "S3 is not configured. Add S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, and S3_ENDPOINT." };
  }
  const allowed = ALLOWED[contentType];
  if (!allowed) return { error: "Use a JPG, PNG, WEBP, or GIF image." };
  if (body.byteLength > MAX_BYTES) return { error: "Image must be 5 MB or smaller." };

  const bucket = bucketFor(folder);
  const key = `${organizationId}/${folder}/${crypto.randomUUID()}.${allowed}`;
  const acl = env("S3_ACL") || undefined;

  try {
    await client().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
        ...(acl === "public-read" ? { ACL: "public-read" as const } : {}),
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to upload image.";
    return { error: `Could not save the image to S3. ${message}` };
  }

  return { url: publicUrl(bucket, key) };
}

export async function uploadImageFile(file: File, organizationId: string, folder: ImageFolder) {
  const kind = extensionFor(file);
  if (!kind) return { error: "Use a JPG, PNG, WEBP, or GIF image." };
  if (file.size > MAX_BYTES) return { error: "Image must be 5 MB or smaller." };
  const body = Buffer.from(await file.arrayBuffer());
  return uploadImageBuffer(body, organizationId, folder, kind.contentType);
}

export async function takeUploadedImage(
  formData: FormData,
  organizationId: string,
  options: { fileField: string; urlField: string; folder: ImageFolder }
) {
  const file = formData.get(options.fileField);
  const existing = String(formData.get(options.urlField) || "").trim() || null;
  if (file instanceof File && file.size > 0) {
    const result = await uploadImageFile(file, organizationId, options.folder);
    if ("error" in result && result.error) return { url: existing, error: result.error };
    return { url: "url" in result ? result.url : existing };
  }
  return { url: existing };
}

export async function uploadGeneratedQr(accountNumber: string, organizationId: string) {
  if (!isS3Configured()) return { url: null as string | null };
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=440x440&data=${encodeURIComponent(accountNumber)}`;
  try {
    const response = await fetch(qrUrl);
    if (!response.ok) return { url: null as string | null };
    const body = Buffer.from(await response.arrayBuffer());
    const result = await uploadImageBuffer(body, organizationId, "payments", "image/png");
    if ("url" in result) return { url: result.url };
    return { url: null as string | null };
  } catch {
    return { url: null as string | null };
  }
}
