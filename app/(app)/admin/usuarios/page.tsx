import UsuariosManager from "@/components/admin/UsuariosManager";

export default function UsuariosAdminPage() {
  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-800">Usuários</h1>
      <p className="mb-4 text-sm text-slate-500">
        Cadastre os usuários do sistema e marque quais colunas cada um pode visualizar. Somente administradores podem excluir pedidos.
      </p>
      <UsuariosManager />
    </div>
  );
}
