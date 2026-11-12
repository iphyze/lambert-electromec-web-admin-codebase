import AdminGuard from "@/components/auth/AdminGuard";
import AdminLayout from "@/components/admin-layout/AdminLayout";

export default function ProtectedAdminLayout({ children }) {
  return <AdminGuard><AdminLayout>{children}</AdminLayout></AdminGuard>;
}
