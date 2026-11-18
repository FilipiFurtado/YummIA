/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `Cart` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Cart" ALTER COLUMN "tokenHash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "cart_one_active_per_user" ON "Cart"("userId") WHERE ("status" = 'ACTIVE');
