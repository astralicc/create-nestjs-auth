import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService, IBaseRepository, PaginationQueryDto } from '../../common/base';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

// ─────────────────────────────────────────────────────────────
// Product Entity Interface
//
// TODO: Once you add the Product model to prisma/schema.prisma
//       and run `npx prisma migrate dev`, replace this interface
//       with the generated Prisma type:
//         import { Product } from '@prisma/client';
//         export type ProductEntity = Product;
//
// Prisma schema to add:
//   model Product {
//     id          String    @id @default(uuid())
//     name        String
//     description String?
//     sku         String    @unique
//     price       Float
//     stock       Int       @default(0)
//     category    String?
//     status      String    @default("ACTIVE")
//     createdAt   DateTime  @default(now())
//     updatedAt   DateTime  @updatedAt
//     deletedAt   DateTime?
//   }
// ─────────────────────────────────────────────────────────────
export interface ProductEntity {
  id: string;
  name: string;
  description?: string | null;
  sku: string;
  price: number;
  stock: number;
  category?: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

class PrismaProductRepository
  implements IBaseRepository<ProductEntity, CreateProductDto, UpdateProductDto>
{
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto): Promise<ProductEntity> {
    return this.prisma.product.create({ data: dto }) as Promise<ProductEntity>;
  }

  async findAll(p: PaginationQueryDto): Promise<{ data: ProductEntity[]; total: number }> {
    const { page = 1, limit = 10 } = p;
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where: { deletedAt: null }, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.product.count({ where: { deletedAt: null } }),
    ]);
    return { data: data as ProductEntity[], total };
  }

  async findOne(id: string): Promise<ProductEntity | null> {
    return this.prisma.product.findFirst({ where: { id, deletedAt: null } }) as Promise<ProductEntity | null>;
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductEntity> {
    return this.prisma.product.update({ where: { id }, data: dto }) as Promise<ProductEntity>;
  }

  async remove(id: string): Promise<ProductEntity> {
    return this.prisma.product.update({ where: { id }, data: { deletedAt: new Date() } }) as Promise<ProductEntity>;
  }
}

@Injectable()
export class ProductsService extends BaseService<ProductEntity, CreateProductDto, UpdateProductDto> {
  private readonly repository: PrismaProductRepository;

  constructor(private readonly prisma: PrismaService) {
    super();
    this.repository = new PrismaProductRepository(this.prisma);
  }

  protected getRepository(): IBaseRepository<ProductEntity, CreateProductDto, UpdateProductDto> {
    return this.repository;
  }

  async findBySku(sku: string): Promise<ProductEntity> {
    const p = await this.prisma.product.findFirst({ where: { sku, deletedAt: null } });
    if (!p) throw new NotFoundException(`Product with SKU "${sku}" was not found`);
    return p as ProductEntity;
  }

  async adjustStock(id: string, delta: number): Promise<ProductEntity> {
    await this.findOne(id);
    return this.prisma.product.update({ where: { id }, data: { stock: { increment: delta } } }) as Promise<ProductEntity>;
  }
}
