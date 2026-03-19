import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();

const TEST_LICENSE_PLATE = "TEST001";
const TEST_CONTRACTOR_RUT = "STAGING-TEST001";
const shouldResetHistory = process.argv.includes("--reset-history");
const STAGING_PORTERIA_SEQUENCE = [
    { nombre: "Cala Cala" },
    { nombre: "Soledad" },
    { nombre: "Tana" },
    { nombre: "Negreiros" },
] as const;

const DEFAULT_STAGING_OPERATOR_USERNAME =
    process.env.STAGING_OPERATOR_USERNAME
    ?? process.env.GUARD_USERNAME
    ?? "staging.guard";
const DEFAULT_STAGING_OPERATOR_PASSWORD =
    process.env.STAGING_OPERATOR_PASSWORD
    ?? process.env.GUARD_PASSWORD
    ?? "guard123";

async function ensureStagingOperator(porteriaId: number | null) {
    const existing = await prisma.systemUser.findUnique({
        where: { username: DEFAULT_STAGING_OPERATOR_USERNAME },
        select: {
            id: true,
            username: true,
        },
    });

    if (!existing) {
        const passwordHash = await hashPassword(DEFAULT_STAGING_OPERATOR_PASSWORD);

        return prisma.systemUser.create({
            data: {
                username: DEFAULT_STAGING_OPERATOR_USERNAME,
                passwordHash,
                role: "USER",
                isActive: true,
                porteriaId,
            },
            select: {
                id: true,
                username: true,
                role: true,
                porteriaId: true,
                isActive: true,
            },
        });
    }

    return prisma.systemUser.update({
        where: { id: existing.id },
        data: {
            role: "USER",
            isActive: true,
            porteriaId,
        },
        select: {
            id: true,
            username: true,
            role: true,
            porteriaId: true,
            isActive: true,
        },
    });
}

async function main() {
    const manualTableExistsRows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = 'vehiculos'
        ) AS exists
    `;

    const manualTableExists = manualTableExistsRows[0]?.exists ?? false;
    const manualRows = manualTableExists
        ? await prisma.$queryRawUnsafe<Array<{ id: number; patente: string }>>(
            "SELECT id, patente FROM vehiculos WHERE patente = $1 OR UPPER(REGEXP_REPLACE(patente, '[^A-Za-z0-9]', '', 'g')) = $1 ORDER BY id ASC",
            TEST_LICENSE_PLATE,
        )
        : [];

    const contratista = await prisma.contratista.upsert({
        where: { rut: TEST_CONTRACTOR_RUT },
        update: {
            razonSocial: "Contratista Staging Secuencial",
            contacto: "QA Staging",
            telefono: "+56900000000",
        },
        create: {
            razonSocial: "Contratista Staging Secuencial",
            rut: TEST_CONTRACTOR_RUT,
            contacto: "QA Staging",
            telefono: "+56900000000",
        },
        select: {
            id: true,
            razonSocial: true,
            rut: true,
        },
    });

    const porterias = [];
    for (const porteriaInput of STAGING_PORTERIA_SEQUENCE) {
        const porteria = await prisma.porteria.upsert({
            where: { nombre: porteriaInput.nombre },
            update: {},
            create: {
                nombre: porteriaInput.nombre,
            },
            select: {
                id: true,
                nombre: true,
            },
        });

        porterias.push(porteria);
    }

    const stagingOperator = await ensureStagingOperator(porterias[0]?.id ?? null);

    const vehicle = await prisma.vehicle.upsert({
        where: { licensePlate: TEST_LICENSE_PLATE },
        update: {
            name: `Vehículo ${TEST_LICENSE_PLATE}`,
            codigoInterno: "T001",
            rut: "AUTO-TEST001-STAGING",
            vehicleType: "Camioneta",
            brand: "Staging",
            company: contratista.razonSocial,
            accessStatus: "YES",
            contratistaId: contratista.id,
            modelo: "Secuencial",
        },
        create: {
            name: `Vehículo ${TEST_LICENSE_PLATE}`,
            licensePlate: TEST_LICENSE_PLATE,
            codigoInterno: "T001",
            rut: "AUTO-TEST001-STAGING",
            vehicleType: "Camioneta",
            brand: "Staging",
            company: contratista.razonSocial,
            accessStatus: "YES",
            contratistaId: contratista.id,
            modelo: "Secuencial",
        },
        select: {
            id: true,
            licensePlate: true,
            codigoInterno: true,
            company: true,
            accessStatus: true,
            contratistaId: true,
            estadoRecinto: true,
        },
    });

    let deletedEvents = 0;
    if (shouldResetHistory) {
        const deleted = await prisma.eventoAcceso.deleteMany({
            where: { vehiculoId: vehicle.id },
        });
        deletedEvents = deleted.count;

        await prisma.vehicle.update({
            where: { id: vehicle.id },
            data: { estadoRecinto: null },
        });
    }

    console.log(
        JSON.stringify(
            {
                connection: "Uses current DATABASE_URL from process environment.",
                warning:
                    manualRows.length > 0
                        ? "Se detectaron filas en la tabla manual vehiculos. La app no la usa; Prisma consulta vehicles."
                        : null,
                manualVehiculosRows: manualRows,
                stagingOperator: {
                    id: stagingOperator.id,
                    username: stagingOperator.username,
                    role: stagingOperator.role,
                    porteriaId: stagingOperator.porteriaId,
                    isActive: stagingOperator.isActive,
                },
                contratista,
                porterias,
                vehicle,
                historyReset: shouldResetHistory,
                deletedEvents,
            },
            null,
            2,
        ),
    );
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
