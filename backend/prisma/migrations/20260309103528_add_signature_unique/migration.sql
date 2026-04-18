/*
  Warnings:

  - You are about to drop the column `option_id` on the `Option` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[signature]` on the table `Task` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Option" DROP COLUMN "option_id";

-- AlterTable
ALTER TABLE "Worker" ALTER COLUMN "pending_amount" SET DATA TYPE TEXT,
ALTER COLUMN "locked_amount" SET DATA TYPE TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Task_signature_key" ON "Task"("signature");
