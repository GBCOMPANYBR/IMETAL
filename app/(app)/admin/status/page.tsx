import StatusManager from "@/components/admin/StatusManager";

export default function StatusAdminPage() {
  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-800">Status</h1>
      <p className="mb-4 text-sm text-slate-500">
        Defina o nome, a cor e se pedidos com este status podem ser editados pelos usuários.
      </p>
      <StatusManager />
    </div>
  );
}
