import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  HttpStatus,
  Type,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExtraModels,
  ApiParam,
} from '@nestjs/swagger';
import { BaseController } from '../../common/base/base.controller';
import {
  ApiResponseDto,
  ApiResponseSchema,
  PaginatedResponseDto,
  PaginatedResponseSchema,
  PaginationQueryDto,
} from '../../common/base';
import { ProductsService, ProductEntity } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductDto } from './dto/product.dto';

@ApiTags('Products')
@ApiBearerAuth('bearer')
@ApiExtraModels(ApiResponseDto, PaginatedResponseDto, ProductDto)
@Controller('products')
export class ProductsController extends BaseController<
  ProductEntity,
  CreateProductDto,
  UpdateProductDto
> {
  constructor(private readonly productsService: ProductsService) {
    super(productsService);
  }

  protected getDtoClass(): Type<ProductEntity> {
    return ProductDto as unknown as Type<ProductEntity>;
  }

  @Get()
  @ApiOperation({ summary: 'Get all products (paginated)' })
  @ApiResponse({ status: HttpStatus.OK, schema: PaginatedResponseSchema(ProductDto) })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  override async findAll(@Query() pagination: PaginationQueryDto): Promise<PaginatedResponseDto<ProductEntity>> {
    return super.findAll(pagination);
  }

  @Get('by-sku/:sku')
  @ApiOperation({ summary: 'Get a product by SKU' })
  @ApiParam({ name: 'sku', example: 'KB-WL-MEC-001' })
  @ApiResponse({ status: HttpStatus.OK, schema: ApiResponseSchema(ProductDto) })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Product not found' })
  async findBySku(@Param('sku') sku: string): Promise<ApiResponseDto<ProductEntity>> {
    const data = await this.productsService.findBySku(sku);
    return { success: true, data, meta: { correlationId: '', timestamp: new Date().toISOString() } };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiParam({ name: 'id', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: HttpStatus.OK, schema: ApiResponseSchema(ProductDto) })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Product not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid UUID' })
  override async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4', errorHttpStatusCode: HttpStatus.BAD_REQUEST }))
    id: string,
  ): Promise<ApiResponseDto<ProductEntity>> {
    return super.findOne(id);
  }
}
