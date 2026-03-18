-- CreateEnum
CREATE TYPE "TipoEventoAcceso" AS ENUM ('ENTRADA', 'SALIDA');

-- CreateEnum
CREATE TYPE "EstadoRecintoVehiculo" AS ENUM ('DENTRO', 'FUERA', 'EN_TRANSITO');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateTable
CREATE TABLE "vehicles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "license_plate" TEXT NOT NULL,
    "codigo_interno" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "rut" TEXT NOT NULL,
    "vehicle_type" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "access_status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contratista_id" INTEGER,
    "modelo" TEXT,
    "estado_recinto" "EstadoRecintoVehiculo",
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

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
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "porterias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "porteria_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_audits" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "username" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "porteria_nombre" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_audits_pkey" PRIMARY KEY ("id")
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
    "operado_por_id" INTEGER,
    "operado_por_username" TEXT,
    "operado_por_role" "UserRole",
    "operado_por_porteria_nombre" TEXT,
    "tipo_evento" "TipoEventoAcceso" NOT NULL,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_acceso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_logs" (
    "id" SERIAL NOT NULL,
    "license_plate" TEXT NOT NULL,
    "codigo_interno" TEXT,
    "name" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "operator_user_id" INTEGER,
    "operator_username" TEXT,
    "operator_role" "UserRole",
    "operator_porteria_nombre" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_license_plate_key" ON "vehicles"("license_plate");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_rut_key" ON "vehicles"("rut");

-- CreateIndex
CREATE INDEX "vehicles_codigo_interno_idx" ON "vehicles"("codigo_interno");

-- CreateIndex
CREATE INDEX "vehicles_contratista_id_idx" ON "vehicles"("contratista_id");

-- CreateIndex
CREATE INDEX "vehicles_estado_recinto_idx" ON "vehicles"("estado_recinto");

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
CREATE INDEX "porterias_orden_idx" ON "porterias"("orden");

-- CreateIndex
CREATE UNIQUE INDEX "system_users_username_key" ON "system_users"("username");

-- CreateIndex
CREATE INDEX "system_users_role_idx" ON "system_users"("role");

-- CreateIndex
CREATE INDEX "system_users_porteria_id_idx" ON "system_users"("porteria_id");

-- CreateIndex
CREATE INDEX "login_audits_user_id_created_at_idx" ON "login_audits"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "login_audits_username_created_at_idx" ON "login_audits"("username", "created_at");

-- CreateIndex
CREATE INDEX "login_audits_created_at_idx" ON "login_audits"("created_at");

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
CREATE INDEX "eventos_acceso_operado_por_id_fecha_hora_idx" ON "eventos_acceso"("operado_por_id", "fecha_hora");

-- CreateIndex
CREATE INDEX "eventos_acceso_tipo_evento_fecha_hora_idx" ON "eventos_acceso"("tipo_evento", "fecha_hora");

-- CreateIndex
CREATE INDEX "access_logs_license_plate_idx" ON "access_logs"("license_plate");

-- CreateIndex
CREATE INDEX "access_logs_operator_user_id_created_at_idx" ON "access_logs"("operator_user_id", "created_at");

-- CreateIndex
CREATE INDEX "importaciones_preview_owner_username_expires_at_idx" ON "importaciones_preview"("owner_username", "expires_at");

-- CreateIndex
CREATE INDEX "importaciones_preview_expires_at_idx" ON "importaciones_preview"("expires_at");

-- CreateIndex
CREATE INDEX "importaciones_ai_analisis_owner_username_expires_at_idx" ON "importaciones_ai_analisis"("owner_username", "expires_at");

-- CreateIndex
CREATE INDEX "importaciones_ai_analisis_expires_at_idx" ON "importaciones_ai_analisis"("expires_at");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_contratista_id_fkey" FOREIGN KEY ("contratista_id") REFERENCES "contratistas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "choferes" ADD CONSTRAINT "choferes_contratista_id_fkey" FOREIGN KEY ("contratista_id") REFERENCES "contratistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_users" ADD CONSTRAINT "system_users_porteria_id_fkey" FOREIGN KEY ("porteria_id") REFERENCES "porterias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_audits" ADD CONSTRAINT "login_audits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "system_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "eventos_acceso" ADD CONSTRAINT "eventos_acceso_operado_por_id_fkey" FOREIGN KEY ("operado_por_id") REFERENCES "system_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_operator_user_id_fkey" FOREIGN KEY ("operator_user_id") REFERENCES "system_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
