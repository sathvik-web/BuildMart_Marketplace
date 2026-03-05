// ============================================================
// BuildMart Database Package — Singleton Prisma Client
// ============================================================

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Re-export everything from @prisma/client so consumers
// only need to import from "@buildmart/database".
export * from "@prisma/client";

// Export Prisma namespace for Decimal usage:
// import { Prisma } from "@buildmart/database";
// const price = new Prisma.Decimal("1250.50");
export { Prisma } from "@prisma/client";
