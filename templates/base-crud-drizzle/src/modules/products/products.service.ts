import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, isNull, and, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../database/database.module';
import { BaseService, IBaseRepository, PaginationQueryDto } from '../../common/base';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { products, Product } from './schema/products.schema';

/** Uniform entity alias used by the shared ProductsController */
export type ProductEntity = Product;

// ─────────────────────────────────────────────────────────────
// Drizzle Product Repository
// ─────────────────────────────────────────────────────────────
class DrizzleProductRepository
  implements IBaseRepository<Product, CreateProductDto, UpdateProductDto>
{
  constructor(private readonly db: NodePgDatabase) {}

  async create(dto: CreateProductDto): Promise<Product> {
    const [product] = await this.db
      .insert(products)
      .values({
        name: dto.name,
        description: dto.description,
        sku: dto.sku,
        price: String(dto.price),  // Drizzle numeric → string
        stock: dto.stock,
        category: dto.category,
        status: dto.status as Product['status'],
      })
      .returning();
    return product;
  }

  async findAll(
    pagination: PaginationQueryDto,
  ): Promise<{ data: Product[]; total: number }> {
    const { page = 1, limit = 10 } = pagination;
    const offset = (page - 1) * limit;

    const [data, [{ count }]] = await Promise.all([
      this.db
        .select()
        .from(products)
        .where(isNull(products.deletedAt))
        .orderBy(sql`${products.createdAt} DESC`)
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(products)
        .where(isNull(products.deletedAt)),
    ]);

    return { data, total: count };
  }

  async findOne(id: string): Promise<Product | null> {
    const [product] = await this.db
      .select()
      .from(products)
      .where(and(eq(products.id, id), isNull(products.deletedAt)));
    return product ?? null;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const updateData: Partial<typeof products.$inferInsert> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.sku !== undefined) updateData.sku = dto.sku;
    if (dto.price !== undefined) updateData.price = String(dto.price);
    if (dto.stock !== undefined) updateData.stock = dto.stock;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.status !== undefined) updateData.status = dto.status as Product['status'];
    updateData.updatedAt = new Date();

    const [updated] = await this.db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();
    return updated;
  }

  async remove(id: string): Promise<Product> {
    const [deleted] = await this.db
      .update(products)
      .set({ deletedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return deleted;
  }
}

// ─────────────────────────────────────────────────────────────
// Products Service (Drizzle)
// ─────────────────────────────────────────────────────────────
@Injectable()
export class ProductsService extends BaseService<
  Product,
  CreateProductDto,
  UpdateProductDto
> {
  private readonly repository: DrizzleProductRepository;

  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase) {
    super();
    this.repository = new DrizzleProductRepository(this.db);
  }

  protected getRepository(): IBaseRepository<Product, CreateProductDto, UpdateProductDto> {
    return this.repository;
  }

  /** Find by SKU */
  async findBySku(sku: string): Promise<Product> {
    const [product] = await this.db
      .select()
      .from(products)
      .where(and(eq(products.sku, sku), isNull(products.deletedAt)));

    if (!product) {
      throw new NotFoundException(`Product with SKU "${sku}" was not found`);
    }
    return product;
  }

  /** Adjust stock */
  async adjustStock(id: string, delta: number): Promise<Product> {
    await this.findOne(id);
    const [updated] = await this.db
      .update(products)
      .set({ stock: sql`${products.stock} + ${delta}` })
      .where(eq(products.id, id))
      .returning();
    return updated;
  }
}
