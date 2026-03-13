CREATE TABLE "importaciones_preview" (
    "id" TEXT NOT NULL,
    "owner_username" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "parsed_json" JSONB NOT NULL,
    "preview_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "importaciones_preview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "importaciones_preview_owner_username_expires_at_idx"
    ON "importaciones_preview"("owner_username", "expires_at");

CREATE INDEX "importaciones_preview_expires_at_idx"
    ON "importaciones_preview"("expires_at");