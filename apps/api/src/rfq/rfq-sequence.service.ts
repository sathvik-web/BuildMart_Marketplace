// ============================================================
// BuildMart — RfqSequenceService
// Generates sequential, human-readable reference numbers.
// BM-RFQ-000001 / BM-QT-000001 / BM-ORD-000001
// Uses Postgres advisory locks via raw SQL for true atomicity.
// ============================================================

import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/database.module";

const PREFIX_MAP: Record<string, string> = {
  RFQ: "BM-RFQ",
  QUOTE: "BM-QT",
  ORDER: "BM-ORD",
};

@Injectable()
export class RfqSequenceService {
  constructor(private readonly prisma: PrismaService) {}

  async next(counterName: string): Promise<string> {
    // Atomic increment using a raw SQL UPDATE … RETURNING
    const result = await this.prisma.$queryRaw<{ next_value: number }[]>`
      UPDATE sequence_counters
      SET    next_value = next_value + 1
      WHERE  name = ${counterName}
      RETURNING next_value
    `;

    if (!result.length) {
      // Bootstrap if missing (e.g. in tests)
      await this.prisma.sequenceCounter.create({
        data: { name: counterName, nextValue: 2 },
      });
      return this.format(counterName, 1);
    }

    return this.format(counterName, result[0].next_value - 1);
  }

  private format(name: string, n: number): string {
    const prefix = PREFIX_MAP[name] ?? `BM-${name}`;
    return `${prefix}-${String(n).padStart(6, "0")}`;
  }
}
