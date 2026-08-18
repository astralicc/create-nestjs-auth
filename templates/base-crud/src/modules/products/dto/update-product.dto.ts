import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

/**
 * Update Product DTO
 *
 * Uses PartialType from @nestjs/swagger (NOT @nestjs/mapped-types) to:
 *   1. Make all fields optional (PATCH semantics)
 *   2. Preserve @ApiProperty decorators for Swagger schema rendering
 *   3. Keep all class-validator rules active on provided fields
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {}
