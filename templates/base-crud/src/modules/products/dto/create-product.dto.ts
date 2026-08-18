import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
  Min,
  IsInt,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─────────────────────────────────────────────────────────────
// Product Status Enum
// ─────────────────────────────────────────────────────────────
export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  DISCONTINUED = 'DISCONTINUED',
}

// ─────────────────────────────────────────────────────────────
// Create Product DTO
//
// Security notes:
//   - @IsString prevents type coercion injection attacks
//   - @IsNotEmpty prevents empty string bypass
//   - @MinLength / @MaxLength prevent buffer overflow-style attacks
//   - @IsPositive prevents negative price/stock manipulation
//   - ValidationPipe(whitelist: true) strips all non-decorated properties
// ─────────────────────────────────────────────────────────────
export class CreateProductDto {
  @ApiProperty({
    description: 'Product name — must be unique within a category',
    example: 'Wireless Mechanical Keyboard',
    minLength: 3,
    maxLength: 150,
  })
  @IsString({ message: 'name must be a string' })
  @IsNotEmpty({ message: 'name is required' })
  @MinLength(3, { message: 'name must be at least 3 characters' })
  @MaxLength(150, { message: 'name must not exceed 150 characters' })
  name: string;

  @ApiPropertyOptional({
    description: 'Detailed product description',
    example: 'Compact TKL layout with RGB backlighting and hot-swappable switches',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'description must be a string' })
  @MaxLength(1000, { message: 'description must not exceed 1000 characters' })
  description?: string;

  @ApiProperty({
    description: 'Product SKU — alphanumeric with hyphens, unique identifier',
    example: 'KB-WL-MEC-001',
    pattern: '^[A-Z0-9-]+$',
  })
  @IsString({ message: 'sku must be a string' })
  @IsNotEmpty({ message: 'sku is required' })
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'sku must contain only uppercase letters, numbers, and hyphens',
  })
  sku: string;

  @ApiProperty({
    description: 'Product price in the smallest currency unit (e.g., cents)',
    example: 149999,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'price must be a number' })
  @IsPositive({ message: 'price must be a positive number' })
  price: number;

  @ApiProperty({
    description: 'Available stock quantity',
    example: 250,
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt({ message: 'stock must be an integer' })
  @Min(0, { message: 'stock cannot be negative' })
  stock: number;

  @ApiPropertyOptional({
    description: 'Product category name',
    example: 'Peripherals',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'category must be a string' })
  @MaxLength(100, { message: 'category must not exceed 100 characters' })
  category?: string;

  @ApiPropertyOptional({
    description: 'Product status',
    enum: ProductStatus,
    default: ProductStatus.ACTIVE,
    example: ProductStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ProductStatus, {
    message: `status must be one of: ${Object.values(ProductStatus).join(', ')}`,
  })
  status?: ProductStatus = ProductStatus.ACTIVE;
}
