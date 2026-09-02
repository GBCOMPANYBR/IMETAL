-- AlterTable: add the shared grouping key, nullable at first so we can backfill it.
ALTER TABLE "Attachment" ADD COLUMN "codigo" TEXT;

-- Backfill from the Pedido each attachment was originally uploaded through: the group key is
-- "<clienteId>::<codigo>" (scoped per Cliente, since Código is free text and not globally
-- unique), falling back to a synthetic per-pedido key when that Pedido has no Código.
UPDATE "Attachment" a
SET "codigo" = COALESCE(
  CASE WHEN NULLIF(TRIM(p."codigo"), '') IS NOT NULL THEN p."clienteId" || '::' || TRIM(p."codigo") END,
  '__pedido_' || p."id"
)
FROM "Pedido" p
WHERE a."pedidoId" = p."id";

-- Safety net for any row that somehow didn't match above (should not happen in practice).
UPDATE "Attachment" SET "codigo" = '__orphan_' || "id" WHERE "codigo" IS NULL;

ALTER TABLE "Attachment" ALTER COLUMN "codigo" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Attachment_codigo_idx" ON "Attachment"("codigo");

-- AlterTable: pedidoId becomes an optional "uploaded via" reference instead of the ownership
-- boundary — attachments are now shared by codigo and must survive deletion of any single
-- Pedido that happens to share that codigo group.
ALTER TABLE "Attachment" DROP CONSTRAINT "Attachment_pedidoId_fkey";
ALTER TABLE "Attachment" ALTER COLUMN "pedidoId" DROP NOT NULL;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;
