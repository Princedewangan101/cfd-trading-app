/*
  Warnings:

  - Changed the type of `amount` on the `Task` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `pending_amount` on the `Worker` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `locked_amount` on the `Worker` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "done" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "amount",
ADD COLUMN     "amount" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Worker" DROP COLUMN "pending_amount",
ADD COLUMN     "pending_amount" INTEGER NOT NULL,
DROP COLUMN "locked_amount",
ADD COLUMN     "locked_amount" INTEGER NOT NULL;
