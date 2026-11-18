-- CreateEnum
CREATE TYPE "CartProposalItemAction" AS ENUM ('ADD', 'SET_QUANTITY');

-- AlterTable
ALTER TABLE "CartProposal" ADD COLUMN     "action" "CartProposalItemAction" NOT NULL DEFAULT 'ADD',
ADD COLUMN     "expectedQuantity" INTEGER,
ADD COLUMN     "targetQuantity" INTEGER;
