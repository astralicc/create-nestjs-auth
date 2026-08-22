# 📖 speedrun-cli Usage & Interactive Flow Guide

This document provides a comprehensive reference for all commands, interactive prompt flows, generated file structures, and multi-ORM code outputs produced by `speedrun-cli`.

---

## 📑 Table of Contents
1. [Command Quick Reference](#1-command-quick-reference)
2. [Case 1: Full Project Creation (`speedrun-cli create`)](#2-case-1-full-project-creation-speedrun-cli-create-app-name)
3. [Case 2: Advanced CRUD Module Generation (`speedrun-cli g`)](#3-case-2-advanced-crud-module-generation-speedrun-cli-g-module)
4. [Case 3: Custom Operations Generation (`speedrun-cli g`)](#4-case-3-custom-operations-generation-speedrun-cli-g-module)
5. [Case 4: Editing Field Attributes (`speedrun-cli field`)](#5-case-4-editing-field-attributes-via-sub-menu-speedrun-cli-field-module)
6. [Case 5: Deleting Fields (`speedrun-cli field`)](#6-case-5-deleting-fields-speedrun-cli-field-module)
7. [Case 6: Multi-ORM Schema Output Matrix](#7-case-6-multi-orm-schema-output-matrix)
8. [Case 7: Dynamic Module Configuration (`speedrun-cli config`)](#8-case-7-dynamic-module-configuration-speedrun-cli-config-module)
9. [Case 8: Realistic Seed Data Generation (`speedrun-cli seed`)](#9-case-8-realistic-seed-data-generation-speedrun-cli-seed-module)

---

## 1. Command Quick Reference

| Command | Alias | Description | Example Usage |
|---|---|---|---|
| `speedrun-cli create [app-name]` | - | Scaffold a complete NestJS authentication project | `npx speedrun-cli create my-api` |
| `speedrun-cli generate [module-name]` | `g` | Interactively generate a new CRUD module | `npx speedrun-cli g orders` |
| `speedrun-cli field [module-name]` | `f` | Manage (add, edit, delete) fields of an existing module | `npx speedrun-cli f orders` |
| `speedrun-cli config [module-name]` | `c` | Customize role guards (`@Roles`), auth protection & active CRUD routes | `npx speedrun-cli c orders` |
| `speedrun-cli seed [module-name]` | `s` / `sd` | Generate realistic seed/dummy data scripts (Prisma, TypeORM, JSON) | `npx speedrun-cli s orders` |

---

## 2. Case 1: Full Project Creation (`speedrun-cli create [app-name]`)

### Command
```bash
npx speedrun-cli create my-auth-app
```

### Interactive Terminal Flow
```text
😱🤯🤯 speedrun-cli v2.7.14 🤧🥶🥶🥶 (real)

Production-ready NestJS authentication - now u can literally speedrun everything atp

? Select ORM:
  ❯ Prisma (Recommended - Type-safe ORM with automated migrations)
    TypeORM (Active Record / Data Mapper ORM with TypeScript support)
    Drizzle ORM (TypeScript-first lightweight ORM)
    Mongoose (MongoDB ODM for Node.js)

? Select Database:
  ❯ PostgreSQL (Recommended)
    MySQL
    SQLite
    MongoDB

? Add Swagger API documentation? (Y/n) Y
? Enable Base CRUD Architecture (BaseService & BaseController in src/common/base)? (Y/n) Y
? Select package manager:
  ❯ npm
    pnpm
    yarn
    bun

🚀 Creating my-auth-app...
   ORM: Prisma
   Database: PostgreSQL
   Swagger: Enabled
   Base CRUD: Enabled

   Updating package.json...
   Setting up environment variables...

📦 Installing dependencies with npm...
   Running: npm install

🔧 Initializing git repository...
   Git repository initialized with initial commit

? Set up database connection and run migrations now? (Y/n) Y
? Enter migration name: init

⚡ Running Prisma database setup...
🌱 Database seeded successfully!
```

### Generated Project Structure
```text
my-auth-app/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   ├── dto/
│   │   └── guards/
│   ├── common/
│   │   ├── base/
│   │   │   ├── base.controller.ts
│   │   │   ├── base.service.ts
│   │   │   ├── index.ts
│   │   │   └── swagger/
│   │   │       ├── api-response.dto.ts
│   │   │       └── paginated.dto.ts
│   │   ├── decorators/
│   │   └── filters/
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── app.module.ts
│   └── main.ts
├── .env
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## 3. Case 2: Advanced CRUD Module Generation (`speedrun-cli g [module]`)

### Command
```bash
npx speedrun-cli g orders
```

### Interactive Terminal Flow
```text
😱🤯🤯 speedrun-cli v2.7.14 nest module generator 🤧🥶🥶🥶 (real)

? Which CRUD mode do you want to use? Full CRUD (Create, Read All, Read One, Update, Delete)
? Select primary key format for 'orders':
    id (Default UUID)
  ❯ order_id (e.g., order_id)
    orderId (e.g., orderId)
    Custom Primary Key Name...

? Do you want to add custom fields to 'orders'? (Y/n) Y

Enter field name (e.g., totalAmount, title): totalAmount
? Select field type for 'totalAmount': Float
? Is 'totalAmount' optional? (y/N) N

? Do you want to add another field? (Y/n) Y

Enter field name (e.g., totalAmount, title): customerNote
? Select field type for 'customerNote': String
? Is 'customerNote' optional? (Y/n) Y

📋 Current fields for 'orders':
   1. totalAmount: Float (Required)
   2. customerNote: String (Optional)

? Choose an action: ✅ Finish defining fields

? Do you want to add a relation to another module? (Y/n) Y
? Select relation type: Many-to-One (e.g. Order belongs to User)
? Target module name (e.g., users, categories): users
? Foreign key field name (e.g., userId): userId
? Do you want to add another relation? (y/N) N

? Include default 'status' field (e.g. ACTIVE)? (Y/n) Y
? Protect write operations (POST, PUT, DELETE) with Auth/Roles Guard? (Y/n) Y
? Select allowed roles:
  [*] ADMIN
  [*] SUPERADMIN
  [ ] USER

   ✓ Scaffolded Base CRUD architecture at src/common/base
   ✓ Updated prisma/schema.prisma with model Order
   ✓ Generated Prisma seed template at prisma/seeds/orders.seed.ts
✨ Automatically registered OrdersModule in src/app.module.ts

✅ Module "orders" successfully generated in src/modules/orders
```

### File Tree Created (`src/modules/orders/`)
```text
src/modules/orders/
├── dto/
│   ├── create-orders.dto.ts
│   ├── update-orders.dto.ts
│   └── orders.dto.ts
├── orders.controller.ts
├── orders.module.ts
└── orders.service.ts
```

### Generated Code Example (`orders.controller.ts`)
```typescript
import { Controller, Query, Param, ParseUUIDPipe, HttpStatus, Post, Body, Get, Put, Delete, Type, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiExtraModels, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { BaseController, ApiResponseDto, ApiResponseSchema, PaginatedResponseDto, PaginatedResponseSchema, PaginationQueryDto } from '../../common/base';
import { OrdersService } from './orders.service';
import { CreateOrdersDto } from './dto/create-orders.dto';
import { UpdateOrdersDto } from './dto/update-orders.dto';
import { OrdersDto } from './dto/orders.dto';

type OrdersEntity = any;

@ApiTags('Orders')
@ApiBearerAuth('bearer')
@ApiExtraModels(ApiResponseDto, PaginatedResponseDto, OrdersDto)
@Controller('orders')
export class OrdersController extends BaseController<OrdersEntity, CreateOrdersDto, UpdateOrdersDto> {
  constructor(protected readonly service: OrdersService) {
    super(service);
  }

  protected getDtoClass(): Type<OrdersEntity> {
    return OrdersDto as unknown as Type<OrdersEntity>;
  }

  @Post()
  @UseGuards()
  // Roles: ADMIN, SUPERADMIN
  @ApiOperation({ summary: 'Create a new orders' })
  @ApiResponse({ status: HttpStatus.CREATED, schema: ApiResponseSchema(OrdersDto) })
  override async create(@Body() dto: CreateOrdersDto): Promise<ApiResponseDto<OrdersEntity>> {
    return super.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders (paginated)' })
  @ApiResponse({ status: HttpStatus.OK, schema: PaginatedResponseSchema(OrdersDto) })
  override async findAll(@Query() pagination: PaginationQueryDto): Promise<PaginatedResponseDto<OrdersEntity>> {
    return super.findAll(pagination);
  }

  @Get(':order_id')
  @ApiOperation({ summary: 'Get orders by ID' })
  @ApiParam({ name: 'order_id', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, schema: ApiResponseSchema(OrdersDto) })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Orders not found' })
  override async findOne(@Param('order_id', new ParseUUIDPipe({ version: '4', errorHttpStatusCode: HttpStatus.BAD_REQUEST })) order_id: string): Promise<ApiResponseDto<OrdersEntity>> {
    return super.findOne(order_id);
  }

  @Put(':order_id')
  @UseGuards()
  // Roles: ADMIN, SUPERADMIN
  @ApiOperation({ summary: 'Update orders by ID' })
  @ApiParam({ name: 'order_id', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, schema: ApiResponseSchema(OrdersDto) })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Orders not found' })
  override async update(
    @Param('order_id', new ParseUUIDPipe({ version: '4', errorHttpStatusCode: HttpStatus.BAD_REQUEST })) order_id: string,
    @Body() dto: UpdateOrdersDto
  ): Promise<ApiResponseDto<OrdersEntity>> {
    return super.update(order_id, dto);
  }

  @Delete(':order_id')
  @UseGuards()
  // Roles: ADMIN, SUPERADMIN
  @ApiOperation({ summary: 'Delete orders by ID' })
  @ApiParam({ name: 'order_id', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, schema: ApiResponseSchema(OrdersDto) })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Orders not found' })
  override async remove(@Param('order_id', new ParseUUIDPipe({ version: '4', errorHttpStatusCode: HttpStatus.BAD_REQUEST })) order_id: string): Promise<ApiResponseDto<OrdersEntity>> {
    return super.remove(order_id);
  }
}
```

---

## 4. Case 3: Custom Operations Generation (`speedrun-cli g [module]`)

Generating a read-only module (e.g. `analytics`) with custom operation selection (GET/GET BY ID only, skipping POST/PUT/DELETE).

### Command
```bash
npx speedrun-cli g analytics
```

### Interactive Terminal Flow
```text
? Which CRUD mode do you want to use? Custom Selection...
? Select the operations you want to generate:
  [ ] Create (POST)
  [*] Read All / findAll (GET)
  [*] Read One / findOne (GET /:id)
  [ ] Update (PUT /:id)
  [ ] Delete / remove (DELETE /:id)

? Select primary key format for 'analytics': id (Default UUID)
? Do you want to add custom fields to 'analytics'? (Y/n) Y

Enter field name: metricName
? Select field type for 'metricName': String
? Is 'metricName' optional? (y/N) N

? Do you want to add another field? (Y/n) Y

Enter field name: metricValue
? Select field type for 'metricValue': Float
? Is 'metricValue' optional? (y/N) N

📋 Current fields for 'analytics':
   1. metricName: String (Required)
   2. metricValue: Float (Required)

? Choose an action: ✅ Finish defining fields
? Do you want to add a relation to another module? (y/N) N
? Include default 'status' field (e.g. ACTIVE)? (y/N) N
? Protect write operations (POST, PUT, DELETE) with Auth/Roles Guard? (y/N) N

   ✓ Updated prisma/schema.prisma with model Analytic
✨ Automatically registered AnalyticsModule in src/app.module.ts

✅ Module "analytics" successfully generated in src/modules/analytics
```

### Output Controller (`analytics.controller.ts`)
```typescript
import { Controller, Query, Param, ParseUUIDPipe, HttpStatus, Get, Type } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiExtraModels, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { BaseController, ApiResponseDto, ApiResponseSchema, PaginatedResponseDto, PaginatedResponseSchema, PaginationQueryDto } from '../../common/base';
import { AnalyticsService } from './analytics.service';
import { AnalyticsDto } from './dto/analytics.dto';

type AnalyticsEntity = any;
type CreateAnalyticsDto = any;
type UpdateAnalyticsDto = any;

@ApiTags('Analytics')
@ApiBearerAuth('bearer')
@ApiExtraModels(ApiResponseDto, PaginatedResponseDto, AnalyticsDto)
@Controller('analytics')
export class AnalyticsController extends BaseController<AnalyticsEntity, CreateAnalyticsDto, UpdateAnalyticsDto> {
  constructor(protected readonly service: AnalyticsService) {
    super(service);
  }

  protected getDtoClass(): Type<AnalyticsEntity> {
    return AnalyticsDto as unknown as Type<AnalyticsEntity>;
  }

  @Get()
  @ApiOperation({ summary: 'Get all analytics (paginated)' })
  @ApiResponse({ status: HttpStatus.OK, schema: PaginatedResponseSchema(AnalyticsDto) })
  override async findAll(@Query() pagination: PaginationQueryDto): Promise<PaginatedResponseDto<AnalyticsEntity>> {
    return super.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get analytics by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, schema: ApiResponseSchema(AnalyticsDto) })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Analytics not found' })
  override async findOne(@Param('id', new ParseUUIDPipe({ version: '4', errorHttpStatusCode: HttpStatus.BAD_REQUEST })) id: string): Promise<ApiResponseDto<AnalyticsEntity>> {
    return super.findOne(id);
  }
}
```

---

## 5. Case 4: Editing Field Attributes via Sub-Menu (`speedrun-cli field [module]`)

### Command
```bash
npx speedrun-cli field orders
# or alias:
npx speedrun-cli f orders
```

### Interactive Terminal Flow
```text
📦 Managing fields for module: orders (Detected ORM: prisma)

Current Fields (2): totalAmount (Float), customerNote (String?)

? What do you want to do? ✏️  Edit an existing field
? Select field to edit:
    totalAmount (Float)
  ❯ customerNote (String?)

? Select property to edit for 'customerNote':
  ❯ 1. Change Field Name
    2. Change Field Type
    3. Change Optional Status
    4. Edit All Properties

? Enter field name: remark
   ✓ Updated field 'remark'

Current Fields (2): totalAmount (Float), remark (String?)

? What do you want to do? 💾 Save changes & update files

   ✓ Updated existing Prisma model Order in schema.prisma

✅ Successfully updated fields for module "orders"!

? Run database migration & seed now? (y/N) N
```

### Code Preview of Updated `dto/create-orders.dto.ts`
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNotEmpty, IsNumber, IsString, IsUUID } from 'class-validator';

export class CreateOrdersDto {
  @ApiProperty({ description: 'totalAmount property', example: 99.99 })
  @IsNumber()
  @IsNotEmpty()
  totalAmount: number;

  @ApiPropertyOptional({ description: 'remark property', example: 'Sample value' })
  @IsString()
  @IsOptional()
  remark?: string;

  @ApiPropertyOptional({ description: 'Foreign key linking to users', example: '123e4567-e89b-12d3-a456-426614174000', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
```

---

## 6. Case 5: Deleting Fields (`speedrun-cli field [module]`)

### Command
```bash
npx speedrun-cli f orders
```

### Interactive Terminal Flow
```text
📦 Managing fields for module: orders (Detected ORM: prisma)

Current Fields (2): totalAmount (Float), remark (String?)

? What do you want to do? 🗑️  Delete a field
? Select field to delete:
    totalAmount (Float)
  ❯ remark (String?)

🗑️ Field 'remark' removed.

Current Fields (1): totalAmount (Float)

? What do you want to do? 💾 Save changes & update files

   ✓ Updated existing Prisma model Order in schema.prisma

✅ Successfully updated fields for module "orders"!

? Run database migration & seed now? (y/N) Y

⚡ Running database migration for ORM: prisma...
   ✓ Database migration complete!

🌱 Seeding database for ORM: prisma...
   ✓ Database seed complete!
```

---

## 7. Case 6: Multi-ORM Schema Output Matrix

Below is a comparative breakdown showing how a module named `Product` with fields `title: String/varchar`, `price: Float/decimal`, and `inStock: Boolean` is generated across all 4 supported ORMs.

### 1. Prisma (`prisma/schema.prisma`)
```prisma
model Product {
  id        String   @id @default(uuid())
  title     String
  price     Float
  inStock   Boolean
  status    String   @default("ACTIVE")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?

  @@map("product")
}
```

### 2. TypeORM (`src/modules/products/entities/product.entity.ts`)
```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

@Entity('product')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  title: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: false })
  price: number;

  @Column({ default: false, nullable: false })
  inStock: boolean;

  @Column({ default: 'ACTIVE' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date | null;
}
```

### 3. Drizzle (`src/modules/products/schema/products.schema.ts`)
```typescript
import { pgTable, varchar, numeric, boolean, timestamp } from 'drizzle-orm/pg-core';

export const products = pgTable('product', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: varchar('title', { length: 255 }).notNull(),
  price: numeric('price').notNull(),
  inStock: boolean('in_stock').default(false).notNull(),
  status: varchar('status', { length: 50 }).default('ACTIVE').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
```

### 4. Mongoose (`src/modules/products/schemas/product.schema.ts`)
```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  price: number;

  @Prop({ default: false })
  inStock: boolean;

  @Prop({ default: 'ACTIVE' })
  status: string;

  @Prop({ type: Date, default: null })
  deletedAt?: Date | null;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
```

---

## 8. Case 7: Dynamic Module Configuration (`speedrun-cli config [module]`)

The `config` (alias `c`) command lets you dynamically modify role-based access controls and enable or disable CRUD endpoints on existing controllers without manually editing controller code.

### Command
```bash
npx speedrun-cli config orders
# or alias:
npx speedrun-cli c orders
```

---

### Scenario 7A: Managing Auth & Roles Guards (`@Roles`)

### Interactive Terminal Flow
```text
⚙️  Configuring module: orders

? Select configuration action:
  ❯ 🔐 Manage Auth & Roles Guards (POST, PUT, DELETE protection)
    🛠️  Toggle Active CRUD Operations (Enable/Disable endpoints)
    ❌ Cancel

? Protect write operations (POST, PUT, DELETE) with Auth/Roles Guard? (Y/n) Y
? Select allowed roles for write operations:
  [*] ADMIN
  [*] SUPERADMIN
  [ ] USER
  [*] Custom Role...

? Enter custom role name(s) (comma-separated, e.g., AUDITOR, EDITOR): AUDITOR

✅ Successfully updated module configuration for "orders"!
   Controller: src/modules/orders/orders.controller.ts
   Protected Write Ops: ADMIN, SUPERADMIN, AUDITOR
   Active Operations: create, findAll, findOne, update, remove
```

---

### Scenario 7B: Toggling Active CRUD Operations (Disabling Endpoints)

### Interactive Terminal Flow
```text
⚙️  Configuring module: orders

? Select configuration action:
    🔐 Manage Auth & Roles Guards (POST, PUT, DELETE protection)
  ❯ 🛠️  Toggle Active CRUD Operations (Enable/Disable endpoints)
    ❌ Cancel

? Select active CRUD operations:
  [*] Create (POST)
  [*] Read All / findAll (GET)
  [*] Read One / findOne (GET /:id)
  [*] Update (PUT /:id)
  [ ] Delete / remove (DELETE /:id)

✅ Successfully updated module configuration for "orders"!
   Controller: src/modules/orders/orders.controller.ts
   Protected Write Ops: ADMIN, SUPERADMIN, AUDITOR
   Active Operations: create, findAll, findOne, update
```

---

### Updated Code Output (`orders.controller.ts`)
```typescript
import { Controller, Query, Param, ParseUUIDPipe, HttpStatus, Post, Body, Get, Put, Type, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiExtraModels, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { BaseController, ApiResponseDto, ApiResponseSchema, PaginatedResponseDto, PaginatedResponseSchema, PaginationQueryDto } from '../../common/base';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { OrdersService } from './orders.service';
import { CreateOrdersDto } from './dto/create-orders.dto';
import { UpdateOrdersDto } from './dto/update-orders.dto';
import { OrdersDto } from './dto/orders.dto';

type OrdersEntity = any;

@ApiTags('Orders')
@ApiBearerAuth('bearer')
@ApiExtraModels(ApiResponseDto, PaginatedResponseDto, OrdersDto)
@Controller('orders')
export class OrdersController extends BaseController<OrdersEntity, CreateOrdersDto, UpdateOrdersDto> {
  constructor(protected readonly service: OrdersService) {
    super(service);
  }

  protected getDtoClass(): Type<OrdersEntity> {
    return OrdersDto as unknown as Type<OrdersEntity>;
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'AUDITOR')
  @ApiOperation({ summary: 'Create a new orders' })
  @ApiResponse({ status: HttpStatus.CREATED, schema: ApiResponseSchema(OrdersDto) })
  override async create(@Body() dto: CreateOrdersDto): Promise<ApiResponseDto<OrdersEntity>> {
    return super.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders (paginated)' })
  @ApiResponse({ status: HttpStatus.OK, schema: PaginatedResponseSchema(OrdersDto) })
  override async findAll(@Query() pagination: PaginationQueryDto): Promise<PaginatedResponseDto<OrdersEntity>> {
    return super.findAll(pagination);
  }

  @Get(':order_id')
  @ApiOperation({ summary: 'Get orders by ID' })
  @ApiParam({ name: 'order_id', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, schema: ApiResponseSchema(OrdersDto) })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Orders not found' })
  override async findOne(@Param('order_id', new ParseUUIDPipe({ version: '4', errorHttpStatusCode: HttpStatus.BAD_REQUEST })) order_id: string): Promise<ApiResponseDto<OrdersEntity>> {
    return super.findOne(order_id);
  }

  @Put(':order_id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'AUDITOR')
  @ApiOperation({ summary: 'Update orders by ID' })
  @ApiParam({ name: 'order_id', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, schema: ApiResponseSchema(OrdersDto) })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Orders not found' })
```

---

## 9. Case 8: Realistic Seed Data Generation (`speedrun-cli seed [module]`)

The `seed` (alias `s` or `sd`) command generates realistic dummy/seed data tailored to your target module's DTOs/ORM fields (emails, titles, prices, dates, UUIDs) and outputs Prisma seed scripts, TypeORM seed scripts, or raw JSON mock files.

### Command
```bash
npx speedrun-cli seed orders
# or alias:
npx speedrun-cli s orders
```

---

### Interactive Terminal Flow
```text
🌱 Generating seed data for module: orders (Detected ORM: prisma)

? How many seed records do you want to generate? 10
? Select target output format / seeding strategy:
  ❯ Prisma Seed Script (prisma/seeds/[module].seed.ts integration)
    TypeORM / Custom Script (src/database/seeds/[module].seed.ts)
    Raw JSON Mock File (src/modules/[module]/mock-data.json)

⚡ Generated Prisma seed script at: prisma/seeds/orders.seed.ts
✨ Integrated seedOrders into prisma/seed.ts

💡 To execute this seed script, run:
   npm run prisma:seed (or npx prisma db seed)
```

---

### Generated Prisma Seed Output (`prisma/seeds/orders.seed.ts`)
```typescript
import { PrismaClient } from '@prisma/client';

export const orderSeedData = [
  {
    "order_id": "123e4567-e89b-12d3-a456-426614174001",
    "totalAmount": 15.5,
    "customerNote": "This is a sample customerNote content for item #1.",
    "status": "ACTIVE"
  },
  {
    "order_id": "123e4567-e89b-12d3-a456-426614174002",
    "totalAmount": 21,
    "customerNote": "This is a sample customerNote content for item #2.",
    "status": "ACTIVE"
  }
];

export async function seedOrders(prisma: PrismaClient) {
  console.log('🌱 Seeding orders...');
  for (const item of orderSeedData) {
    await (prisma as any).order.upsert({
      where: { order_id: item.order_id },
      update: {},
      create: item,
    });
  }
  console.log('   ✓ Seeded 10 orders records');
}
```


