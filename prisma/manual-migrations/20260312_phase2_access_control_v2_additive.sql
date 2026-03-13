-- CreateEnum
CREATE TYPE "TipoEventoAcceso" AS ENUM ('ENTRADA', 'SALIDA');

-- CreateEnum
CREATE TYPE "EstadoRecintoVehiculo" AS ENUM ('DENTRO', 'FUERA');

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "contratista_id" INTEGER,
ADD COLUMN     "estado_recinto" "EstadoRecintoVehiculo",
ADD COLUMN     "modelo" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "contratistas" (
    "id" SERIAL NOT NULL,
    "razon_social" TEXT NOT NULL,
    "rut" TEXT NOT NULL,
    "email" TEXT,
    "contacto" TEXT,
    "telefono" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contratistas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "choferes" (
    "id" SERIAL NOT NULL,
    "contratista_id" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "rut" TEXT NOT NULL,
    "codigo_interno" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "choferes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "porterias" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "porterias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehiculo_choferes" (
    "id" SERIAL NOT NULL,
    "vehiculo_id" INTEGER NOT NULL,
    "chofer_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehiculo_choferes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_acceso" (
    "id" SERIAL NOT NULL,
    "vehiculo_id" INTEGER NOT NULL,
    "contratista_id" INTEGER NOT NULL,
    "chofer_id" INTEGER,
    "porteria_id" INTEGER NOT NULL,
    "tipo_evento" "TipoEventoAcceso" NOT NULL,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_acceso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contratistas_rut_key" ON "contratistas"("rut");

-- CreateIndex
CREATE INDEX "contratistas_razon_social_idx" ON "contratistas"("razon_social");

-- CreateIndex
CREATE UNIQUE INDEX "choferes_rut_key" ON "choferes"("rut");

-- CreateIndex
CREATE INDEX "choferes_contratista_id_idx" ON "choferes"("contratista_id");

-- CreateIndex
CREATE UNIQUE INDEX "choferes_contratista_id_codigo_interno_key" ON "choferes"("contratista_id", "codigo_interno");

-- CreateIndex
CREATE UNIQUE INDEX "porterias_nombre_key" ON "porterias"("nombre");

-- CreateIndex
CREATE INDEX "vehiculo_choferes_chofer_id_idx" ON "vehiculo_choferes"("chofer_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehiculo_choferes_vehiculo_id_chofer_id_key" ON "vehiculo_choferes"("vehiculo_id", "chofer_id");

-- CreateIndex
CREATE INDEX "eventos_acceso_fecha_hora_idx" ON "eventos_acceso"("fecha_hora");

-- CreateIndex
CREATE INDEX "eventos_acceso_vehiculo_id_fecha_hora_idx" ON "eventos_acceso"("vehiculo_id", "fecha_hora");

-- CreateIndex
CREATE INDEX "eventos_acceso_contratista_id_fecha_hora_idx" ON "eventos_acceso"("contratista_id", "fecha_hora");

-- CreateIndex
CREATE INDEX "eventos_acceso_chofer_id_fecha_hora_idx" ON "eventos_acceso"("chofer_id", "fecha_hora");

-- CreateIndex
CREATE INDEX "eventos_acceso_porteria_id_fecha_hora_idx" ON "eventos_acceso"("porteria_id", "fecha_hora");

-- CreateIndex
CREATE INDEX "eventos_acceso_tipo_evento_fecha_hora_idx" ON "eventos_acceso"("tipo_evento", "fecha_hora");

-- CreateIndex
CREATE INDEX "vehicles_codigo_interno_idx" ON "vehicles"("codigo_interno");

-- CreateIndex
CREATE INDEX "vehicles_contratista_id_idx" ON "vehicles"("contratista_id");

-- CreateIndex
CREATE INDEX "vehicles_estado_recinto_idx" ON "vehicles"("estado_recinto");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_contratista_id_fkey" FOREIGN KEY ("contratista_id") REFERENCES "contratistas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "choferes" ADD CONSTRAINT "choferes_contratista_id_fkey" FOREIGN KEY ("contratista_id") REFERENCES "contratistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehiculo_choferes" ADD CONSTRAINT "vehiculo_choferes_vehiculo_id_fkey" FOREIGN KEY ("vehiculo_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehiculo_choferes" ADD CONSTRAINT "vehiculo_choferes_chofer_id_fkey" FOREIGN KEY ("chofer_id") REFERENCES "choferes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_acceso" ADD CONSTRAINT "eventos_acceso_vehiculo_id_fkey" FOREIGN KEY ("vehiculo_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_acceso" ADD CONSTRAINT "eventos_acceso_contratista_id_fkey" FOREIGN KEY ("contratista_id") REFERENCES "contratistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_acceso" ADD CONSTRAINT "eventos_acceso_chofer_id_fkey" FOREIGN KEY ("chofer_id") REFERENCES "choferes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_acceso" ADD CONSTRAINT "eventos_acceso_porteria_id_fkey" FOREIGN KEY ("porteria_id") REFERENCES "porterias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
