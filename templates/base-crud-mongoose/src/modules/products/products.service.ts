import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseService, IBaseRepository, PaginationQueryDto } from '../../common/base';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductDocument, ProductStatus } from './schemas/product.schema';

/** Lean plain-object type returned from Mongoose .lean() queries */
export type LeanProduct = {
  id: string;
  name: string;
  description?: string;
  sku: string;
  price: number;
  stock: number;
  category?: string;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
};

/** Uniform entity alias used by the shared ProductsController */
export type ProductEntity = LeanProduct;

// ─────────────────────────────────────────────────────────────
// Mongoose Product Repository
// ─────────────────────────────────────────────────────────────
class MongooseProductRepository
  implements IBaseRepository<LeanProduct, CreateProductDto, UpdateProductDto>
{
  constructor(private readonly model: Model<ProductDocument>) {}

  async create(dto: CreateProductDto): Promise<LeanProduct> {
    const created = await this.model.create(dto);
    return created.toJSON() as LeanProduct;
  }

  async findAll(
    pagination: PaginationQueryDto,
  ): Promise<{ data: LeanProduct[]; total: number }> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;
    const filter = { deletedAt: null };

    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<LeanProduct[]>({ virtuals: true }),
      this.model.countDocuments(filter),
    ]);

    return { data, total };
  }

  async findOne(id: string): Promise<LeanProduct | null> {
    return this.model
      .findOne({ _id: id, deletedAt: null })
      .lean<LeanProduct>({ virtuals: true });
  }

  async update(id: string, dto: UpdateProductDto): Promise<LeanProduct> {
    return this.model
      .findByIdAndUpdate(
        id,
        { $set: dto },
        { new: true, runValidators: true },
      )
      .lean<LeanProduct>({ virtuals: true }) as Promise<LeanProduct>;
  }

  async remove(id: string): Promise<LeanProduct> {
    return this.model
      .findByIdAndUpdate(
        id,
        { $set: { deletedAt: new Date() } },
        { new: true },
      )
      .lean<LeanProduct>({ virtuals: true }) as Promise<LeanProduct>;
  }
}

// ─────────────────────────────────────────────────────────────
// Products Service (Mongoose)
// ─────────────────────────────────────────────────────────────
@Injectable()
export class ProductsService extends BaseService<
  LeanProduct,
  CreateProductDto,
  UpdateProductDto
> {
  private readonly repository: MongooseProductRepository;

  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {
    super();
    this.repository = new MongooseProductRepository(this.productModel);
  }

  protected getRepository(): IBaseRepository<LeanProduct, CreateProductDto, UpdateProductDto> {
    return this.repository;
  }

  /** Find by SKU */
  async findBySku(sku: string): Promise<LeanProduct> {
    const product = await this.productModel
      .findOne({ sku, deletedAt: null })
      .lean<LeanProduct>({ virtuals: true });

    if (!product) {
      throw new NotFoundException(`Product with SKU "${sku}" was not found`);
    }
    return product;
  }

  /** Adjust stock */
  async adjustStock(id: string, delta: number): Promise<LeanProduct> {
    await this.findOne(id);
    return this.productModel
      .findByIdAndUpdate(
        id,
        { $inc: { stock: delta } },
        { new: true },
      )
      .lean<LeanProduct>({ virtuals: true }) as Promise<LeanProduct>;
  }
}
