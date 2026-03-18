import { Prisma, PrismaClient } from "@prisma/client";

const DEBUG_PRISMA_QUERIES = process.env.DEBUG_PRISMA_QUERIES === "true";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

const prismaLogConfig: Array<Prisma.LogLevel | Prisma.LogDefinition> =
    process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];

if (DEBUG_PRISMA_QUERIES) {
    prismaLogConfig.unshift("query");
}

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        log: prismaLogConfig,
    });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
