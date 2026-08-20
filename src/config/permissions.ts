export const permissionKeys = [
  "products.view",
  "products.create",
  "products.edit",
  "products.delete",
  "inventory.view",
  "inventory.adjust",
  "customers.view",
  "customers.manage",
  "orders.view",
  "orders.process",
  "payments.view",
  "payments.record",
  "reports.view",
  "finance.view",
  "settings.manage",
  "staff.manage",
] as const;

export type PermissionKey = (typeof permissionKeys)[number];

export const permissionLabels: Record<PermissionKey, string> = {
  "products.view": "View products",
  "products.create": "Add products",
  "products.edit": "Edit products",
  "products.delete": "Archive products",
  "inventory.view": "View inventory",
  "inventory.adjust": "Adjust inventory",
  "customers.view": "View customers",
  "customers.manage": "Manage customers",
  "orders.view": "View orders",
  "orders.process": "Process sales",
  "payments.view": "View payments",
  "payments.record": "Record payments",
  "reports.view": "View reports",
  "finance.view": "View financials",
  "settings.manage": "Manage settings",
  "staff.manage": "Manage staff",
};

export const defaultStaffPermissions: Record<PermissionKey, boolean> = {
  "products.view": true,
  "products.create": true,
  "products.edit": true,
  "products.delete": false,
  "inventory.view": true,
  "inventory.adjust": true,
  "customers.view": true,
  "customers.manage": true,
  "orders.view": true,
  "orders.process": true,
  "payments.view": false,
  "payments.record": false,
  "reports.view": false,
  "finance.view": false,
  "settings.manage": false,
  "staff.manage": false,
};

export type AppRole = "admin" | "staff" | "customer";

export function hasPermission(
  role: AppRole,
  permissions: Record<string, boolean> | null | undefined,
  key: PermissionKey
) {
  if (role === "admin") return true;
  if (role !== "staff") return false;
  return Boolean(permissions?.[key]);
}
