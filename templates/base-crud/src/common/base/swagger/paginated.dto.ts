import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { getSchemaPath } from '@nestjs/swagger';
import { Type as NestType } from '@nestjs/common';

// ─────────────────────────────────────────────────────────────
// Pagination Query DTO (Request)
// Validates & transforms query params: ?page=1&limit=10
// ─────────────────────────────────────────────────────────────
export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit must not exceed 100' })
  limit?: number = 10;
}

// ─────────────────────────────────────────────────────────────
// Pagination Meta DTO (Response)
// ─────────────────────────────────────────────────────────────
export class PaginationMetaDto {
  @ApiProperty({ description: 'Total number of records', example: 250 })
  total: number;

  @ApiProperty({ description: 'Current page number', example: 1 })
  page: number;

  @ApiProperty({ description: 'Number of items per page', example: 10 })
  limit: number;

  @ApiProperty({ description: 'Total number of pages', example: 25 })
  totalPages: number;

  @ApiProperty({ description: 'Whether a next page exists', example: true })
  hasNext: boolean;

  @ApiProperty({ description: 'Whether a previous page exists', example: false })
  hasPrevious: boolean;
}

// ─────────────────────────────────────────────────────────────
// Generic Paginated Response DTO Wrapper
// ─────────────────────────────────────────────────────────────
export class PaginatedResponseDto<T = unknown> {
  @ApiPropertyOptional({ description: 'Array of paginated items (type varies by endpoint)' })
  data: T[];

  @ApiProperty({ type: () => PaginationMetaDto })
  meta: PaginationMetaDto;

  @ApiProperty({ description: 'Request was successful', example: true })
  success: boolean;
}

// ─────────────────────────────────────────────────────────────
// Factory Helper for Swagger Schema Injection
// Usage: @ApiOkResponse({ schema: PaginatedResponseSchema(ProductDto) })
// ─────────────────────────────────────────────────────────────

/**
 * Generates an inline Swagger schema for PaginatedResponseDto<T>.
 * Attach with @ApiOkResponse({ schema: PaginatedResponseSchema(YourDto) }).
 *
 * @example
 * \@ApiOkResponse({ schema: PaginatedResponseSchema(ProductDto) })
 */
export function PaginatedResponseSchema<T>(dataType: NestType<T>) {
  return {
    allOf: [
      { $ref: getSchemaPath(PaginatedResponseDto) },
      {
        properties: {
          data: {
            type: 'array',
            items: { $ref: getSchemaPath(dataType) },
          },
        },
      },
    ],
  };
}
