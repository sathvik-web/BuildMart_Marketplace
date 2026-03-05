// ── CreateQuoteDto ────────────────────────────────────────
import {
  IsUUID,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsNumber,
  IsPositive,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  Max,
  MaxLength,
} from "class-validator";
import { Type } from "class-transformer";

export class QuoteItemDto {
  @IsUUID()
  materialId: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  quantity: number;

  @IsString()
  @IsNotEmpty()
  unitOfMeasure: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  unitPrice: number; // INR per UOM — stored as Prisma.Decimal

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateQuoteDto {
  @IsUUID()
  rfqId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items: QuoteItemDto[];

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(28) // Max GST rate in India
  gstPercent: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  deliveryCharges?: number;

  @IsDateString()
  validUntil: string;

  @IsInt()
  @Min(1)
  @Max(90)
  deliveryDays: number;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  termsConditions?: string;
}

// ── UpdateQuoteDto ────────────────────────────────────────
import { PartialType } from "@nestjs/mapped-types";
export class UpdateQuoteDto extends PartialType(CreateQuoteDto) {}
