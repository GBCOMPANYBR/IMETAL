import { getCurrentUser } from "@/lib/permissions";
import { redirect } from "next/navigation";
import ChartsClient from "@/components/charts/ChartsClient";

export default async function GraficosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-800">Gráficos</h1>
      <ChartsClient visibleFields={Array.from(user.visibleFields)} />
    </div>
  );
}
