-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

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

-- AlterTable
ALTER TABLE "eventos_acceso"
ADD COLUMN "operado_por_id" INTEGER,
ADD COLUMN "operado_por_porteria_nombre" TEXT,
ADD COLUMN "operado_por_role" "UserRole",
ADD COLUMN "operado_por_username" TEXT;

-- AlterTable
ALTER TABLE "access_logs"
ADD COLUMN "operator_porteria_nombre" TEXT,
ADD COLUMN "operator_role" "UserRole",
ADD COLUMN "operator_user_id" INTEGER,
ADD COLUMN "operator_username" TEXT;

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
CREATE INDEX "eventos_acceso_operado_por_id_fecha_hora_idx" ON "eventos_acceso"("operado_por_id", "fecha_hora");

-- CreateIndex
CREATE INDEX "access_logs_operator_user_id_created_at_idx" ON "access_logs"("operator_user_id", "created_at");

-- AddForeignKey
ALTER TABLE "system_users" ADD CONSTRAINT "system_users_porteria_id_fkey" FOREIGN KEY ("porteria_id") REFERENCES "porterias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_audits" ADD CONSTRAINT "login_audits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "system_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_acceso" ADD CONSTRAINT "eventos_acceso_operado_por_id_fkey" FOREIGN KEY ("operado_por_id") REFERENCES "system_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_operator_user_id_fkey" FOREIGN KEY ("operator_user_id") REFERENCES "system_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;