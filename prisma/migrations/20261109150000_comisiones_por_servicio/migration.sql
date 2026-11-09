-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "commissionPercent" INTEGER;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "commissionPercent" INTEGER;

-- AlterTable
ALTER TABLE "ServiceCategory" ADD COLUMN     "agenda" TEXT NOT NULL DEFAULT 'SALON',
ADD COLUMN     "commissionPercent" INTEGER;

-- AlterTable
ALTER TABLE "TeamMember" DROP COLUMN "commissionPercent";


-- Porcentajes del salón para las categorías que ya existen.
UPDATE "ServiceCategory" SET "commissionPercent" = 30 WHERE slug = 'rizos' AND "commissionPercent" IS NULL;
UPDATE "ServiceCategory" SET "commissionPercent" = 50, agenda = 'NAILS' WHERE slug = 'nails' AND "commissionPercent" IS NULL;
