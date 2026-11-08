-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "discount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "promotionId" TEXT,
ADD COLUMN     "reminderSentAt" TIMESTAMP(3),
ADD COLUMN     "reviewRequestedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Promotion" ADD COLUMN     "code" TEXT,
ADD COLUMN     "maxUses" INTEGER;

-- AlterTable
ALTER TABLE "Testimonial" ADD COLUMN     "appointmentId" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'PANEL';

-- CreateIndex
CREATE UNIQUE INDEX "Promotion_code_key" ON "Promotion"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Testimonial_appointmentId_key" ON "Testimonial"("appointmentId");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

