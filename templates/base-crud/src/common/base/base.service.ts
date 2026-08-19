import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Type,
} from '@nestjs/common';
import { PaginationQueryDto, PaginatedResponseDto } from './swagger/paginated.dto';

// ─────────────────────────────────────────────────────────────
// Repository Contract Interface
// Implement this interface in your concrete repository/service
// to fulfill the abstract contract required by BaseService.
// ─────────────────────────────────────────────────────────────
export interface IBaseRepository<T, CreateDto, UpdateDto> {
  create(dto: CreateDto): Promise<T>;
  findAll(pagination: PaginationQueryDto): Promise<{ data: T[]; total: number }>;
  findOne(id: string | number): Promise<T | null>;
  update(id: string | number, dto: UpdateDto): Promise<T>;
  remove(id: string | number): Promise<T>;
}

// ─────────────────────────────────────────────────────────────
// Abstract Base Service
//
// Generic parameters:
//   T         — Entity / Document type (e.g. Product, User)
//   CreateDto — DTO for creation (e.g. CreateProductDto)
//   UpdateDto — DTO for updates (e.g. UpdateProductDto)
//
// How to extend:
// @Injectable()
// export class ProductsService extends BaseService<Product, CreateProductDto, UpdateProductDto> {
//   constructor(private readonly prisma: PrismaService) { super(); }
//   protected getRepository(): IBaseRepository<...> { return new ProductRepository(this.prisma); }
// }
// ─────────────────────────────────────────────────────────────
@Injectable()
export abstract class BaseService<T, CreateDto, UpdateDto> {
  protected readonly logger: Logger;

  constructor() {
    // Logger uses the concrete class name for traceability
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Subclasses MUST implement this to provide the data-access repository.
   * This decouples the base service from any specific ORM/database driver.
   */
  protected abstract getRepository(): IBaseRepository<T, CreateDto, UpdateDto>;

  // ─────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────
  /**
   * Creates a new resource.
   * The DTO is already validated and whitelisted by the global ValidationPipe.
   *
   * @param createDto - Validated creation payload
   * @returns The newly created entity
   * @throws BadRequestException on constraint violations (propagated from repo)
   */
  async create(createDto: CreateDto): Promise<T> {
    try {
      this.logger.debug(`Creating new ${this.constructor.name.replace('Service', '')} record`);
      const entity = await this.getRepository().create(createDto);
      this.logger.log(`Created record successfully`);
      return entity;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to create record: ${(error as Error).message}`, (error as Error).stack);
      throw new BadRequestException('Failed to create resource. Please check your input and try again.');
    }
  }

  // ─────────────────────────────────────────────────────────
  // READ ALL (Paginated)
  // ─────────────────────────────────────────────────────────
  /**
   * Retrieves a paginated list of resources.
   *
   * @param pagination - Validated pagination query params (page, limit)
   * @returns PaginatedResponseDto wrapping the result array and meta
   */
  async findAll(pagination: PaginationQueryDto): Promise<PaginatedResponseDto<T>> {
    const { page = 1, limit = 10 } = pagination;
    this.logger.debug(`Fetching records: page=${page}, limit=${limit}`);

    const { data, total } = await this.getRepository().findAll(pagination);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  // ─────────────────────────────────────────────────────────
  // READ ONE
  // ─────────────────────────────────────────────────────────
  /**
   * Retrieves a single resource by its unique identifier.
   *
   * @param id - Entity ID (UUID string or integer, validated by pipe in controller)
   * @returns The found entity
   * @throws NotFoundException if no record exists with the given ID
   */
  async findOne(id: string | number): Promise<T> {
    this.logger.debug(`Fetching record with id=${id}`);
    const entity = await this.getRepository().findOne(id);

    if (!entity) {
      this.logger.warn(`Record not found: id=${id}`);
      throw new NotFoundException(`Resource with id "${id}" was not found`);
    }

    return entity;
  }

  // ─────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────
  /**
   * Updates an existing resource (partial update — PATCH semantics).
   * Validates existence before applying update.
   *
   * @param id - Entity ID
   * @param updateDto - Validated partial update payload
   * @returns The updated entity
   * @throws NotFoundException if no record exists with the given ID
   * @throws BadRequestException on constraint violations
   */
  async update(id: string | number, updateDto: UpdateDto): Promise<T> {
    // Validate existence first (throws 404 if not found)
    await this.findOne(id);

    try {
      this.logger.debug(`Updating record: id=${id}`);
      const updated = await this.getRepository().update(id, updateDto);
      this.logger.log(`Updated record: id=${id}`);
      return updated;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update record id=${id}: ${(error as Error).message}`, (error as Error).stack);
      throw new BadRequestException('Failed to update resource. Please check your input and try again.');
    }
  }

  // ─────────────────────────────────────────────────────────
  // REMOVE (Soft Delete)
  // ─────────────────────────────────────────────────────────
  /**
   * Soft-deletes a resource by setting `deletedAt` timestamp via the repository.
   * Validates existence before deletion.
   *
   * NOTE: Your ORM entity MUST have a `deletedAt?: Date` field for soft-delete.
   * For hard-delete, override this method in the concrete service.
   *
   * @param id - Entity ID
   * @returns The soft-deleted entity snapshot
   * @throws NotFoundException if no record exists with the given ID
   */
  async remove(id: string | number): Promise<T> {
    // Validate existence first (throws 404 if not found)
    await this.findOne(id);

    try {
      this.logger.debug(`Soft-deleting record: id=${id}`);
      const deleted = await this.getRepository().remove(id);
      this.logger.log(`Soft-deleted record: id=${id}`);
      return deleted;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to remove record id=${id}: ${(error as Error).message}`, (error as Error).stack);
      throw new BadRequestException('Failed to delete resource.');
    }
  }
}
