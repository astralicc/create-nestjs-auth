import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsNumber, IsPositive, IsOptional,
  IsEnum, MinLength, MaxLength, Min, IsInt, Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  DISCONTINUED = 'DISCONTINUED',
}

export class CreateProductDto {
  @ApiProperty({ description: 'Product name', example: 'Wireless Mechanical Keyboard', minLength: 3, maxLength: 150 })
  @IsString() @IsNotEmpty() @MinLength(3) @MaxLength(150)
  name: string;

  @ApiPropertyOptional({ description: 'Product description', example: 'Compact TKL layout with RGB', maxLength: 1000 })
  @IsOptional() @IsString() @MaxLength(1000)
  description?: string;

  @ApiProperty({ description: 'Unique SKU (uppercase, numbers, hyphens)', example: 'KB-WL-MEC-001', pattern: '^[A-Z0-9-]+$' })
  @IsString() @IsNotEmpty()
  @Matches(/^[A-Z0-9-]+$/, { message: 'sku must contain only uppercase letters, numbers, and hyphens' })
  sku: string;

  @ApiProperty({ description: 'Price in smallest currency unit (cents)', example: 149999, minimum: 0 })
  @Type(() => Number) @IsNumber() @IsPositive()
  price: number;

  @ApiProperty({ description: 'Available stock quantity', example: 250, minimum: 0 })
  @Type(() => Number) @IsInt() @Min(0)
  stock: number;

  @ApiPropertyOptional({ description: 'Product category', example: 'Peripherals', maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ enum: ProductStatus, default: ProductStatus.ACTIVE, example: ProductStatus.ACTIVE })
  @IsOptional() @IsEnum(ProductStatus)
  status?: ProductStatus = ProductStatus.ACTIVE;
}
