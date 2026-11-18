-- CreateTable
CREATE TABLE "ProductSemanticIndex" (
    "productId" INTEGER NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "textHash" VARCHAR(64) NOT NULL,
    "embedding" DOUBLE PRECISION[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSemanticIndex_pkey" PRIMARY KEY ("productId")
);

-- AddForeignKey
ALTER TABLE "ProductSemanticIndex" ADD CONSTRAINT "ProductSemanticIndex_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
