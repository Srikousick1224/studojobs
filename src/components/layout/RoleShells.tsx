"use client";

import { Bell, Bookmark, LayoutDashboard, Settings, PlusCircle, Send, ShieldAlert, UserRound, Users, Briefcase, Building2 } from "lucide-react";
import type { ReactNode } from "react";
import { DashboardShell, type NavItem } from "@/components/layout/DashboardShell";
import type { Role } from "@/lib/auth/roles";

/** Navigation for each dashboard (client side: icons are components, so they can't cross from the server). */
const NAV: Record<Role, { label: string; items: NavItem[] }> = {
  student: {
    label: "Student",
    items: [
      { href: "/student", label: "Overview", icon: LayoutDashboard },
      { href: "/student/applications", label: "Applications", icon: Send },
      { href: "/student/saved", label: "Saved", icon: Bookmark },
      { href: "/student/profile", label: "Profile", icon: UserRound },
      { href: "/student/notifications", label: "Notifications", icon: Bell },
      { href: "/student/settings", label: "Settings", icon: Settings },
    ],
  },
  employer: {
    label: "Employer",
    items: [
      { href: "/employer", label: "Overview", icon: LayoutDashboard },
      { href: "/employer/applicants", label: "Applicants", icon: Users },
      { href: "/employer/company", label: "Company", icon: Building2 },
      { href: "/employer/jobs", label: "My jobs", icon: Briefcase },
      { href: "/employer/jobs/new", label: "Post a role", icon: PlusCircle },
      { href: "/employer/notifications", label: "Notifications", icon: Bell },
      { href: "/employer/settings", label: "Settings", icon: Settings },
    ],
  },
  admin: {
    label: "Admin",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard },
      { href: "/admin/moderation", label: "Moderation", icon: ShieldAlert },
    ],
  },
};

export function RoleShell({ role, userName, unread = 0, children }: { role: Role; userName: string; unread?: number; children: ReactNode }) {
  const nav = NAV[role];
  const items = nav.items.map((i) => (i.href.endsWith("/notifications") ? { ...i, badge: unread } : i));
  return <DashboardShell role={nav.label} items={items} userName={userName}>{children}</DashboardShell>;
}
