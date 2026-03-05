import {
  IsUUID, IsNumber, IsString, IsOptional, IsPositive,
  IsDateString, IsArray, ValidateNested, ArrayMinSize, Min, Max,
} from "class-validator";
import { Type } from "class-transformer";
import { PartialType } from "@nestjs/mapped-types";

export class QuoteItemDto {
  @IsUUID() materialId: string;
  @IsNumber({ maxDecimalPlaces: 4 }) @IsPositive() quantity: number;
  @IsString() unitOfMeasure: string;
  @IsNumber({ maxDecimalPlaces: 4 }) @IsPositive() unitPrice: number;
  @IsString() @IsOptional() brand?: string;
  @IsString() @IsOptional() notes?: string;
}

export class CreateQuoteDto {
  @IsUUID() rfqId: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(28) gstPercent: number;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() deliveryCharges?: number;
  @IsDateString() validUntil: string;
  @IsNumber() @IsPositive() deliveryDays: number;
  @IsString() @IsOptional() notes?: string;
  @IsString() @IsOptional() termsConditions?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => QuoteItemDto)
  items: QuoteItemDto[];
}

export class UpdateQuoteDto extends PartialType(CreateQuoteDto) {}
