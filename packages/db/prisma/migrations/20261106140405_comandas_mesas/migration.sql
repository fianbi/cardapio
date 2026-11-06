-- CreateEnum
CREATE TYPE "TabStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "tabId" TEXT,
ALTER COLUMN "customerPhone" DROP NOT NULL,
ALTER COLUMN "paymentMethod" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "serviceFeePercent" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "DiningTable" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiningTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tab" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "storeId" TEXT NOT NULL,
    "tableId" TEXT,
    "label" TEXT,
    "status" "TabStatus" NOT NULL DEFAULT 'OPEN',
    "subtotalCents" INTEGER,
    "serviceFeeCents" INTEGER,
    "discountCents" INTEGER,
    "totalCents" INTEGER,
    "paymentMethod" "PaymentMethod",
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tab_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiningTable_storeId_position_idx" ON "DiningTable"("storeId", "position");

-- CreateIndex
CREATE INDEX "Tab_storeId_status_idx" ON "Tab"("storeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Tab_storeId_number_key" ON "Tab"("storeId", "number");

-- CreateIndex
CREATE INDEX "Order_tabId_idx" ON "Order"("tabId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "Tab"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiningTable" ADD CONSTRAINT "DiningTable_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tab" ADD CONSTRAINT "Tab_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tab" ADD CONSTRAINT "Tab_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "DiningTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Só uma comanda aberta por mesa
CREATE UNIQUE INDEX "Tab_one_open_per_table" ON "Tab"("tableId") WHERE "status" = 'OPEN' AND "tableId" IS NOT NULL;
