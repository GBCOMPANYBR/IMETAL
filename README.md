# IMETAL — Gestão de Pedidos

Sistema web para gestão de pedidos e clientes, com banco de dados, permissões por usuário, status configuráveis com trava de edição, filtros por coluna, paginação inteligente, gráficos e anexos.

## Stack

- **Next.js 16 (App Router) + TypeScript** — front-end e API no mesmo app.
- **Prisma + SQLite** (`prisma/dev.db`) — banco em arquivo, ideal para um servidor na rede local.
- **Autenticação própria** (sessão em cookie httpOnly assinada com JWT) — sem serviços externos.
- **Tailwind CSS** + **Recharts** para gráficos.
- Anexos ficam em `storage/attachments/`, fora da pasta pública, e só são liberados por uma rota autenticada que confere permissão a cada acesso.

## Primeiro uso

```bash
npm install
npx prisma migrate deploy   # cria o banco (prisma/dev.db)
npm run db:seed             # importa Dados.xlsx e cria os usuários iniciais
npm run build
npm start                   # sobe em http://localhost:3000
```

O seed procura primeiro `Dados.xlsx` (planilha real) na raiz do projeto; se não encontrar, usa `Pasta1.xlsx` (protótipo) como alternativa. Nenhuma das duas é versionada no git (dados reais de clientes/valores) — copie o arquivo manualmente antes de rodar `db:seed` num ambiente novo.

Durante o desenvolvimento, use `npm run dev` em vez de `build`/`start`.

### Usuários criados pelo seed

| Login    | Senha       | Perfil                                            |
|----------|-------------|----------------------------------------------------|
| admin    | imetal123   | ADMIN — acesso total, único que exclui registros    |
| nivel1   | imetal123   | Vê todas as colunas, somente leitura                |
| nivel2   | imetal123   | Vê um subconjunto de colunas (sem dados financeiros), somente leitura |
| nivel3   | imetal123   | Vê quase tudo (exceto NCM/Valor/Pagamento) e pode editar |

**Troque essas senhas em `/admin/usuarios` assim que possível.** Os perfis nivel1/nivel2/nivel3 replicam exemplos de níveis de acesso esboçados originalmente pelo próprio Felipe e servem apenas de ponto de partida — edite as permissões ou exclua esses usuários livremente.

### Sobre os dados importados (Dados.xlsx)

- **3.948 pedidos** importados, de 2021 até 2026, somando ~R$ 31,1 milhões em Valor Total.
- **45 clientes** distintos.
- **6 status** detectados na planilha: Finalizado e Cancelado entram travados para edição; Em andamento, Instalação, Sem ação e Externo entram liberados — ajuste em `/admin/status` se algum desses não fizer sentido.
- 22 pedidos estavam sem Status na planilha original e entraram como "Sem ação"; 1 pedido tinha um valor de Tipo inválido ("CAJAMAR", claramente um erro de digitação) e entrou como "VENDA". O seed lista os IDs originais desses casos no terminal ao rodar `db:seed` — vale conferir esses registros específicos depois de importar.
- A coluna "Anexos" da planilha era só uma contagem em texto — não havia arquivos reais, então os pedidos importados nascem sem anexos; anexe os arquivos de verdade pela tela.
- Alguns nomes de cliente parecem duplicados por grafia (ex.: "GIG WATER" vs "GIGWATER", "PRIMO TEDESCO" vs "PRIMOTEDESCO") — mantive como estavam na planilha por não ter certeza se são a mesma empresa. A tela `/admin/clientes` hoje só renomeia um cadastro, não faz merge de dois cadastros num só; se confirmarem que são a mesma empresa, isso precisa de um ajuste direto no banco (posso fazer) para mover os pedidos de um cadastro pro outro antes de excluir o duplicado.

## Rodando como servidor na rede local

1. Rode `npm run build && npm start` num computador/servidor da empresa que fique ligado.
2. Outros computadores acessam pelo navegador em `http://<IP-do-servidor>:3000`.
3. Para manter o processo no ar (reiniciar sozinho se cair), use um gerenciador como `pm2`:
   ```bash
   npm i -g pm2
   pm2 start npm --name imetal -- start
   pm2 save
   ```
4. Faça backup periódico de `prisma/dev.db` e da pasta `storage/` — é onde ficam os dados e os anexos.

## Estrutura das permissões

- Cada usuário tem uma lista de **colunas visíveis** (`/admin/usuarios`). O backend nunca envia ao navegador um campo que o usuário não pode ver — não é apenas uma tela escondida.
- `canEdit` (por usuário) define se ele pode editar/criar pedidos. Quem tem `canEdit = false` só visualiza.
- Cada **Status** tem um campo "permite edição". Pedidos num status não editável ficam bloqueados para todos, exceto ADMIN.
- Apenas ADMIN exclui pedidos e anexos.
- Alterar as permissões de um usuário em `/admin/usuarios` vale imediatamente, sem precisar logout/login.

## Preparado para o Omie

O cadastro de Cliente guarda só o nome, propositalmente — os demais dados (endereço, contato, etc.) ficam no Omie. O código está organizado em `lib/` (regras) e `app/api/` (rotas) de forma que uma futura integração (por exemplo, sincronizar clientes ou pedidos com a API do Omie) pode ser adicionada como um módulo novo sem mexer nas regras de permissão existentes.
