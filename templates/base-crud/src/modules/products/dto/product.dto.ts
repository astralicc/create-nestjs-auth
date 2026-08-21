import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Wireless Mouse' })
  name: string;

  @ApiPropertyOptional({ example: 'Ergonomic wireless mouse' })
  description?: string;

  @ApiProperty({ example: 'PROD-001' })
  sku: string;

  @ApiProperty({ example: 29.99 })
  price: number;

  @ApiProperty({ example: 100 })
  stock: number;

  @ApiPropertyOptional({ example: 'Electronics' })
  category?: string;

  @ApiProperty({ example: 'ACTIVE' })
  status: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ nullable: true, example: null })
  deletedAt?: Date | null;
}
