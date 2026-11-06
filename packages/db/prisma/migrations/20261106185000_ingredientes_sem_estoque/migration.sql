-- DropForeignKey
ALTER TABLE "StockMovement" DROP CONSTRAINT "StockMovement_ingredientId_fkey";

-- DropForeignKey
ALTER TABLE "StockMovement" DROP CONSTRAINT "StockMovement_orderId_fkey";

-- DropForeignKey
ALTER TABLE "StockMovement" DROP CONSTRAINT "StockMovement_storeId_fkey";

-- Ingrediente que estava zerado já nasce "em falta"
ALTER TABLE "Ingredient" ADD COLUMN "available" BOOLEAN NOT NULL DEFAULT true;
UPDATE "Ingredient" SET "available" = false WHERE "stockQty" <= 0;

-- AlterTable
ALTER TABLE "Ingredient" DROP COLUMN "minQty",
DROP COLUMN "stockQty",
DROP COLUMN "unit";

-- AlterTable
ALTER TABLE "RecipeItem" DROP COLUMN "quantity";

-- DropTable
DROP TABLE "StockMovement";

-- DropEnum
DROP TYPE "IngredientUnit";

-- DropEnum
DROP TYPE "StockMovementReason";

