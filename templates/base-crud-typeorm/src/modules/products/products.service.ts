import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { BaseService, IBaseRepository, PaginationQueryDto } from '../../common/base';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

/** Uniform entity alias used by the shared ProductsController */
export type ProductEntity = Product;

// ─────────────────────────────────────────────────────────────
// TypeORM Product Repository
//
// Implements IBaseRepository using TypeORM's Repository<Product>.
// Soft-delete via deletedAt column (TypeORM also supports @DeleteDateColumn).
// ─────────────────────────────────────────────────────────────
class TypeOrmProductRepository
  implements IBaseRepository<Product, CreateProductDto, UpdateProductDto>
{
  constructor(private readonly repo: Repository<Product>) {}

  async create(dto: CreateProductDto): Promise<Product> {
    const product = this.repo.create(dto);
    return this.repo.save(product);
  }

  async findAll(
    pagination: PaginationQueryDto,
  ): Promise<{ data: Product[]; total: number }> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await this.repo.findAndCount({
      where: { deletedAt: IsNull() },
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total };
  }

  async findOne(id: string): Promise<Product | null> {
    return this.repo.findOne({
      where: { id, deletedAt: IsNull() },
    });
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    await this.repo.update(id, dto as Partial<Product>);
    return this.repo.findOneOrFail({ where: { id } });
  }

  async remove(id: string): Promise<Product> {
    const product = await this.repo.findOneOrFail({ where: { id } });
    product.deletedAt = new Date();
    return this.repo.save(product);
  }
}

// ─────────────────────────────────────────────────────────────
// Products Service (TypeORM)
// ─────────────────────────────────────────────────────────────
@Injectable()
export class ProductsService extends BaseService<
  Product,
  CreateProductDto,
  UpdateProductDto
> {
  private readonly repository: TypeOrmProductRepository;

  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {
    super();
    this.repository = new TypeOrmProductRepository(this.productRepo);
  }

  protected getRepository(): IBaseRepository<Product, CreateProductDto, UpdateProductDto> {
    return this.repository;
  }

  /** Find by SKU — domain-specific method */
  async findBySku(sku: string): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { sku, deletedAt: IsNull() },
    });
    if (!product) {
      throw new NotFoundException(`Product with SKU "${sku}" was not found`);
    }
    return product;
  }

  /** Adjust stock delta */
  async adjustStock(id: string, delta: number): Promise<Product> {
    await this.findOne(id);
    await this.productRepo.increment({ id }, 'stock', delta);
    return this.productRepo.findOneOrFail({ where: { id } });
  }
}
