import { Controller, Get, Post, Patch, Param, Body, Query, ParseUUIDPipe } from "@nestjs/common";
import { RfqService } from "./rfq.service";
import { CurrentUser } from "../auth/decorators";
type JwtPayload = any;
import { CreateRfqDto, UpdateRfqDto, ListRfqsQueryDto } from "./dto";

@Controller({ path: "rfqs", version: "1" })
export class RfqController {
  constructor(private readonly rfq: RfqService) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateRfqDto,
  ): Promise<any> {
    return this.rfq.create(user.id, dto);
  }

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListRfqsQueryDto,
  ): Promise<any> {
    return this.rfq.list(user.id, user.role, query);
  }

  @Get(":id")
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<any> {
    return this.rfq.findOne(id, user.id, user.role);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateRfqDto,
  ): Promise<any> {
    return this.rfq.update(user.id, id, dto);
  }

  @Post(":id/publish")
  publish(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<any> {
    return this.rfq.publish(user.id, id);
  }

  @Post(":id/cancel")
  cancel(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<any> {
    return this.rfq.cancel(user.id, id);
  }

  @Get(":id/quotes")
  listQuotes(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<any> {
    return this.rfq.listQuotes(user.id, id);
  }

  @Post(":id/accept")
  acceptQuote(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<any> {
    return this.rfq.acceptQuote(id, id, user.id);
  }
}