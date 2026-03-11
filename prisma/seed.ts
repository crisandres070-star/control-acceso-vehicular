import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const vehicles = [
        {
            name: "Luis Herrera",
            licensePlate: "ABC123",
            codigoInterno: "INT001",
            vehicleType: "Sedan",
            brand: "Toyota",
            company: "Logistica Norte",
            accessStatus: "YES",
        },
        {
            name: "Marta Soto",
            licensePlate: "TRK908",
            codigoInterno: "INT002",
            vehicleType: "Pickup",
            brand: "Ford",
            company: "Servicios Delta",
            accessStatus: "YES",
        },
        {
            name: "Proveedor Externo",
            licensePlate: "XYZ777",
            codigoInterno: "INT003",
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