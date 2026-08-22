/**
 * Base CRUD Architecture
 * Barrel export for src/common/base
 *
 * @example
 * import { BaseService, BaseController, PaginationQueryDto } from '../common/base';
 */

export { BaseService } from './base.service';
export type { IBaseRepository } from './base.service';
export { BaseController } from './base.controller';

// Swagger DTOs
export { ApiResponseDto, ApiMetaDto, ApiResponseSchema, ApiResponseArraySchema } from './swagger/api-response.dto';
export {
  PaginationQueryDto,
  PaginationMetaDto,
  PaginatedResponseDto,
  PaginatedResponseSchema,
} from './swagger/paginated.dto';

