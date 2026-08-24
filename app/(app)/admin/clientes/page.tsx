import SimpleListManager from "@/components/admin/SimpleListManager";

export default function ClientesAdminPage() {
  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-800">Clientes</h1>
      <p className="mb-4 text-sm text-slate-500">Somente o nome é cadastrado aqui — os demais dados do cliente já estão no Omie.</p>
      <SimpleListManager endpoint="/api/options/clientes" fieldName="name" itemLabel="cliente" placeholder="Nome do cliente" />
    </div>
  );
}
