-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "canEdit" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FieldPermission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "FieldPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Status" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    "editable" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Faturamento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "label" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Tipo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "label" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Faturado" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "label" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "statusId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "pedidoCompra" TEXT,
    "data" DATETIME,
    "qtd" REAL NOT NULL DEFAULT 0,
    "codigo" TEXT,
    "descricao" TEXT,
    "ncm" TEXT,
    "valorUnitario" REAL NOT NULL DEFAULT 0,
    "valorTotal" REAL NOT NULL DEFAULT 0,
    "pagamento" TEXT,
    "faturamentoId" INTEGER NOT NULL,
    "tipoId" INTEGER NOT NULL,
    "observacao" TEXT,
    "faturadoId" INTEGER NOT NULL,
    "dataFaturamento" DATETIME,
    "nf" TEXT,
    "pdv" TEXT,
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pedido_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "Status" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pedido_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pedido_faturamentoId_fkey" FOREIGN KEY ("faturamentoId") REFERENCES "Faturamento" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pedido_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "Tipo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pedido_faturadoId_fkey" FOREIGN KEY ("faturadoId") REFERENCES "Faturado" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pedido_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Pedido_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pedidoId" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedById" INTEGER,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "FieldPermission_userId_fieldKey_key" ON "FieldPermission"("userId", "fieldKey");

-- CreateIndex
CREATE UNIQUE INDEX "Status_label_key" ON "Status"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_name_key" ON "Cliente"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Faturamento_label_key" ON "Faturamento"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Tipo_label_key" ON "Tipo"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Faturado_label_key" ON "Faturado"("label");
