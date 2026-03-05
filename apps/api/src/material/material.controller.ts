import { Controller, Get, Query } from "@nestjs/common";
import { IsOptional } from "class-validator";
import { MaterialService } from "./material.service";
import { Public } from "../auth/decorators/index";
import { MaterialCategory } from "@buildmart/database";

@Controller({ path: "materials", version: "1" })
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  @Public()
  @Get()
  findAll(@Query("category") category?: MaterialCategory) {
    return this.materialService.findAll(category);
  }

  @Public()
  @Get("categories")
  categories() {
    return this.materialService.findCategories();
  }
}
