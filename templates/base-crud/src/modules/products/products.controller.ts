import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  HttpStatus,
  UseGuards,
  Type,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExtraModels,
  ApiParam,
  getSchemaPath,
} from '@nestjs/swagger';
import { BaseController } from '../../common/base/base.controller';
import {
  ApiResponseDto,
  ApiResponseSchema,
  PaginatedResponseDto,
  PaginatedResponseSchema,
  PaginationQueryDto,
} from '../../common/base';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductDto } from './dto/product.dto';
import { Product } from '@prisma/client';

// ─────────────────────────────────────────────────────────────
// Products Controller
//
// Extends BaseController which already provides:
//   POST   /products          → create()
//   GET    /products          → findAll()
//   GET    /products/:id      → findOne()
//   PUT    /products/:id      → update()
//   DELETE /products/:id      → remove()
//
// All routes are:
//   - Protected by JWT Bearer auth (@ApiBearerAuth)
//   - Documented with @ApiOperation + @ApiResponse for Swagger
//   - URL param :id validated with @ParseUUIDPipe (injection prevention)
//   - Request body validated with global ValidationPipe (whitelist: true)
//
// @ApiExtraModels registers the DTOs so Swagger can build
// proper $ref schemas for the generic ApiResponseDto<ProductDto>
// and PaginatedResponseDto<ProductDto> wrappers.
// ─────────────────────────────────────────────────────────────
@ApiTags('Products')
@ApiBearerAuth('bearer')
@ApiExtraModels(ApiResponseDto, PaginatedResponseDto, ProductDto)
@Controller('products')
export class ProductsController extends BaseController<
  Product,
  CreateProductDto,
  UpdateProductDto
> {
  constructor(private readonly productsService: ProductsService) {
    super(productsService);
  }

  /**
   * Tell BaseController which DTO class represents this resource.
   * Used for Swagger schema generation.
   */
  protected getDtoClass(): Type<Product> {
    return ProductDto as unknown as Type<Product>;
  }

  // ─────────────────────────────────────────────────────────
  // Override inherited routes to attach proper Swagger schemas
  // ─────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'Get all products (paginated)',
    description: 'Returns a paginated list of active (non-deleted) products ordered by creation date.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of products',
    schema: PaginatedResponseSchema(ProductDto),
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  override async findAll(@Query() pagination: PaginationQueryDto): Promise<PaginatedResponseDto<Product>> {
    return super.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a product by ID',
    description: 'Retrieves a single product by its UUID. Soft-deleted products are excluded.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID v4', example: '123e4567-e89b-12d3-a456-426614174000', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product found',
    schema: ApiResponseSchema(ProductDto),
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Product not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid UUID format' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  override async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4', errorHttpStatusCode: HttpStatus.BAD_REQUEST }))
    id: string,
  ): Promise<ApiResponseDto<Product>> {
    return super.findOne(id);
  }

  // ─────────────────────────────────────────────────────────
  // Domain-specific endpoints (beyond base CRUD)
  // ─────────────────────────────────────────────────────────

  /**
   * Find a product by SKU (unique business identifier)
   * GET /products/by-sku/:sku
   */
  @Get('by-sku/:sku')
  @ApiOperation({
    summary: 'Get a product by SKU',
    description: 'Finds a single active product using its unique Stock Keeping Unit (SKU) identifier.',
  })
  @ApiParam({
    name: 'sku',
    description: 'Product SKU — uppercase letters, numbers, and hyphens only',
    example: 'KB-WL-MEC-001',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product found by SKU',
    schema: ApiResponseSchema(ProductDto),
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Product with given SKU not found' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async findBySku(@Param('sku') sku: string): Promise<ApiResponseDto<Product>> {
    const data = await this.productsService.findBySku(sku);
    return {
      success: true,
      data,
      meta: {
        correlationId: '',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
