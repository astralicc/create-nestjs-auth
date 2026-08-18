import {
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards,
  Type,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiExtraModels,
} from '@nestjs/swagger';
import { BaseService } from './base.service';
import {
  ApiResponseDto,
  ApiResponseSchema,
  ApiResponseArraySchema,
} from './swagger/api-response.dto';
import {
  PaginationQueryDto,
  PaginatedResponseDto,
  PaginatedResponseSchema,
} from './swagger/paginated.dto';

// ─────────────────────────────────────────────────────────────
// Abstract Base Controller
//
// Generic parameters:
//   T         — Entity / Document type (e.g. Product)
//   CreateDto — DTO for POST /  (e.g. CreateProductDto)
//   UpdateDto — DTO for PUT /:id  (e.g. UpdateProductDto)
//
// How to extend:
//
// @ApiTags('products')
// @ApiBearerAuth('bearer')
// @ApiExtraModels(ApiResponseDto, PaginatedResponseDto, ProductDto)
// @Controller('products')
// export class ProductsController extends BaseController<Product, CreateProductDto, UpdateProductDto> {
//   constructor(private readonly productsService: ProductsService) {
//     super(productsService);
//   }
//   protected getDtoClass() { return ProductDto; }
//   protected getCreateDtoClass() { return CreateProductDto; }
// }
// ─────────────────────────────────────────────────────────────
export abstract class BaseController<T, CreateDto, UpdateDto> {
  constructor(protected readonly service: BaseService<T, CreateDto, UpdateDto>) {}

  /**
   * Returns the DTO class used as the Swagger response model.
   * Must be implemented by each concrete controller.
   */
  protected abstract getDtoClass(): Type<T>;

  // ─────────────────────────────────────────────────────────
  // POST / — Create Resource
  // ─────────────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Create a new resource',
    description:
      'Creates a new resource entry. The request body is strictly validated via `class-validator`. ' +
      'Extra or unknown properties are rejected (whitelist enforcement).',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Resource created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error — invalid or missing fields in request body',
    schema: {
      example: {
        success: false,
        message: 'Validation failed (name should not be empty)',
        meta: { timestamp: '2025-01-01T00:00:00.000Z' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized — valid Bearer JWT required',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Conflict — resource with given unique field already exists',
  })
  async create(@Body() createDto: CreateDto): Promise<ApiResponseDto<T>> {
    const data = await this.service.create(createDto);
    return {
      success: true,
      data,
      meta: {
        correlationId: '',
        timestamp: new Date().toISOString(),
        message: 'Resource created successfully',
      },
    };
  }

  // ─────────────────────────────────────────────────────────
  // GET / — Find All (Paginated)
  // ─────────────────────────────────────────────────────────
  @Get()
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Retrieve all resources (paginated)',
    description:
      'Returns a paginated list of resources. ' +
      'Use `page` and `limit` query parameters for pagination control. ' +
      'Max `limit` is capped at 100 per page.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: 'Items per page (default: 10, max: 100)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of resources',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid pagination parameters',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized — valid Bearer JWT required',
  })
  async findAll(@Query() pagination: PaginationQueryDto): Promise<PaginatedResponseDto<T>> {
    return this.service.findAll(pagination);
  }

  // ─────────────────────────────────────────────────────────
  // GET /:id — Find One
  // ─────────────────────────────────────────────────────────
  @Get(':id')
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Retrieve a single resource by ID',
    description:
      'Fetches a single resource by its UUID. ' +
      'Returns 404 if the resource does not exist.',
  })
  @ApiParam({
    name: 'id',
    description: 'Resource UUID (v4)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resource found and returned',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Resource not found — no record with the given ID exists',
    schema: {
      example: {
        success: false,
        message: 'Resource with id "123e4567-..." was not found',
        meta: { timestamp: '2025-01-01T00:00:00.000Z' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request — the provided ID is not a valid UUID v4',
    schema: {
      example: {
        success: false,
        message: 'Validation failed (uuid is expected)',
        meta: { timestamp: '2025-01-01T00:00:00.000Z' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized — valid Bearer JWT required',
  })
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4', errorHttpStatusCode: HttpStatus.BAD_REQUEST }))
    id: string,
  ): Promise<ApiResponseDto<T>> {
    const data = await this.service.findOne(id);
    return {
      success: true,
      data,
      meta: {
        correlationId: '',
        timestamp: new Date().toISOString(),
      },
    };
  }

  // ─────────────────────────────────────────────────────────
  // PUT /:id — Full Update
  // ─────────────────────────────────────────────────────────
  @Put(':id')
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Update a resource (full or partial)',
    description:
      'Updates an existing resource by its UUID. ' +
      'All provided fields are validated. Unknown fields are rejected. ' +
      'Returns 404 if the resource does not exist.',
  })
  @ApiParam({
    name: 'id',
    description: 'Resource UUID (v4)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resource updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Resource not found',
    schema: {
      example: {
        success: false,
        message: 'Resource with id "..." was not found',
        meta: { timestamp: '2025-01-01T00:00:00.000Z' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request — invalid UUID or validation error in request body',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized — valid Bearer JWT required',
  })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4', errorHttpStatusCode: HttpStatus.BAD_REQUEST }))
    id: string,
    @Body() updateDto: UpdateDto,
  ): Promise<ApiResponseDto<T>> {
    const data = await this.service.update(id, updateDto);
    return {
      success: true,
      data,
      meta: {
        correlationId: '',
        timestamp: new Date().toISOString(),
        message: 'Resource updated successfully',
      },
    };
  }

  // ─────────────────────────────────────────────────────────
  // DELETE /:id — Soft Delete
  // ─────────────────────────────────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Soft-delete a resource',
    description:
      'Marks a resource as deleted by setting its `deletedAt` timestamp. ' +
      'The record is NOT permanently removed from the database. ' +
      'Returns 404 if the resource does not exist.',
  })
  @ApiParam({
    name: 'id',
    description: 'Resource UUID (v4)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resource soft-deleted successfully',
    schema: {
      example: {
        success: true,
        data: { id: '123e4567-...', deletedAt: '2025-01-01T00:00:00.000Z' },
        meta: { timestamp: '2025-01-01T00:00:00.000Z', message: 'Resource deleted successfully' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Resource not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request — invalid UUID format',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized — valid Bearer JWT required',
  })
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4', errorHttpStatusCode: HttpStatus.BAD_REQUEST }))
    id: string,
  ): Promise<ApiResponseDto<T>> {
    const data = await this.service.remove(id);
    return {
      success: true,
      data,
      meta: {
        correlationId: '',
        timestamp: new Date().toISOString(),
        message: 'Resource deleted successfully',
      },
    };
  }
}
