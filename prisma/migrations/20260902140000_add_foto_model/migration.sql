-- CreateTable
CREATE TABLE "Foto" (
    "id" SERIAL NOT NULL,
    "pedidoId" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedById" INTEGER,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Foto_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Foto" ADD CONSTRAINT "Foto_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Foto" ADD CONSTRAINT "Foto_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
