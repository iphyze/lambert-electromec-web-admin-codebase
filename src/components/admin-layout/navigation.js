import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  ChartLine,
  Files,
  FolderTree,
  Mail,
  Route,
  Settings2,
  Users,
} from "lucide-react";

// Single source for destinations, permissions, active navigation and page metadata.
export const navigationGroups = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: BarChart3 },
      { label: "Website Statistics", href: "/analytics", icon: ChartLine, adminOnly: true },
      { label: "Projects", href: "/projects", icon: BriefcaseBusiness },
      { label: "Facility Projects", href: "/facility-management/projects", icon: Building2 },
      { label: "Divisions", href: "/divisions", icon: FolderTree, adminOnly: true },
      { label: "Media Center", href: "/media-center", icon: Files },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Contact Messages", href: "/contacts", icon: Mail, adminOnly: true },
      { label: "Email Routing", href: "/email-routing", icon: Route, adminOnly: true },
      { label: "Administrators", href: "/administrators", icon: Users, superAdminOnly: true },
      { label: "System Settings", href: "/settings", icon: Settings2, superAdminOnly: true },
    ],
  },
];

export const roleLabels = {
  super_admin: "Super Administrator",
  admin: "Administrator",
  editor: "Editor",
};

export function isAdministrator(role) {
  return role === "admin" || role === "super_admin";
}

export function visibleNavigation(role) {
  return navigationGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      (!item.superAdminOnly || role === "super_admin") &&
      (!item.adminOnly || isAdministrator(role))
    ),
  })).filter((group) => group.items.length > 0);
}

export function normalizePath(pathname) {
  const path = String(pathname || "/").split(/[?#]/, 1)[0].replace(/\/+$/, "");
  return path || "/";
}

export function isActive(pathname, href) {
  const path = normalizePath(pathname);
  const target = normalizePath(href);
  return path === target || (target !== "/" && path.startsWith(`${target}/`));
}

// Every admin page.js route has an explicit title and parent breadcrumb.
const pageDetails = {
  "/dashboard": { title: "Dashboard" },
  "/analytics": { title: "Website statistics" },
  "/projects": { title: "Projects" },
  "/projects/new": { title: "New project", parent: "Projects" },
  "/projects/edit": { title: "Edit project", parent: "Projects" },
  "/projects/view": { title: "Project details", parent: "Projects" },
  "/facility-management/projects": { title: "Facility projects" },
  "/facility-management/projects/new": { title: "New facility project", parent: "Facility Projects" },
  "/facility-management/projects/edit": { title: "Edit facility project", parent: "Facility Projects" },
  "/facility-management/projects/view": { title: "Facility project details", parent: "Facility Projects" },
  "/divisions": { title: "Divisions" },
  "/media-center": { title: "Media center" },
  "/media-center/categories": { title: "Media categories", parent: "Media Center" },
  "/media-center/new": { title: "New media item", parent: "Media Center" },
  "/media-center/edit": { title: "Edit media item", parent: "Media Center" },
  "/media-center/view": { title: "Media item details", parent: "Media Center" },
  "/contacts": { title: "Contact messages" },
  "/contacts/view": { title: "Message details", parent: "Contact Messages" },
  "/email-routing": { title: "Email routing" },
  "/administrators": { title: "Administrators" },
  "/settings": { title: "System settings" },
};

export function pageMeta(pathname) {
  const path = normalizePath(pathname);
  const group = navigationGroups.find((entry) => entry.items.some((item) => isActive(path, item.href)));
  const matchingItem = group?.items.find((item) => isActive(path, item.href));
  const detail = pageDetails[path] || (matchingItem ? { title: matchingItem.label, parent: matchingItem.label } : { title: "Workspace" });
  return { title: detail.title, section: group?.label || "Workspace", parent: detail.parent || null };
}
