CREATE TABLE "importaciones_ai_analisis" (
    "id" TEXT NOT NULL,
    "owner_username" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "workbook_json" JSONB NOT NULL,
    "analysis_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "importaciones_ai_analisis_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "importaciones_ai_analisis_owner_username_expires_at_idx"
    ON "importaciones_ai_analisis"("owner_username", "expires_at");

CREATE INDEX "importaciones_ai_analisis_expires_at_idx"
    ON "importaciones_ai_analisis"("expires_at");