import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import TopNav from "@/components/TopNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <TopNav name={user.name} role={user.role} isAdmin={user.isAdmin} canViewGraficos={user.canViewGraficos} />
      <main className="mx-auto max-w-[1600px] px-4 py-6">{children}</main>
    </div>
  );
}
