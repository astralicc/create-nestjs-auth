import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from './create-product.dto';

/**
 * Product Response DTO
 * Represents the shape of a Product as returned from the API.
 * Used by Swagger @ApiExtraModels to generate proper schemas.
 */
export class ProductDto {
  @ApiProperty({
    description: 'Product unique identifier (UUID v4)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({ description: 'Product name', example: 'Wireless Mechanical Keyboard' })
  name: string;

  @ApiPropertyOptional({ description: 'Product description', example: 'Compact TKL layout...' })
  description?: string;

  @ApiProperty({ description: 'Product SKU', example: 'KB-WL-MEC-001' })
  sku: string;

  @ApiProperty({ description: 'Price in smallest currency unit (cents)', example: 149999 })
  price: number;

  @ApiProperty({ description: 'Available stock', example: 250 })
  stock: number;

  @ApiPropertyOptional({ description: 'Product category', example: 'Peripherals' })
  category?: string;

  @ApiProperty({ enum: ProductStatus, example: ProductStatus.ACTIVE })
  status: ProductStatus;

  @ApiProperty({ description: 'Creation timestamp', example: '2025-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp', example: '2025-01-15T08:30:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Soft-delete timestamp — null means record is active',
    nullable: true,
    example: null,
  })
  deletedAt?: Date | null;
}
