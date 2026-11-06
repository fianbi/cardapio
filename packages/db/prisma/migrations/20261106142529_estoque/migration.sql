-- CreateEnum
CREATE TYPE "IngredientUnit" AS ENUM ('UNIT', 'GRAM', 'MILLILITER');

-- CreateEnum
CREATE TYPE "StockMovementReason" AS ENUM ('PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT', 'LOSS');

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" "IngredientUnit" NOT NULL,
    "stockQty" INTEGER NOT NULL DEFAULT 0,
    "minQty" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeItem" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "RecipeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" "StockMovementReason" NOT NULL,
    "orderId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ingredient_storeId_name_idx" ON "Ingredient"("storeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeItem_productId_ingredientId_key" ON "RecipeItem"("productId", "ingredientId");

-- CreateIndex
CREATE INDEX "StockMovement_storeId_createdAt_idx" ON "StockMovement"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_ingredientId_createdAt_idx" ON "StockMovement"("ingredientId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_orderId_idx" ON "StockMovement"("orderId");

-- AddForeignKey
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
