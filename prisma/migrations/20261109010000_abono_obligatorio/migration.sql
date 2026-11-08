-- Abono obligatorio: el cupo queda apartado mientras la clienta paga.
ALTER TABLE "Appointment" ADD COLUMN "holdUntil" TIMESTAMP(3);

-- Pagos: campos neutrales en lugar de los de Bold.
ALTER TABLE "Payment" RENAME COLUMN "boldPaymentId" TO "gatewayId";
ALTER TABLE "Payment" DROP COLUMN "boldTransactionId";
ALTER TABLE "Payment" ADD COLUMN "gateway" TEXT;
ALTER INDEX "Payment_boldPaymentId_key" RENAME TO "Payment_gatewayId_key";
