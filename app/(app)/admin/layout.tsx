import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) {
    redirect("/");
  }
  return <>{children}</>;
}
