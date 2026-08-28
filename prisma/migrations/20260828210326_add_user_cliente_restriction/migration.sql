-- AlterTable
ALTER TABLE "User" ADD COLUMN     "allClientes" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "UserCliente" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,

    CONSTRAINT "UserCliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserCliente_userId_clienteId_key" ON "UserCliente"("userId", "clienteId");

-- AddForeignKey
ALTER TABLE "UserCliente" ADD CONSTRAINT "UserCliente_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCliente" ADD CONSTRAINT "UserCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
