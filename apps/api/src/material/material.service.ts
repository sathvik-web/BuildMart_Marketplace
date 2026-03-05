import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/database.module";
import { MaterialCategory } from "@buildmart/database";

@Injectable()
export class MaterialService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(category?: MaterialCategory) {
    return this.prisma.material.findMany({
      where: { isActive: true, ...(category ? { category } : {}) },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  }

  async findCategories() {
    return Object.values(MaterialCategory);
  }
}
