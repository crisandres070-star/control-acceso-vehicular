import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const vehicles = [
        {
            name: "Luis Herrera",
            licensePlate: "ABC123",
            codigoInterno: "INT001",
            rut: "12345678-9",
            vehicleType: "Sedan",
            brand: "Toyota",
            company: "Logistica Norte",
            accessStatus: "YES",
        },
        {
            name: "Marta Soto",
            licensePlate: "TRK908",
            codigoInterno: "INT002",
            rut: "87654321-K",
            vehicleType: "Pickup",
            brand: "Ford",
            company: "Servicios Delta",
            accessStatus: "YES",
        },
        {
            name: "Proveedor Externo",
            licensePlate: "XYZ777",
            codigoInterno: "INT003",
            rut: "11222333-4",
            vehicleType: "Van",
            brand: "Hyundai",
            company: "Contratistas Uno",
            accessStatus: "NO",
        },
    ];

    for (const vehicle of vehicles) {
        await prisma.vehicle.upsert({
            where: { licensePlate: vehicle.licensePlate },
            update: vehicle,
            create: vehicle,
        });
    }
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });