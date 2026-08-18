import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

/**
 * Update Product DTO
 *
 * Extends CreateProductDto using PartialType from @nestjs/swagger (NOT @nestjs/mapped-types).
 *
 * Using @nestjs/swagger's PartialType instead of @nestjs/mapped-types ensures:
 *   1. All fields become optional (PATCH semantics)
 *   2. All @ApiProperty decorators are preserved for Swagger documentation
 *   3. All class-validator decorators remain active (validation still applies to provided fields)
 *   4. The Swagger UI shows this as a schema extending CreateProductDto with all optional fields
 *
 * Security note: Even though fields are optional, provided values are still
 * fully validated by class-validator. An empty object `{}` is valid (no-op update).
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {}
