-- Migration: Add sequential orden field to Porteria model
-- Purpose: Support sequential checkpoint-based entry/exit flows
-- Date: 2026-03-18

-- Add orden column to porterias table
ALTER TABLE "porterias" ADD COLUMN "orden" INTEGER NOT NULL DEFAULT 0;

-- Create index for efficient ordering queries
CREATE INDEX "idx_porterias_orden" ON "porterias"("orden");

-- Add EN_TRANSITO to EstadoRecintoVehiculo enum
-- Note: PostgreSQL requires ALTER TYPE for enum extensions
ALTER TYPE "EstadoRecintoVehiculo" ADD VALUE 'EN_TRANSITO' AFTER 'FUERA';
