"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShoppingCart,
  Store,
  Users,
  Wallet,
  Activity,
  BarChart3,
  Tags,
} from "lucide-react";
import { brand } from "@/config/brand";
import { hasPermission, type PermissionKey } from "@/config/permissions";
import type { MembershipContext } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/shared/mode-toggle";

const nav: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: PermissionKey;
}> = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/products", label: "Products", icon: Package, permission: "products.view" },
  { href: "/dashboard/categories", label: "Categories", icon: Tags, permission: "products.view" },
  { href: "/dashboard/inventory", label: "Inventory", icon: Boxes, permission: "inventory.view" },
  { href: "/dashboard/orders", label: "Sales", icon: ClipboardList, permission: "orders.view" },
  { href: "/dashboard/customers", label: "Customers", icon: Users, permission: "customers.view" },
  { href: "/dashboard/payments", label: "Payments", icon: Wallet, permission: "payments.view" },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3, permission: "reports.view" },
  { href: "/dashboard/staff", label: "Staff", icon: Users, permission: "staff.manage" },
  { href: "/dashboard/activity", label: "Activity", icon: Activity },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, permission: "settings.manage" },
];

export function DashboardShell({
  ctx,
  unread,
  children,
}: {
  ctx: MembershipContext;
  unread: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const role = ctx.membership.role;
  const items = nav.filter(
    (item) => !item.permission || hasPermission(role, ctx.membership.permissions, item.permission)
  );
  const initials = ctx.profile.full_name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="border-b">
          <Link href="/dashboard" className="flex items-center gap-2 px-2 py-1.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Store className="size-4" />
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-semibold">{ctx.organization.name}</span>
              <span className="text-xs text-muted-foreground">{brand.name}</span>
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={
                        item.href === "/dashboard"
                          ? pathname === "/dashboard"
                          : pathname.startsWith(item.href)
                      }
                      render={<Link href={item.href} />}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <Button variant="outline" size="sm" className="w-full justify-start" render={<Link href="/" />}>
            <ShoppingCart />
            View menu
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger />
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              render={<Link href="/dashboard/notifications" />}
              aria-label="Notifications"
            >
              <Bell />
              {unread > 0 ? (
                <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-destructive" />
              ) : null}
            </Button>
            <ModeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" aria-label="Account" />
                }
              >
                <Avatar className="size-8">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{ctx.profile.full_name || "Account"}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {ctx.user.email}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem render={<Link href="/dashboard/settings" />}>
                    <Settings />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link href="/" />}>
                    <Store />
                    Menu
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    window.location.assign("/auth/sign-out");
                  }}
                >
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
