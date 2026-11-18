-- AlterTable
ALTER TABLE "CartProposalItem" ADD COLUMN     "action" "CartProposalItemAction" NOT NULL DEFAULT 'ADD',
ADD COLUMN     "expectedQuantity" INTEGER,
ADD COLUMN     "targetQuantity" INTEGER;
