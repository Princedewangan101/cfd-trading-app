-- AlterTable
ALTER TABLE "User" ADD COLUMN     "balance" INTEGER NOT NULL DEFAULT 0;

-- Copy existing balances into the new column
UPDATE "User" SET "balance" = COALESCE("availableBalance", 0) + COALESCE("lockedBalance", 0);

-- Drop old columns
ALTER TABLE "User" DROP COLUMN     "availableBalance",
DROP COLUMN     "lockedBalance";
