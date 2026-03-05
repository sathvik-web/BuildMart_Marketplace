// ============================================================
// BuildMart — RFQ DTOs
// ============================================================

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsDateString,
  IsArray,
  ValidateNested,
  IsUUID,
  IsEnum,
  Min,
  Max,
  MinLength,
  IsPositive,
  ArrayMinSize,
} from "class-validator";
import { Type, Transform } from "class-transformer";
import { PartialType } from "@nestjs/mapped-types";
import { RfqStatus } from "@buildmart/database";

// ── RFQ line item ─────────────────────────────────────────

export class RfqItemDto {
  @IsUUID()
  materialId: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  quantity: number;

  @IsString()
  @IsNotEmpty()
  unitOfMeasure: string; // BAG, MT, CFT, UNIT…

  @IsString()
  @IsOptional()
  specifications?: string;
}

// ── Create RFQ ────────────────────────────────────────────

export class CreateRfqDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  deliveryAddress: string;

  @IsString()
  @IsOptional()
  deliveryCity?: string;

  @IsString()
  @IsOptional()
  deliveryState?: string;

  @IsString()
  @IsNotEmpty()
  deliveryPincode: string;

  @IsNumber({ maxDecimalPlaces: 7 })
  @Min(15.0)   // Southern India latitude bound
  @Max(20.0)   // Northern Telangana bound
  deliveryLat: number;

  @IsNumber({ maxDecimalPlaces: 7 })
  @Min(76.0)   // Western bound
  @Max(82.0)   // Eastern bound
  deliveryLng: number;

  @IsBoolean()
  @IsOptional()
  requireDelivery?: boolean;

  @IsDateString()
  @IsOptional()
  expectedDeliveryDate?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RfqItemDto)
  items: RfqItemDto[];
}

// ── Update RFQ (all optional) ─────────────────────────────

export class UpdateRfqDto extends PartialType(CreateRfqDto) {}

// ── List query params ─────────────────────────────────────

export class ListRfqsQueryDto {
  @IsEnum(RfqStatus)
  @IsOptional()
  status?: RfqStatus;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number;
}
