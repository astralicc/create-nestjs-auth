import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from './create-product.dto';

/** Product response DTO — shape returned from the API, used by Swagger @ApiExtraModels */
export class ProductDto {
  @ApiProperty({ description: 'Product UUID v4', example: '123e4567-e89b-12d3-a456-426614174000', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Wireless Mechanical Keyboard' })
  name: string;

  @ApiPropertyOptional({ example: 'Compact TKL layout with RGB' })
  description?: string;

  @ApiProperty({ example: 'KB-WL-MEC-001' })
  sku: string;

  @ApiProperty({ description: 'Price in cents', example: 149999 })
  price: number;

  @ApiProperty({ example: 250 })
  stock: number;

  @ApiPropertyOptional({ example: 'Peripherals' })
  category?: string;

  @ApiProperty({ enum: ProductStatus, example: ProductStatus.ACTIVE })
  status: ProductStatus;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-15T08:30:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ nullable: true, example: null })
  deletedAt?: Date | null;
}
