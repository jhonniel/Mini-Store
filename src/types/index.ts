import type { AppRole } from "@/config/permissions";

export type ProductStatus = "active" | "draft" | "archived";
export type OrderStatus =
  | "draft"
  | "pending"
  | "confirmed"
  | "processing"
  | "ready"
  | "completed"
  | "cancelled"
  | "returned";
export type PaymentStatus = "paid" | "partially_paid" | "unpaid" | "overdue";
export type MemberStatus = "active" | "invited" | "disabled";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  currency: string;
  timezone: string | null;
  locale: string | null;
  logo_url: string | null;
  deleted_at: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
};

export type OrganizationMember = {
  id: string;
  organization_id: string;
  user_id: string;
  role: AppRole;
  permissions: Record<string, boolean> | null;
  status: MemberStatus;
  created_at: string;
};

export type BusinessSettings = {
  organization_id: string;
  allow_pay_later: boolean;
  allow_negative_stock: boolean;
  default_min_stock: number;
  require_customer_confirmation: boolean;
  default_order_status: string;
  payment_terms_days: number;
  allow_customer_self_checkout: boolean;
  low_stock_notifications: boolean;
};

export type MembershipContext = {
  user: { id: string; email?: string | null };
  profile: Profile;
  organization: Organization;
  membership: OrganizationMember;
  settings: BusinessSettings | null;
};

export type Category = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  deleted_at: string | null;
};

export type Product = {
  id: string;
  organization_id: string;
  category_id: string | null;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  image_url: string | null;
  unit: string;
  cost_price: string;
  selling_price: string;
  current_stock: string;
  min_stock: string;
  max_stock: string | null;
  status: ProductStatus;
  deleted_at: string | null;
};

export type CartItem = {
  id: string;
  organization_id: string;
  user_id: string;
  product_id: string;
  quantity: string | number;
};

export type Order = {
  id: string;
  organization_id: string;
  customer_id: string | null;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  total: string;
  amount_paid: string;
  balance: string;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: string | number;
  unit_price_at_sale: string;
  unit_cost_at_sale: string;
  subtotal: string;
  profit: string;
  received_at: string | null;
};

export type InventoryMovement = {
  id: string;
  product_id: string;
  type: string;
  quantity: string | number;
  quantity_after: string | number;
  notes: string | null;
  created_at: string;
};

export type PaymentMethodKind = "cash" | "gcash" | "other";

export type PaymentMethod = {
  id: string;
  organization_id: string;
  name: string;
  kind: PaymentMethodKind;
  account_number: string | null;
  qr_code_url: string | null;
  is_active: boolean;
  sort_order: number;
};
