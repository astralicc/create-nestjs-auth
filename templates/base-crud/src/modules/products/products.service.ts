import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BaseService, IBaseRepository } from '../../common/base';
import { PaginationQueryDto } from '../../common/base';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from '@prisma/client';

// ─────────────────────────────────────────────────────────────
// Prisma Product Repository
//
// Implements IBaseRepository<Product, CreateProductDto, UpdateProductDto>.
// This is the DATA ACCESS LAYER — it only talks to Prisma.
// All business logic lives in ProductsService.
//
// Why a separate class?
//   - Separates concerns: BaseService orchestrates, repository persists
//   - Easily swappable (TypeORM, Drizzle, Mongoose)
//   - Enables unit testing with mock repositories
// ─────────────────────────────────────────────────────────────
class PrismaProductRepository
  implements IBaseRepository<Product, CreateProductDto, UpdateProductDto>
{
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto): Promise<Product> {
    return this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        sku: dto.sku,
        price: dto.price,
        stock: dto.stock,
        category: dto.category,
        status: dto.status,
      },
    });
  }

  async findAll(
    pagination: PaginationQueryDto,
  ): Promise<{ data: Product[]; total: number }> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    // Parameterized queries via Prisma — no raw SQL injection risk
    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where: { deletedAt: null }, // Exclude soft-deleted records
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({
        where: { deletedAt: null },
      }),
    ]);

    return { data, total };
  }

  async findOne(id: string): Promise<Product | null> {
    return this.prisma.product.findFirst({
      where: { id, deletedAt: null }, // Exclude soft-deleted
    });
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    return this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.sku !== undefined && { sku: dto.sku }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.stock !== undefined && { stock: dto.stock }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });
  }

  async remove(id: string): Promise<Product> {
    // Soft-delete: set deletedAt timestamp, do NOT physically delete
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

// ─────────────────────────────────────────────────────────────
// Products Service
//
// Extends BaseService<Product, CreateProductDto, UpdateProductDto>.
// Inherits all CRUD methods: create, findAll, findOne, update, remove.
// Provides the Prisma-backed repository via getRepository().
//
// Add domain-specific methods here (e.g. findBySku, updateStock).
// ─────────────────────────────────────────────────────────────
@Injectable()
export class ProductsService extends BaseService<
  Product,
  CreateProductDto,
  UpdateProductDto
> {
  private readonly repository: PrismaProductRepository;

  constructor(private readonly prisma: PrismaService) {
    super();
    this.repository = new PrismaProductRepository(this.prisma);
  }

  /**
   * Provides the Prisma-backed repository to BaseService.
   * BaseService calls this internally for all CRUD operations.
   */
  protected getRepository(): IBaseRepository<Product, CreateProductDto, UpdateProductDto> {
    return this.repository;
  }

  // ─────────────────────────────────────────────────────────
  // Domain-specific methods (add your own below)
  // ─────────────────────────────────────────────────────────

  /**
   * Find a product by its SKU (unique business identifier)
   * @throws NotFoundException if no product with the given SKU exists
   */
  async findBySku(sku: string): Promise<Product> {
    const product = await this.prisma.product.findFirst({
      where: { sku, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundException(`Product with SKU "${sku}" was not found`);
    }

    return product;
  }

  /**
   * Adjust product stock (add or subtract quantity)
   * @param id - Product UUID
   * @param delta - Amount to add (positive) or subtract (negative)
   * @throws NotFoundException if product not found
   */
  async adjustStock(id: string, delta: number): Promise<Product> {
    await this.findOne(id); // Validates existence

    return this.prisma.product.update({
      where: { id },
      data: { stock: { increment: delta } },
    });
  }
}
