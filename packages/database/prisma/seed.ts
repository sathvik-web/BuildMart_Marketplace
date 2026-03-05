// ============================================================
// BuildMart — Prisma Seed
// Pre-seeds Materials catalog + SequenceCounters + Admin user.
// Run: pnpm db:seed
// ============================================================

import { PrismaClient, MaterialCategory } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding BuildMart database...");

  // ── 1. Sequence Counters ─────────────────────────────────────
  await prisma.sequenceCounter.createMany({
    data: [
      { name: "RFQ", nextValue: 1 },
      { name: "QUOTE", nextValue: 1 },
      { name: "ORDER", nextValue: 1 },
    ],
    skipDuplicates: true,
  });
  console.log("✅  Sequence counters created.");

  // ── 2. Materials Catalog — Hyderabad Construction Market ────
  const materials = [
    // CEMENT
    { category: MaterialCategory.CEMENT, name: "OPC 53 Grade Cement", grade: "53 Grade", brand: "UltraTech", unitOfMeasure: "BAG" },
    { category: MaterialCategory.CEMENT, name: "OPC 43 Grade Cement", grade: "43 Grade", brand: "UltraTech", unitOfMeasure: "BAG" },
    { category: MaterialCategory.CEMENT, name: "PPC Cement", grade: "PPC", brand: "ACC", unitOfMeasure: "BAG" },
    { category: MaterialCategory.CEMENT, name: "OPC 53 Grade Cement", grade: "53 Grade", brand: "Ramco", unitOfMeasure: "BAG" },
    { category: MaterialCategory.CEMENT, name: "White Cement", grade: "White", brand: "JK White", unitOfMeasure: "BAG" },

    // STEEL — TMT Bars
    { category: MaterialCategory.STEEL, name: "TMT Steel Bar Fe 500D", grade: "Fe 500D", brand: "JSW", unitOfMeasure: "MT" },
    { category: MaterialCategory.STEEL, name: "TMT Steel Bar Fe 550D", grade: "Fe 550D", brand: "TATA Tiscon", unitOfMeasure: "MT" },
    { category: MaterialCategory.STEEL, name: "TMT Steel Bar Fe 500D", grade: "Fe 500D", brand: "Vizag Steel", unitOfMeasure: "MT" },
    { category: MaterialCategory.STEEL, name: "Structural Steel MS Plate", grade: "IS 2062", brand: "SAIL", unitOfMeasure: "MT" },

    // SAND
    { category: MaterialCategory.SAND, name: "River Sand (M-Sand)", grade: "Zone II", brand: null, unitOfMeasure: "CFT" },
    { category: MaterialCategory.SAND, name: "M-Sand (Manufactured)", grade: "Zone II", brand: null, unitOfMeasure: "CFT" },
    { category: MaterialCategory.SAND, name: "Plastering Sand", grade: "Fine", brand: null, unitOfMeasure: "CFT" },

    // AGGREGATE
    { category: MaterialCategory.AGGREGATE, name: "Coarse Aggregate 20mm", grade: "20mm", brand: null, unitOfMeasure: "CFT" },
    { category: MaterialCategory.AGGREGATE, name: "Coarse Aggregate 12mm", grade: "12mm", brand: null, unitOfMeasure: "CFT" },
    { category: MaterialCategory.AGGREGATE, name: "Fine Aggregate 6mm", grade: "6mm", brand: null, unitOfMeasure: "CFT" },
    { category: MaterialCategory.AGGREGATE, name: "40mm GSB Aggregate", grade: "40mm GSB", brand: null, unitOfMeasure: "MT" },

    // BRICKS
    { category: MaterialCategory.BRICKS, name: "Red Clay Brick", grade: "First Class", brand: null, unitOfMeasure: "UNIT" },
    { category: MaterialCategory.BRICKS, name: "AAC Block 600x200x200mm", grade: "600x200x200", brand: "Siporex", unitOfMeasure: "UNIT" },
    { category: MaterialCategory.BRICKS, name: "Hollow Concrete Block 400x200x200", grade: "400x200x200", brand: null, unitOfMeasure: "UNIT" },

    // ELECTRICAL
    { category: MaterialCategory.ELECTRICAL, name: "FRLS Wire 1.5 sqmm", grade: "1.5 sqmm", brand: "Finolex", unitOfMeasure: "UNIT" },
    { category: MaterialCategory.ELECTRICAL, name: "FRLS Wire 2.5 sqmm", grade: "2.5 sqmm", brand: "Polycab", unitOfMeasure: "UNIT" },
    { category: MaterialCategory.ELECTRICAL, name: "MCB 32A Single Pole", grade: "32A", brand: "Legrand", unitOfMeasure: "UNIT" },
    { category: MaterialCategory.ELECTRICAL, name: "MCB DB 8-Way", grade: "8-Way", brand: "Schneider", unitOfMeasure: "UNIT" },

    // PLUMBING
    { category: MaterialCategory.PLUMBING, name: "CPVC Pipe 1 inch", grade: "1 inch SDR-11", brand: "Astral", unitOfMeasure: "UNIT" },
    { category: MaterialCategory.PLUMBING, name: "uPVC Pipe 4 inch", grade: "4 inch SWR", brand: "Supreme", unitOfMeasure: "UNIT" },
    { category: MaterialCategory.PLUMBING, name: "GI Pipe 1.5 inch", grade: "1.5 inch Medium", brand: "APL Apollo", unitOfMeasure: "UNIT" },

    // SAFETY
    { category: MaterialCategory.SAFETY_EQUIPMENT, name: "Safety Helmet IS 2925", grade: "IS 2925", brand: "Karam", unitOfMeasure: "UNIT" },
    { category: MaterialCategory.SAFETY_EQUIPMENT, name: "Safety Harness Full Body", grade: "EN 361", brand: "Karam", unitOfMeasure: "UNIT" },
  ];

  for (const mat of materials) {
    await prisma.material.upsert({
      where: {
        category_name_grade_brand: {
          category: mat.category,
          name: mat.name,
          grade: mat.grade ?? "",
          brand: mat.brand ?? "",
        },
      },
      update: {},
      create: {
        ...mat,
        grade: mat.grade ?? null,
        brand: mat.brand ?? null,
      },
    });
  }
  console.log(`✅  ${materials.length} materials seeded.`);

  console.log("\n✅  BuildMart seed complete.");
}

main()
  .catch((e) => {
    console.error("❌  Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
