import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─────────────────────────────────────────────────────────────
// Meta Information DTO
// ─────────────────────────────────────────────────────────────
export class ApiMetaDto {
  @ApiProperty({ description: 'Request correlation ID', example: 'abc-123' })
  correlationId: string;

  @ApiProperty({ description: 'Response timestamp (ISO 8601)', example: '2025-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiPropertyOptional({ description: 'Optional message about the operation', example: 'Product created successfully' })
  message?: string;
}

// ─────────────────────────────────────────────────────────────
// Generic API Response DTO Wrapper
// Used with @ApiExtraModels + $ref for proper Swagger generic rendering
// ─────────────────────────────────────────────────────────────
export class ApiResponseDto<T = unknown> {
  @ApiProperty({ description: 'Indicates if the request was successful', example: true })
  success: boolean;

  @ApiPropertyOptional({ description: 'Response payload (varies by endpoint)' })
  data?: T;

  @ApiPropertyOptional({ description: 'Error message (only present on failure)', example: 'Resource not found' })
  message?: string;

  @ApiProperty({ type: () => ApiMetaDto })
  meta: ApiMetaDto;
}

// ─────────────────────────────────────────────────────────────
// Factory Helper for Swagger Schema Injection
// Usage: @ApiOkResponse(ApiResponseSchema(ProductDto))
// ─────────────────────────────────────────────────────────────
import { getSchemaPath } from '@nestjs/swagger';
import { Type } from '@nestjs/common';

/**
 * Generates an inline Swagger schema for ApiResponseDto<T>.
 * Use this with @ApiOkResponse({ schema: ApiResponseSchema(YourDto) }).
 *
 * @example
 * \@ApiOkResponse({ schema: ApiResponseSchema(ProductDto) })
 */
export function ApiResponseSchema<T>(dataType: Type<T>) {
  return {
    allOf: [
      { $ref: getSchemaPath(ApiResponseDto) },
      {
        properties: {
          data: { $ref: getSchemaPath(dataType) },
        },
      },
    ],
  };
}

/**
 * Generates an inline Swagger schema for ApiResponseDto<T[]> (array response).
 *
 * @example
 * \@ApiOkResponse({ schema: ApiResponseArraySchema(ProductDto) })
 */
export function ApiResponseArraySchema<T>(dataType: Type<T>) {
  return {
    allOf: [
      { $ref: getSchemaPath(ApiResponseDto) },
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
