import { Controller, Get, Post, Patch, Param, Body, ParseUUIDPipe } from "@nestjs/common";
import { QuoteService } from "./quote.service";
import { CurrentUser } from "../auth/decorators";
import { CreateQuoteDto, UpdateQuoteDto } from "./dto";

type JwtPayload = any;

@Controller({ path: "quotes", version: "1" })
export class QuoteController {
  constructor(private readonly qs: QuoteService) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateQuoteDto,
  ): Promise<any> {
    return this.qs.create(user.id, dto);
  }

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
  ): Promise<any> {
    return this.qs.listByVendor(user.id);
  }

  @Get(":id")
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<any> {
    return this.qs.findOne(id, user.id, user.role);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuoteDto,
  ): Promise<any> {
    return this.qs.update(id, user.id, dto);
  }
}