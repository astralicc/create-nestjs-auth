/**
 * Shared Interactive Module Generator for create-nestjs-auth
 * @module moduleGenerator
 */

const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
require('./utils');

function toPascalCase(str) {
  return str
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase())
    .join('');
}

function toCamelCase(str) {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toKebabCase(str) {
  return str
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    .map((x) => x.toLowerCase())
    .join('-');
}

function toSnakeCase(str) {
  return str
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    .map((x) => x.toLowerCase())
    .join('_');
}

function toSingularPascal(pascalStr) {
  if (pascalStr.endsWith('ies')) {
    return pascalStr.slice(0, -3) + 'y';
  }
  if (
    pascalStr.endsWith('s') &&
    !pascalStr.endsWith('ss') &&
    !pascalStr.endsWith('us') &&
    !pascalStr.endsWith('is')
  ) {
    return pascalStr.slice(0, -1);
  }
  return pascalStr;
}

function toSingularKebab(kebabStr) {
  return toKebabCase(toSingularPascal(toPascalCase(kebabStr)));
}

function toSingularCamel(camelStr) {
  return toCamelCase(toSingularPascal(toPascalCase(camelStr)));
}

async function detectOrm(targetDir) {
  try {
    const packageJsonPath = path.join(targetDir, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJSON(packageJsonPath);
      const deps = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {}),
      };

      if (deps['prisma'] || deps['@prisma/client']) return 'prisma';
      if (deps['typeorm'] || deps['@nestjs/typeorm']) return 'typeorm';
      if (deps['mongoose'] || deps['@nestjs/mongoose']) return 'mongoose';
      if (deps['drizzle-orm']) return 'drizzle';
    }
  } catch {
    // Fallback to prisma
  }
  return 'prisma';
}

/**
 * Ensures src/common/base exists with required abstract classes & DTOs
 */
async function ensureBaseArchitecture(targetDir) {
  try {
    const commonBaseDir = path.join(targetDir, 'src', 'common', 'base');

    if (!(await fs.pathExists(commonBaseDir))) {
      await fs.ensureDir(commonBaseDir);

      // 1. base.controller.ts
      await fs.writeFile(
        path.join(commonBaseDir, 'base.controller.ts'),
        `import { Type } from '@nestjs/common';

export abstract class BaseController<T, CreateDto, UpdateDto> {
  constructor(protected readonly service: any) {}
  protected abstract getDtoClass(): Type<T>;
  async create(dto: CreateDto): Promise<any> { return this.service.create(dto); }
  async findAll(query: any): Promise<any> { return this.service.findAll(query); }
  async findOne(id: string): Promise<any> { return this.service.findOne(id); }
  async update(id: string, dto: UpdateDto): Promise<any> { return this.service.update(id, dto); }
  async remove(id: string): Promise<any> { return this.service.remove(id); }
}
`
      );

      // 2. base.service.ts
      await fs.writeFile(
        path.join(commonBaseDir, 'base.service.ts'),
        `import { Injectable } from '@nestjs/common';

export interface PaginationQueryDto { page?: number; limit?: number; }
export interface IBaseRepository<T, CreateDto, UpdateDto> {
  create(dto: CreateDto): Promise<T>;
  findAll(pagination: PaginationQueryDto): Promise<{ data: T[]; total: number }>;
  findOne(id: string): Promise<T | null>;
  update(id: string, dto: UpdateDto): Promise<T>;
  remove(id: string): Promise<T>;
}

@Injectable()
export abstract class BaseService<T, CreateDto, UpdateDto> {
  protected abstract getRepository(): IBaseRepository<T, CreateDto, UpdateDto>;
  async create(dto: CreateDto): Promise<T> { return this.getRepository().create(dto); }
  async findAll(pagination: PaginationQueryDto): Promise<{ data: T[]; total: number }> { return this.getRepository().findAll(pagination); }
  async findOne(id: string): Promise<T | null> { return this.getRepository().findOne(id); }
  async update(id: string, dto: UpdateDto): Promise<T> { return this.getRepository().update(id, dto); }
  async remove(id: string): Promise<T> { return this.getRepository().remove(id); }
}
`
      );

      // 3. index.ts (Re-exports & DTO helpers)
      await fs.writeFile(
        path.join(commonBaseDir, 'index.ts'),
        `export * from './base.controller';
export * from './base.service';

export class ApiResponseDto<T> { statusCode: number; message: string; data: T; }
export class PaginatedResponseDto<T> { statusCode: number; message: string; data: T[]; total: number; page: number; limit: number; }
export class PaginationQueryDto { page?: number; limit?: number; }

export function ApiResponseSchema(dto: any): any { return {}; }
export function PaginatedResponseSchema(dto: any): any { return {}; }
`
      );

      console.log(chalk.green('  ✓ Auto-generated missing src/common/base architecture'));
    }
  } catch (error) {
    console.warn(chalk.yellow(`  ⚠️ Could not verify/create base architecture: ${error.message}`));
  }
}

/**
 * Interactive prompt for module options (Name, CRUD Mode, Fields)
 */
async function promptForModuleOptions(providedModuleName) {
  let moduleName = providedModuleName;

  if (!moduleName) {
    const nameAnswer = await inquirer.prompt([{
      type: 'input',
      name: 'moduleName',
      message: 'What module do you want to generate? (e.g., orders, products)',
      validate: (input) => (input && input.trim() ? true : 'Module name is required'),
    }]);
    moduleName = nameAnswer.moduleName.trim();
  }

  const { crudMode } = await inquirer.prompt([{
    type: 'list',
    name: 'crudMode',
    message: 'Which CRUD mode do you want to use?',
    choices: [
      { name: 'Full CRUD (Create, Read All, Read One, Update, Delete)', value: 'full' },
      { name: 'Custom Selection...', value: 'custom' },
    ],
    default: 'full',
  }]);

  let selectedOperations = ['create', 'findAll', 'findOne', 'update', 'remove'];

  if (crudMode === 'custom') {
    const { customOps } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'customOps',
      message: 'Select the operations you want to generate:',
      choices: [
        { name: 'Create (POST)', value: 'create', checked: true },
        { name: 'Read All / findAll (GET)', value: 'findAll', checked: true },
        { name: 'Read One / findOne (GET /:id)', value: 'findOne', checked: true },
        { name: 'Update (PUT /:id)', value: 'update', checked: true },
        { name: 'Delete / remove (DELETE /:id)', value: 'remove', checked: true },
      ],
    }]);
    selectedOperations = customOps;
  }

  // Interactive Field Builder Loop
  const { addCustomFields } = await inquirer.prompt([{
    type: 'confirm',
    name: 'addCustomFields',
    message: `Do you want to add custom fields to '${moduleName}'?`,
    default: true,
  }]);

  const fields = [];

  if (addCustomFields) {
    let addAnother = true;
    while (addAnother) {
      const fieldAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'fieldName',
          message: 'Enter field name (e.g., totalAmount, title):',
          validate: (input) => {
            if (!input || !input.trim()) return 'Field name is required';
            if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(input.trim())) {
              return 'Field name must be a valid identifier (e.g., totalAmount)';
            }
            return true;
          },
        },
        {
          type: 'list',
          name: 'fieldType',
          message: (answers) => `Select field type for '${answers.fieldName}':`,
          choices: ['String', 'Number', 'Boolean', 'Date'],
          default: 'String',
        },
        {
          type: 'confirm',
          name: 'isOptional',
          message: (answers) => `Is '${answers.fieldName}' optional?`,
          default: false,
        },
      ]);

      fields.push({
        name: fieldAnswers.fieldName.trim(),
        type: fieldAnswers.fieldType,
        isOptional: fieldAnswers.isOptional,
      });

      const { continueLoop } = await inquirer.prompt([{
        type: 'confirm',
        name: 'continueLoop',
        message: 'Do you want to add another field?',
        default: false,
      }]);

      addAnother = continueLoop;
    }
  }

  // Fallback if no custom fields added
  if (fields.length === 0) {
    fields.push({ name: 'name', type: 'String', isOptional: false });
  }

  return {
    moduleName,
    operations: selectedOperations,
    fields,
  };
}

function getFieldExampleValue(field, pascalName) {
  const name = field.name.toLowerCase();
  if (field.type === 'String') {
    if (name.includes('email')) return 'user@example.com';
    if (name.includes('phone')) return '+1234567890';
    if (name.includes('url')) return 'https://example.com';
    if (name.includes('sku') || name.includes('code')) return 'SKU-1001';
    return `Sample ${field.name}`;
  }
  if (field.type === 'Number') {
    if (name.includes('price') || name.includes('amount') || name.includes('total') || name.includes('cost')) {
      return 99.99;
    }
    return 10;
  }
  if (field.type === 'Boolean') return true;
  if (field.type === 'Date') return '2025-01-01T00:00:00.000Z';
  return 'Example value';
}

function getTsType(fieldType) {
  switch (fieldType) {
    case 'String':
      return 'string';
    case 'Number':
      return 'number';
    case 'Boolean':
      return 'boolean';
    case 'Date':
      return 'Date';
    default:
      return 'string';
  }
}

/**
 * Dynamic ORM Schema Synchronization: Prisma
 */
async function syncPrismaSchema(targetDir, singularPascal, kebabName, fields) {
  try {
    const schemaPath = path.join(targetDir, 'prisma', 'schema.prisma');
    if (!(await fs.pathExists(schemaPath))) return;

    let content = await fs.readFile(schemaPath, 'utf8');

    // Avoid duplicate model definition
    if (new RegExp(`\\bmodel\\s+${singularPascal}\\b`).test(content)) {
      return;
    }

    const fieldLines = fields.map((f) => {
      let pType = 'String';
      if (f.type === 'Number') {
        const nameLower = f.name.toLowerCase();
        if (
          nameLower.includes('price') ||
          nameLower.includes('amount') ||
          nameLower.includes('total') ||
          nameLower.includes('cost') ||
          nameLower.includes('fee') ||
          nameLower.includes('rate') ||
          nameLower.includes('score')
        ) {
          pType = 'Float';
        } else {
          pType = 'Int';
        }
      } else if (f.type === 'Boolean') {
        pType = 'Boolean';
      } else if (f.type === 'Date') {
        pType = 'DateTime';
      }
      return `  ${f.name}  ${pType}${f.isOptional ? '?' : ''}`;
    });

    const modelDefinition = `
model ${singularPascal} {
  id        String   @id @default(uuid())
${fieldLines.join('\n')}
  status    String   @default("ACTIVE")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?

  @@map("${toSnakeCase(kebabName)}")
}
`;

    content += modelDefinition;
    await fs.writeFile(schemaPath, content, 'utf8');
    console.log(chalk.green(`    ✓ Updated prisma/schema.prisma with model ${singularPascal}`));
  } catch (error) {
    console.warn(chalk.yellow(`    ⚠️ Could not sync prisma/schema.prisma: ${error.message}`));
  }
}

/**
 * Dynamic ORM Schema Synchronization: TypeORM
 */
async function syncTypeOrmSchema(moduleDir, singularPascal, kebabName, fields) {
  try {
    const entityDir = path.join(moduleDir, 'entities');
    await fs.ensureDir(entityDir);
    const entityPath = path.join(entityDir, `${toSingularKebab(kebabName)}.entity.ts`);

    const fieldLines = fields.map((f) => {
      let colDecorator = `@Column({ nullable: ${f.isOptional} })`;
      let tsType = 'string';

      if (f.type === 'Number') {
        colDecorator = `@Column('decimal', { precision: 10, scale: 2, nullable: ${f.isOptional} })`;
        tsType = 'number';
      } else if (f.type === 'Boolean') {
        colDecorator = `@Column({ default: false, nullable: ${f.isOptional} })`;
        tsType = 'boolean';
      } else if (f.type === 'Date') {
        colDecorator = `@Column({ type: 'timestamp', nullable: ${f.isOptional} })`;
        tsType = 'Date';
      }

      return `  ${colDecorator}\n  ${f.name}${f.isOptional ? '?' : ''}: ${tsType};`;
    });

    const entityContent = `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

@Entity('${toSnakeCase(kebabName)}')
export class ${singularPascal} {
  @PrimaryGeneratedColumn('uuid')
  id: string;

${fieldLines.join('\n\n')}

  @Column({ default: 'ACTIVE' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date | null;
}
`;

    await fs.writeFile(entityPath, entityContent, 'utf8');
    console.log(chalk.green(`    ✓ Generated TypeORM entity at src/modules/${kebabName}/entities/${toSingularKebab(kebabName)}.entity.ts`));
  } catch (error) {
    console.warn(chalk.yellow(`    ⚠️ Could not generate TypeORM entity: ${error.message}`));
  }
}

/**
 * Dynamic ORM Schema Synchronization: Mongoose
 */
async function syncMongooseSchema(moduleDir, singularPascal, kebabName, fields) {
  try {
    const schemaDir = path.join(moduleDir, 'schemas');
    await fs.ensureDir(schemaDir);
    const schemaPath = path.join(schemaDir, `${toSingularKebab(kebabName)}.schema.ts`);

    const fieldLines = fields.map((f) => {
      let propDecorator = `@Prop({ required: ${!f.isOptional} })`;
      let tsType = 'string';

      if (f.type === 'Number') {
        propDecorator = `@Prop({ required: ${!f.isOptional} })`;
        tsType = 'number';
      } else if (f.type === 'Boolean') {
        propDecorator = `@Prop({ default: false })`;
        tsType = 'boolean';
      } else if (f.type === 'Date') {
        propDecorator = `@Prop({ type: Date, required: ${!f.isOptional} })`;
        tsType = 'Date';
      }

      return `  ${propDecorator}\n  ${f.name}${f.isOptional ? '?' : ''}: ${tsType};`;
    });

    const schemaContent = `import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ${singularPascal}Document = HydratedDocument<${singularPascal}>;

@Schema({ timestamps: true })
export class ${singularPascal} {
${fieldLines.join('\n\n')}

  @Prop({ default: 'ACTIVE' })
  status: string;

  @Prop({ type: Date, default: null })
  deletedAt?: Date | null;
}

export const ${singularPascal}Schema = SchemaFactory.createForClass(${singularPascal});
`;

    await fs.writeFile(schemaPath, schemaContent, 'utf8');
    console.log(chalk.green(`    ✓ Generated Mongoose schema at src/modules/${kebabName}/schemas/${toSingularKebab(kebabName)}.schema.ts`));
  } catch (error) {
    console.warn(chalk.yellow(`    ⚠️ Could not generate Mongoose schema: ${error.message}`));
  }
}

/**
 * Dynamic ORM Schema Synchronization: Drizzle
 */
async function syncDrizzleSchema(moduleDir, singularPascal, kebabName, fields) {
  try {
    const schemaDir = path.join(moduleDir, 'schema');
    await fs.ensureDir(schemaDir);
    const schemaPath = path.join(schemaDir, `${kebabName}.schema.ts`);

    const fieldLines = fields.map((f) => {
      let colDef = `varchar('${toSnakeCase(f.name)}', { length: 255 })`;
      if (f.type === 'Number') {
        colDef = `numeric('${toSnakeCase(f.name)}')`;
      } else if (f.type === 'Boolean') {
        colDef = `boolean('${toSnakeCase(f.name)}').default(false)`;
      } else if (f.type === 'Date') {
        colDef = `timestamp('${toSnakeCase(f.name)}')`;
      }

      if (!f.isOptional) {
        colDef += '.notNull()';
      }

      return `  ${f.name}: ${colDef},`;
    });

    const schemaContent = `import { pgTable, varchar, numeric, boolean, timestamp } from 'drizzle-orm/pg-core';

export const ${toCamelCase(kebabName)}s = pgTable('${toSnakeCase(kebabName)}', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
${fieldLines.join('\n')}
  status: varchar('status', { length: 50 }).default('ACTIVE').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export type ${singularPascal} = typeof ${toCamelCase(kebabName)}s.$inferSelect;
export type New${singularPascal} = typeof ${toCamelCase(kebabName)}s.$inferInsert;
`;

    await fs.writeFile(schemaPath, schemaContent, 'utf8');
    console.log(chalk.green(`    ✓ Generated Drizzle schema at src/modules/${kebabName}/schema/${kebabName}.schema.ts`));
  } catch (error) {
    console.warn(chalk.yellow(`    ⚠️ Could not generate Drizzle schema: ${error.message}`));
  }
}

/**
 * Auto-Generate Starter Seed File Template
 */
async function generateSeedFileTemplate(targetDir, orm, singularPascal, kebabName, fields) {
  try {
    const singularCamel = toSingularCamel(kebabName);
    const dummyObjFields = fields.map((f) => {
      const ex = getFieldExampleValue(f, singularPascal);
      const valStr = typeof ex === 'string' ? `'${ex}'` : ex;
      return `      ${f.name}: ${valStr},`;
    }).join('\n');

    if (orm === 'prisma') {
      const seedsDir = path.join(targetDir, 'prisma', 'seeds');
      await fs.ensureDir(seedsDir);
      const seedPath = path.join(seedsDir, `${kebabName}.seed.ts`);

      const seedContent = `import { PrismaClient } from '@prisma/client';

export async function seed${singularPascal}(prisma: PrismaClient) {
  console.log('🌱 Seeding ${singularPascal}...');
  await (prisma as any).${singularCamel}.create({
    data: {
${dummyObjFields}
      status: 'ACTIVE',
    },
  });
}
`;
      await fs.writeFile(seedPath, seedContent, 'utf8');
      console.log(chalk.green(`    ✓ Generated Prisma seed template at prisma/seeds/${kebabName}.seed.ts`));
    } else {
      const seedsDir = path.join(targetDir, 'src', 'database', 'seeds');
      await fs.ensureDir(seedsDir);
      const seedPath = path.join(seedsDir, `${kebabName}.seed.ts`);

      const seedContent = `// Starter seed template for ${singularPascal}
export async function seed${singularPascal}(dbOrRepo: any) {
  console.log('🌱 Seeding ${singularPascal}...');
  const seedData = {
${dummyObjFields}
    status: 'ACTIVE',
  };
  if (dbOrRepo && typeof dbOrRepo.create === 'function') {
    const item = dbOrRepo.create(seedData);
    if (typeof dbOrRepo.save === 'function') {
      await dbOrRepo.save(item);
    }
  } else if (dbOrRepo && typeof dbOrRepo.insert === 'function') {
    await dbOrRepo.insert(seedData);
  }
}
`;
      await fs.writeFile(seedPath, seedContent, 'utf8');
      console.log(chalk.green(`    ✓ Generated seed template at src/database/seeds/${kebabName}.seed.ts`));
    }
  } catch (error) {
    console.warn(chalk.yellow(`    ⚠️ Could not generate seed template: ${error.message}`));
  }
}

function getServiceContent(orm, pascalName, singularPascal, camelName, kebabName, createDtoName, updateDtoName, ops) {
  const singularKebab = toSingularKebab(kebabName);

  if (orm === 'typeorm') {
    return `import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { BaseService, IBaseRepository, PaginationQueryDto } from '../../common/base';
${ops.create || ops.update ? `import { ${createDtoName} } from './dto/create-${kebabName}.dto';\nimport { ${updateDtoName} } from './dto/update-${kebabName}.dto';` : ''}
import { ${singularPascal} } from './entities/${singularKebab}.entity';

export type ${pascalName}Entity = ${singularPascal};

class TypeOrm${pascalName}Repository implements IBaseRepository<${pascalName}Entity, ${createDtoName}, ${updateDtoName}> {
  constructor(private readonly repo: Repository<${pascalName}Entity>) {}

  ${ops.create ? `async create(dto: ${createDtoName}): Promise<${pascalName}Entity> {
    const entity = this.repo.create(dto);
    return this.repo.save(entity);
  }` : `async create(dto: ${createDtoName}): Promise<${pascalName}Entity> { throw new Error('Not implemented'); }`}

  ${ops.findAll ? `async findAll(pagination: PaginationQueryDto): Promise<{ data: ${pascalName}Entity[]; total: number }> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;
    const [data, total] = await this.repo.findAndCount({ where: { deletedAt: IsNull() }, skip, take: limit, order: { createdAt: 'DESC' } as any });
    return { data, total };
  }` : `async findAll(p: PaginationQueryDto): Promise<{ data: ${pascalName}Entity[]; total: number }> { throw new Error('Not implemented'); }`}

  ${ops.findOne ? `async findOne(id: string): Promise<${pascalName}Entity | null> {
    return this.repo.findOne({ where: { id, deletedAt: IsNull() } as any });
  }` : `async findOne(id: string): Promise<${pascalName}Entity | null> { throw new Error('Not implemented'); }`}

  ${ops.update ? `async update(id: string, dto: ${updateDtoName}): Promise<${pascalName}Entity> {
    await this.repo.update(id, dto as any);
    return this.repo.findOneOrFail({ where: { id } as any });
  }` : `async update(id: string, dto: ${updateDtoName}): Promise<${pascalName}Entity> { throw new Error('Not implemented'); }`}

  ${ops.remove ? `async remove(id: string): Promise<${pascalName}Entity> {
    const entity = await this.repo.findOneOrFail({ where: { id } as any });
    entity.deletedAt = new Date();
    return this.repo.save(entity);
  }` : `async remove(id: string): Promise<${pascalName}Entity> { throw new Error('Not implemented'); }`}
}

@Injectable()
export class ${pascalName}Service extends BaseService<${pascalName}Entity, ${createDtoName}, ${updateDtoName}> {
  private readonly repository: TypeOrm${pascalName}Repository;

  constructor(@InjectRepository(${singularPascal}) private readonly repo: Repository<${pascalName}Entity>) {
    super();
    this.repository = new TypeOrm${pascalName}Repository(this.repo);
  }

  protected getRepository(): IBaseRepository<${pascalName}Entity, ${createDtoName}, ${updateDtoName}> {
    return this.repository;
  }
}
`;
  } else if (orm === 'mongoose') {
    return `import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseService, IBaseRepository, PaginationQueryDto } from '../../common/base';
${ops.create || ops.update ? `import { ${createDtoName} } from './dto/create-${kebabName}.dto';\nimport { ${updateDtoName} } from './dto/update-${kebabName}.dto';` : ''}
import { ${singularPascal}, ${singularPascal}Document } from './schemas/${singularKebab}.schema';

export type ${pascalName}Entity = ${singularPascal}Document;

class Mongoose${pascalName}Repository implements IBaseRepository<${pascalName}Entity, ${createDtoName}, ${updateDtoName}> {
  constructor(private readonly model: Model<${pascalName}Entity>) {}

  ${ops.create ? `async create(dto: ${createDtoName}): Promise<${pascalName}Entity> {
    const created = new this.model(dto);
    return created.save();
  }` : `async create(dto: ${createDtoName}): Promise<${pascalName}Entity> { throw new Error('Not implemented'); }`}

  ${ops.findAll ? `async findAll(pagination: PaginationQueryDto): Promise<{ data: ${pascalName}Entity[]; total: number }> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.model.find({ deletedAt: null }).skip(skip).limit(limit).sort({ createdAt: -1 }).exec(),
      this.model.countDocuments({ deletedAt: null }).exec()
    ]);
    return { data, total };
  }` : `async findAll(p: PaginationQueryDto): Promise<{ data: ${pascalName}Entity[]; total: number }> { throw new Error('Not implemented'); }`}

  ${ops.findOne ? `async findOne(id: string): Promise<${pascalName}Entity | null> {
    return this.model.findOne({ _id: id, deletedAt: null }).exec();
  }` : `async findOne(id: string): Promise<${pascalName}Entity | null> { throw new Error('Not implemented'); }`}

  ${ops.update ? `async update(id: string, dto: ${updateDtoName}): Promise<${pascalName}Entity> {
    return this.model.findByIdAndUpdate(id, dto as any, { new: true }).exec() as Promise<${pascalName}Entity>;
  }` : `async update(id: string, dto: ${updateDtoName}): Promise<${pascalName}Entity> { throw new Error('Not implemented'); }`}

  ${ops.remove ? `async remove(id: string): Promise<${pascalName}Entity> {
    return this.model.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true }).exec() as Promise<${pascalName}Entity>;
  }` : `async remove(id: string): Promise<${pascalName}Entity> { throw new Error('Not implemented'); }`}
}

@Injectable()
export class ${pascalName}Service extends BaseService<${pascalName}Entity, ${createDtoName}, ${updateDtoName}> {
  private readonly repository: Mongoose${pascalName}Repository;

  constructor(@InjectModel(${singularPascal}.name) private readonly model: Model<${pascalName}Entity>) {
    super();
    this.repository = new Mongoose${pascalName}Repository(this.model);
  }

  protected getRepository(): IBaseRepository<${pascalName}Entity, ${createDtoName}, ${updateDtoName}> {
    return this.repository;
  }
}
`;
  } else if (orm === 'drizzle') {
    return `import { Injectable, Inject } from '@nestjs/common';
import { eq, isNull, desc } from 'drizzle-orm';
import { BaseService, IBaseRepository, PaginationQueryDto } from '../../common/base';
${ops.create || ops.update ? `import { ${createDtoName} } from './dto/create-${kebabName}.dto';\nimport { ${updateDtoName} } from './dto/update-${kebabName}.dto';` : ''}
import { ${camelName}s, ${singularPascal} } from './schema/${kebabName}.schema';

export type ${pascalName}Entity = ${singularPascal};

class Drizzle${pascalName}Repository implements IBaseRepository<${pascalName}Entity, ${createDtoName}, ${updateDtoName}> {
  constructor(private readonly db: any) {}

  ${ops.create ? `async create(dto: ${createDtoName}): Promise<${pascalName}Entity> {
    const [result] = await this.db.insert(${camelName}s).values(dto).returning();
    return result;
  }` : `async create(dto: ${createDtoName}): Promise<${pascalName}Entity> { throw new Error('Not implemented'); }`}

  ${ops.findAll ? `async findAll(pagination: PaginationQueryDto): Promise<{ data: ${pascalName}Entity[]; total: number }> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;
    
    const data = await this.db.select().from(${camelName}s)
      .where(isNull(${camelName}s.deletedAt))
      .limit(limit).offset(skip)
      .orderBy(desc(${camelName}s.createdAt));
      
    return { data, total: 0 };
  }` : `async findAll(p: PaginationQueryDto): Promise<{ data: ${pascalName}Entity[]; total: number }> { throw new Error('Not implemented'); }`}

  ${ops.findOne ? `async findOne(id: string): Promise<${pascalName}Entity | null> {
    const [result] = await this.db.select().from(${camelName}s)
      .where(eq(${camelName}s.id, id));
    return result || null;
  }` : `async findOne(id: string): Promise<${pascalName}Entity | null> { throw new Error('Not implemented'); }`}

  ${ops.update ? `async update(id: string, dto: ${updateDtoName}): Promise<${pascalName}Entity> {
    const [result] = await this.db.update(${camelName}s).set(dto).where(eq(${camelName}s.id, id)).returning();
    return result;
  }` : `async update(id: string, dto: ${updateDtoName}): Promise<${pascalName}Entity> { throw new Error('Not implemented'); }`}

  ${ops.remove ? `async remove(id: string): Promise<${pascalName}Entity> {
    const [result] = await this.db.update(${camelName}s).set({ deletedAt: new Date() }).where(eq(${camelName}s.id, id)).returning();
    return result;
  }` : `async remove(id: string): Promise<${pascalName}Entity> { throw new Error('Not implemented'); }`}
}

@Injectable()
export class ${pascalName}Service extends BaseService<${pascalName}Entity, ${createDtoName}, ${updateDtoName}> {
  private readonly repository: Drizzle${pascalName}Repository;

  constructor(@Inject('DRIZZLE') private readonly db: any) {
    super();
    this.repository = new Drizzle${pascalName}Repository(this.db);
  }

  protected getRepository(): IBaseRepository<${pascalName}Entity, ${createDtoName}, ${updateDtoName}> {
    return this.repository;
  }
}
`;
  }

  // DEFAULT (PRISMA)
  const singularCamel = toSingularCamel(kebabName);
  return `import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService, IBaseRepository, PaginationQueryDto } from '../../common/base';
${ops.create || ops.update ? `import { ${createDtoName} } from './dto/create-${kebabName}.dto';\nimport { ${updateDtoName} } from './dto/update-${kebabName}.dto';` : ''}

export type ${pascalName}Entity = any; 
${!ops.create && !ops.update ? `\ntype ${createDtoName} = any;\ntype ${updateDtoName} = any;` : ''}

class Prisma${pascalName}Repository implements IBaseRepository<${pascalName}Entity, ${createDtoName}, ${updateDtoName}> {
  constructor(private readonly prisma: PrismaService) {}

  ${ops.create ? `async create(dto: ${createDtoName}): Promise<${pascalName}Entity> {
    return (this.prisma as any).${singularCamel}.create({ data: dto });
  }` : `async create(dto: ${createDtoName}): Promise<${pascalName}Entity> { throw new Error('Not implemented'); }`}

  ${ops.findAll ? `async findAll(pagination: PaginationQueryDto): Promise<{ data: ${pascalName}Entity[]; total: number }> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      (this.prisma as any).${singularCamel}.findMany({ where: { deletedAt: null }, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      (this.prisma as any).${singularCamel}.count({ where: { deletedAt: null } }),
    ]);
    return { data, total };
  }` : `async findAll(p: PaginationQueryDto): Promise<{ data: ${pascalName}Entity[]; total: number }> { throw new Error('Not implemented'); }`}

  ${ops.findOne ? `async findOne(id: string): Promise<${pascalName}Entity | null> {
    return (this.prisma as any).${singularCamel}.findFirst({ where: { id, deletedAt: null } });
  }` : `async findOne(id: string): Promise<${pascalName}Entity | null> { throw new Error('Not implemented'); }`}

  ${ops.update ? `async update(id: string, dto: ${updateDtoName}): Promise<${pascalName}Entity> {
    return (this.prisma as any).${singularCamel}.update({ where: { id }, data: dto });
  }` : `async update(id: string, dto: ${updateDtoName}): Promise<${pascalName}Entity> { throw new Error('Not implemented'); }`}

  ${ops.remove ? `async remove(id: string): Promise<${pascalName}Entity> {
    return (this.prisma as any).${singularCamel}.update({ where: { id }, data: { deletedAt: new Date() } });
  }` : `async remove(id: string): Promise<${pascalName}Entity> { throw new Error('Not implemented'); }`}
}

@Injectable()
export class ${pascalName}Service extends BaseService<${pascalName}Entity, ${createDtoName}, ${updateDtoName}> {
  private readonly repository: Prisma${pascalName}Repository;

  constructor(private readonly prisma: PrismaService) {
    super();
    this.repository = new Prisma${pascalName}Repository(this.prisma);
  }

  protected getRepository(): IBaseRepository<${pascalName}Entity, ${createDtoName}, ${updateDtoName}> {
    return this.repository;
  }
}
`;
}

function getModuleContent(orm, pascalName, singularPascal, kebabName) {
  const singularKebab = toSingularKebab(kebabName);

  if (orm === 'typeorm') {
    return `import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ${pascalName}Controller } from './${kebabName}.controller';
import { ${pascalName}Service } from './${kebabName}.service';
import { ${singularPascal} } from './entities/${singularKebab}.entity';

@Module({
  imports: [TypeOrmModule.forFeature([${singularPascal}])],
  controllers: [${pascalName}Controller],
  providers: [${pascalName}Service],
  exports: [${pascalName}Service],
})
export class ${pascalName}Module {}`;
  } else if (orm === 'mongoose') {
    return `import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ${pascalName}Controller } from './${kebabName}.controller';
import { ${pascalName}Service } from './${kebabName}.service';
import { ${singularPascal}, ${singularPascal}Schema } from './schemas/${singularKebab}.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: ${singularPascal}.name, schema: ${singularPascal}Schema }])],
  controllers: [${pascalName}Controller],
  providers: [${pascalName}Service],
  exports: [${pascalName}Service],
})
export class ${pascalName}Module {}`;
  } else if (orm === 'drizzle') {
    return `import { Module } from '@nestjs/common';
import { ${pascalName}Controller } from './${kebabName}.controller';
import { ${pascalName}Service } from './${kebabName}.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [${pascalName}Controller],
  providers: [${pascalName}Service],
  exports: [${pascalName}Service],
})
export class ${pascalName}Module {}`;
  }

  // DEFAULT (PRISMA)
  return `import { Module } from '@nestjs/common';
import { ${pascalName}Controller } from './${kebabName}.controller';
import { ${pascalName}Service } from './${kebabName}.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [${pascalName}Controller],
  providers: [${pascalName}Service],
  exports: [${pascalName}Service],
})
export class ${pascalName}Module {}
`;
}

async function registerInAppModule(targetDir, pascalName, kebabName) {
  try {
    const appModulePath = path.join(targetDir, 'src', 'app.module.ts');

    if (!(await fs.pathExists(appModulePath))) {
      return false;
    }

    let content = await fs.readFile(appModulePath, 'utf8');
    const moduleImport = `import { ${pascalName}Module } from './modules/${kebabName}/${kebabName}.module';`;

    // Prevent duplicate registration — use exact module name match
    if (content.includes(moduleImport) || new RegExp(`\\b${pascalName}Module\\b`).test(content)) {
      return true;
    }

    // 1. Add import statement at top of file
    content = `${moduleImport}\n` + content;

    // 2. Inject ${pascalName}Module inside @Module({ imports: [ ... ] })
    const importsKeywordIndex = content.indexOf('imports: [');

    if (importsKeywordIndex !== -1) {
      const insertPosition = importsKeywordIndex + 'imports: ['.length;
      content = content.slice(0, insertPosition) + `\n    ${pascalName}Module,` + content.slice(insertPosition);

      await fs.writeFile(appModulePath, content, 'utf8');
      console.log(chalk.green(`✨ Automatically registered ${pascalName}Module in src/app.module.ts`));
      return true;
    }
  } catch (error) {
    console.warn(chalk.yellow(`⚠️ Could not auto-register ${pascalName}Module in app.module.ts: ${error.message}`));
  }
  return false;
}

/**
 * Main Shared Interactive Module Generator entry point
 */
async function generateModule(providedModuleName, targetDir = process.cwd(), specifiedOrm = null) {
  try {
    // Ensure src/common/base exists before generating any module components
    await ensureBaseArchitecture(targetDir);

    const options = await promptForModuleOptions(providedModuleName);
    const kebabName = toKebabCase(options.moduleName);
    const pascalName = toPascalCase(options.moduleName);
    const camelName = toCamelCase(options.moduleName);
    const singularPascal = toSingularPascal(pascalName);

    // Detect ORM
    const orm = specifiedOrm || (await detectOrm(targetDir));

    // Ensure inside a NestJS project structure
    const srcDir = path.join(targetDir, 'src');
    if (!(await fs.pathExists(srcDir))) {
      console.warn(chalk.yellow('⚠️ Could not find "src" directory. Generating at current directory.'));
    }

    const moduleDir = (await fs.pathExists(srcDir))
      ? path.join(srcDir, 'modules', kebabName)
      : path.join(targetDir, 'modules', kebabName);
    const dtoDir = path.join(moduleDir, 'dto');

    await fs.ensureDir(moduleDir);
    await fs.ensureDir(dtoDir);

    const ops = {
      create: options.operations.includes('create'),
      findAll: options.operations.includes('findAll'),
      findOne: options.operations.includes('findOne'),
      update: options.operations.includes('update'),
      remove: options.operations.includes('remove'),
    };

    // 1. Dynamic ORM Schema Synchronization
    if (orm === 'prisma') {
      await syncPrismaSchema(targetDir, singularPascal, kebabName, options.fields);
    } else if (orm === 'typeorm') {
      await syncTypeOrmSchema(moduleDir, singularPascal, kebabName, options.fields);
    } else if (orm === 'mongoose') {
      await syncMongooseSchema(moduleDir, singularPascal, kebabName, options.fields);
    } else if (orm === 'drizzle') {
      await syncDrizzleSchema(moduleDir, singularPascal, kebabName, options.fields);
    }

    // 2. Generate DTOs
    const createDtoName = `Create${singularPascal}Dto`;
    const updateDtoName = `Update${singularPascal}Dto`;
    const responseDtoName = `${pascalName}Dto`;

    const createFieldsText = options.fields.map((f) => {
      const tsType = getTsType(f.type);
      const ex = getFieldExampleValue(f, pascalName);
      const exValStr = typeof ex === 'string' ? `'${ex}'` : ex;

      const swaggerDecorator = f.isOptional
        ? `@ApiPropertyOptional({ description: '${f.name} property', example: ${exValStr} })`
        : `@ApiProperty({ description: '${f.name} property', example: ${exValStr} })`;

      const valDecorators = [];
      if (f.type === 'String') valDecorators.push('@IsString()');
      if (f.type === 'Number') valDecorators.push('@IsNumber()');
      if (f.type === 'Boolean') valDecorators.push('@IsBoolean()');
      if (f.type === 'Date') {
        valDecorators.push('@IsDate()');
        valDecorators.push('@Type(() => Date)');
      }

      if (f.isOptional) {
        valDecorators.push('@IsOptional()');
      } else {
        valDecorators.push('@IsNotEmpty()');
      }

      return `  ${swaggerDecorator}\n  ${valDecorators.join('\n  ')}\n  ${f.name}${f.isOptional ? '?' : ''}: ${tsType};`;
    }).join('\n\n');

    const hasDateFields = options.fields.some((f) => f.type === 'Date');

    if (ops.create || ops.update) {
      await fs.writeFile(
        path.join(dtoDir, `create-${kebabName}.dto.ts`),
        `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsDate, IsNotEmpty, IsOptional } from 'class-validator';
${hasDateFields ? `import { Type } from 'class-transformer';\n` : ''}
export class ${createDtoName} {
${createFieldsText}
}
`
      );

      await fs.writeFile(
        path.join(dtoDir, `update-${kebabName}.dto.ts`),
        `import { PartialType } from '@nestjs/swagger';
import { ${createDtoName} } from './create-${kebabName}.dto';

export class ${updateDtoName} extends PartialType(${createDtoName}) {}
`
      );
    }

    const responseFieldsText = options.fields.map((f) => {
      const tsType = getTsType(f.type);
      const ex = getFieldExampleValue(f, pascalName);
      const exValStr = typeof ex === 'string' ? `'${ex}'` : ex;

      const swaggerDecorator = f.isOptional
        ? `@ApiPropertyOptional({ example: ${exValStr} })`
        : `@ApiProperty({ example: ${exValStr} })`;

      return `  ${swaggerDecorator}\n  ${f.name}${f.isOptional ? '?' : ''}: ${tsType};`;
    }).join('\n\n');

    await fs.writeFile(
      path.join(dtoDir, `${kebabName}.dto.ts`),
      `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ${responseDtoName} {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', format: 'uuid' })
  id: string;

${responseFieldsText}

  @ApiProperty({ example: 'ACTIVE' })
  status: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ nullable: true, example: null })
  deletedAt?: Date | null;
}
`
    );

    // 3. Generate Service
    const serviceContent = getServiceContent(
      orm,
      pascalName,
      singularPascal,
      camelName,
      kebabName,
      createDtoName,
      updateDtoName,
      ops
    );
    await fs.writeFile(path.join(moduleDir, `${kebabName}.service.ts`), serviceContent);

    // 4. Generate Controller (Fixed single clean import path from common/base)
    const controllerContent = `import { Controller${ops.findAll ? ', Query' : ''}${ops.findOne || ops.update || ops.remove ? ', Param, ParseUUIDPipe, HttpStatus' : ''}${ops.create ? ', Post, Body' : ''}${ops.findAll || ops.findOne ? ', Get' : ''}${ops.update ? ', Put' : ''}${ops.remove ? ', Delete' : ''}, Type } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiExtraModels, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { BaseController, ApiResponseDto, ApiResponseSchema, PaginatedResponseDto, PaginatedResponseSchema, PaginationQueryDto } from '../../common/base';
import { ${pascalName}Service } from './${kebabName}.service';
${ops.create || ops.update ? `import { ${createDtoName} } from './dto/create-${kebabName}.dto';\nimport { ${updateDtoName} } from './dto/update-${kebabName}.dto';` : `type ${createDtoName} = any;\ntype ${updateDtoName} = any;`}
import { ${responseDtoName} } from './dto/${kebabName}.dto';

type ${pascalName}Entity = any;

@ApiTags('${pascalName}')
@ApiBearerAuth('bearer')
@ApiExtraModels(ApiResponseDto, PaginatedResponseDto, ${responseDtoName})
@Controller('${kebabName}')
export class ${pascalName}Controller extends BaseController<${pascalName}Entity, ${createDtoName}, ${updateDtoName}> {
  constructor(protected readonly service: ${pascalName}Service) {
    super(service);
  }

  protected getDtoClass(): Type<${pascalName}Entity> {
    return ${responseDtoName} as unknown as Type<${pascalName}Entity>;
  }
${ops.create ? `
  @Post()
  @ApiOperation({ summary: 'Create a new ${kebabName}' })
  @ApiResponse({ status: HttpStatus.CREATED, schema: ApiResponseSchema(${responseDtoName}) })
  override async create(@Body() dto: ${createDtoName}): Promise<ApiResponseDto<${pascalName}Entity>> {
    return super.create(dto);
  }
` : ''}${ops.findAll ? `
  @Get()
  @ApiOperation({ summary: 'Get all ${kebabName} (paginated)' })
  @ApiResponse({ status: HttpStatus.OK, schema: PaginatedResponseSchema(${responseDtoName}) })
  override async findAll(@Query() pagination: PaginationQueryDto): Promise<PaginatedResponseDto<${pascalName}Entity>> {
    return super.findAll(pagination);
  }
` : ''}${ops.findOne ? `
  @Get(':id')
  @ApiOperation({ summary: 'Get ${kebabName} by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, schema: ApiResponseSchema(${responseDtoName}) })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '${pascalName} not found' })
  override async findOne(@Param('id', new ParseUUIDPipe({ version: '4', errorHttpStatusCode: HttpStatus.BAD_REQUEST })) id: string): Promise<ApiResponseDto<${pascalName}Entity>> {
    return super.findOne(id);
  }
` : ''}${ops.update ? `
  @Put(':id')
  @ApiOperation({ summary: 'Update ${kebabName} by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, schema: ApiResponseSchema(${responseDtoName}) })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '${pascalName} not found' })
  override async update(
    @Param('id', new ParseUUIDPipe({ version: '4', errorHttpStatusCode: HttpStatus.BAD_REQUEST })) id: string,
    @Body() dto: ${updateDtoName}
  ): Promise<ApiResponseDto<${pascalName}Entity>> {
    return super.update(id, dto);
  }
` : ''}${ops.remove ? `
  @Delete(':id')
  @ApiOperation({ summary: 'Delete ${kebabName} by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, schema: ApiResponseSchema(${responseDtoName}) })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '${pascalName} not found' })
  override async remove(@Param('id', new ParseUUIDPipe({ version: '4', errorHttpStatusCode: HttpStatus.BAD_REQUEST })) id: string): Promise<ApiResponseDto<${pascalName}Entity>> {
    return super.remove(id);
  }
` : ''}
}
`;
    await fs.writeFile(path.join(moduleDir, `${kebabName}.controller.ts`), controllerContent);

    // 5. Generate Module
    const moduleContent = getModuleContent(orm, pascalName, singularPascal, kebabName);
    await fs.writeFile(path.join(moduleDir, `${kebabName}.module.ts`), moduleContent);

    // 6. Auto-register in src/app.module.ts
    const isAutoRegistered = await registerInAppModule(targetDir, pascalName, kebabName);

    // 7. Auto-Generate Starter Seed File Template
    await generateSeedFileTemplate(targetDir, orm, singularPascal, kebabName, options.fields);

    console.log(chalk.green(`\n✅ Module "${kebabName}" successfully generated in ${path.relative(process.cwd(), moduleDir)}`));
    console.log(chalk.gray(`    Detected ORM: ${orm}`));

    if (!isAutoRegistered) {
      console.log(chalk.yellow(`\n⚠️ Please manually register ${pascalName}Module in src/app.module.ts:`));
      console.log(chalk.cyan(`
import { ${pascalName}Module } from './modules/${kebabName}/${kebabName}.module';

@Module({
  imports: [
    ...
    ${pascalName}Module,
  ],
})
export class AppModule {}
`));
    }

    return true;
  } catch (error) {
    console.error(chalk.red('\n❌ Module generation failed:'), error.message);
    return false;
  }
}

module.exports = {
  generateModule,
  promptForModuleOptions,
  detectOrm,
  registerInAppModule,
};