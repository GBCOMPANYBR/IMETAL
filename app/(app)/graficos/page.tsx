import { getCurrentUser } from "@/lib/permissions";
import { redirect } from "next/navigation";
import ChartsClient from "@/components/charts/ChartsClient";

export default async function GraficosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!user.canViewGraficos) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm font-medium text-slate-600">Seu usuário não tem permissão para acessar os Gráficos.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-800">Gráficos</h1>
      <ChartsClient visibleFields={Array.from(user.visibleFields)} />
    </div>
  );
}
