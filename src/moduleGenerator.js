/**
 * Module Generator for create-nestjs-auth
 * @module moduleGenerator
 */

const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

function toPascalCase(str) {
  return str
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    .map(x => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase())
    .join('');
}

function toCamelCase(str) {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toKebabCase(str) {
  return str
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    .map(x => x.toLowerCase())
    .join('-');
}

async function detectOrm(targetDir) {
  try {
    const packageJsonPath = path.join(targetDir, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJSON(packageJsonPath);
      const deps = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };
      
      if (deps['prisma']) return 'prisma';
      if (deps['typeorm']) return 'typeorm';
      if (deps['mongoose']) return 'mongoose';
      if (deps['drizzle-orm']) return 'drizzle';
    }
  } catch (error) {
    // Ignore error and fallback to default
  }
  return 'prisma';
}

async function promptForModuleOptions(moduleName) {
  const questions = [];

  if (!moduleName) {
    questions.push({
      type: 'input',
      name: 'moduleName',
      message: 'What module do you want to generate? (e.g., orders, products)',
      validate: (input) => input.trim() ? true : 'Module name is required',
    });
  }

  questions.push({
    type: 'list',
    name: 'crudMode',
    message: 'Which CRUD mode do you want to use?',
    choices: [
      { name: 'Full CRUD (Create, Read All, Read One, Update, Delete)', value: 'full' },
      { name: 'Custom Selection...', value: 'custom' }
    ],
    default: 'full'
  });

  const answers = await inquirer.prompt(questions);

  let selectedOperations = ['create', 'findAll', 'findOne', 'update', 'remove'];

  if (answers.crudMode === 'custom') {
    const { customOps } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'customOps',
      message: 'Select the operations you want to generate:',
      choices: [
        { name: 'Create (POST)', value: 'create', checked: true },
        { name: 'Read All / findAll (GET)', value: 'findAll', checked: true },
        { name: 'Read One / findOne (GET /:id)', value: 'findOne', checked: false },
        { name: 'Update (PUT /:id)', value: 'update', checked: true },
        { name: 'Delete / remove (DELETE /:id)', value: 'remove', checked: false }
      ]
    }]);
    selectedOperations = customOps;
  }

  return {
    moduleName: moduleName || answers.moduleName,
    operations: selectedOperations
  };
}

function getServiceContent(orm, pascalName, camelName, kebabName, createDtoName, updateDtoName, ops) {
  if (orm === 'typeorm') {
    return `import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { BaseService, IBaseRepository, PaginationQueryDto } from '../../common/base';
${ops.create || ops.update ? `import { ${createDtoName} } from './dto/create-${kebabName}.dto';\nimport { ${updateDtoName} } from './dto/update-${kebabName}.dto';` : ''}

// Placeholder for TypeORM Entity. Ensure you create entities/${kebabName}.entity.ts
type ${pascalName}Entity = any;
${!ops.create && !ops.update ? `\ntype ${createDtoName} = any;\ntype ${updateDtoName} = any;` : ''}

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

  constructor(@InjectRepository(Object) private readonly repo: Repository<${pascalName}Entity>) {
    super();
    this.repository = new TypeOrm${pascalName}Repository(this.repo);
  }

  protected getRepository(): IBaseRepository<${pascalName}Entity, ${createDtoName}, ${updateDtoName}> {
    return this.repository;
  }
}
`;
  } else if (orm === 'mongoose') {
    return `import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseService, IBaseRepository, PaginationQueryDto } from '../../common/base';
${ops.create || ops.update ? `import { ${createDtoName} } from './dto/create-${kebabName}.dto';\nimport { ${updateDtoName} } from './dto/update-${kebabName}.dto';` : ''}

// Placeholder for Mongoose Document. Ensure you create schemas/${kebabName}.schema.ts
type ${pascalName}Document = any;
${!ops.create && !ops.update ? `\ntype ${createDtoName} = any;\ntype ${updateDtoName} = any;` : ''}

class Mongoose${pascalName}Repository implements IBaseRepository<${pascalName}Document, ${createDtoName}, ${updateDtoName}> {
  constructor(private readonly model: Model<${pascalName}Document>) {}

  ${ops.create ? `async create(dto: ${createDtoName}): Promise<${pascalName}Document> {
    const created = new this.model(dto);
    return created.save();
  }` : `async create(dto: ${createDtoName}): Promise<${pascalName}Document> { throw new Error('Not implemented'); }`}

  ${ops.findAll ? `async findAll(pagination: PaginationQueryDto): Promise<{ data: ${pascalName}Document[]; total: number }> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.model.find({ deletedAt: null }).skip(skip).limit(limit).sort({ createdAt: -1 }).exec(),
      this.model.countDocuments({ deletedAt: null }).exec()
    ]);
    return { data, total };
  }` : `async findAll(p: PaginationQueryDto): Promise<{ data: ${pascalName}Document[]; total: number }> { throw new Error('Not implemented'); }`}

  ${ops.findOne ? `async findOne(id: string): Promise<${pascalName}Document | null> {
    return this.model.findOne({ _id: id, deletedAt: null }).exec();
  }` : `async findOne(id: string): Promise<${pascalName}Document | null> { throw new Error('Not implemented'); }`}

  ${ops.update ? `async update(id: string, dto: ${updateDtoName}): Promise<${pascalName}Document> {
    return this.model.findByIdAndUpdate(id, dto as any, { new: true }).exec() as Promise<${pascalName}Document>;
  }` : `async update(id: string, dto: ${updateDtoName}): Promise<${pascalName}Document> { throw new Error('Not implemented'); }`}

  ${ops.remove ? `async remove(id: string): Promise<${pascalName}Document> {
    return this.model.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true }).exec() as Promise<${pascalName}Document>;
  }` : `async remove(id: string): Promise<${pascalName}Document> { throw new Error('Not implemented'); }`}
}

@Injectable()
export class ${pascalName}Service extends BaseService<${pascalName}Document, ${createDtoName}, ${updateDtoName}> {
  private readonly repository: Mongoose${pascalName}Repository;

  constructor(@InjectModel('${pascalName}') private readonly model: Model<${pascalName}Document>) {
    super();
    this.repository = new Mongoose${pascalName}Repository(this.model);
  }

  protected getRepository(): IBaseRepository<${pascalName}Document, ${createDtoName}, ${updateDtoName}> {
    return this.repository;
  }
}
`;
  } else if (orm === 'drizzle') {
    return `import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, isNull, desc } from 'drizzle-orm';
import { BaseService, IBaseRepository, PaginationQueryDto } from '../../common/base';
${ops.create || ops.update ? `import { ${createDtoName} } from './dto/create-${kebabName}.dto';\nimport { ${updateDtoName} } from './dto/update-${kebabName}.dto';` : ''}

// Placeholder for Drizzle schema
const ${camelName}Schema = {} as any;
type ${pascalName}Entity = any;
${!ops.create && !ops.update ? `\ntype ${createDtoName} = any;\ntype ${updateDtoName} = any;` : ''}

class Drizzle${pascalName}Repository implements IBaseRepository<${pascalName}Entity, ${createDtoName}, ${updateDtoName}> {
  constructor(private readonly db: any) {}

  ${ops.create ? `async create(dto: ${createDtoName}): Promise<${pascalName}Entity> {
    const [result] = await this.db.insert(${camelName}Schema).values(dto).returning();
    return result;
  }` : `async create(dto: ${createDtoName}): Promise<${pascalName}Entity> { throw new Error('Not implemented'); }`}

  ${ops.findAll ? `async findAll(pagination: PaginationQueryDto): Promise<{ data: ${pascalName}Entity[]; total: number }> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;
    
    const data = await this.db.select().from(${camelName}Schema)
      .where(isNull(${camelName}Schema.deletedAt))
      .limit(limit).offset(skip)
      .orderBy(desc(${camelName}Schema.createdAt));
      
    return { data, total: 0 };
  }` : `async findAll(p: PaginationQueryDto): Promise<{ data: ${pascalName}Entity[]; total: number }> { throw new Error('Not implemented'); }`}

  ${ops.findOne ? `async findOne(id: string): Promise<${pascalName}Entity | null> {
    const [result] = await this.db.select().from(${camelName}Schema)
      .where(eq(${camelName}Schema.id, id));
    return result || null;
  }` : `async findOne(id: string): Promise<${pascalName}Entity | null> { throw new Error('Not implemented'); }`}

  ${ops.update ? `async update(id: string, dto: ${updateDtoName}): Promise<${pascalName}Entity> {
    const [result] = await this.db.update(${camelName}Schema).set(dto).where(eq(${camelName}Schema.id, id)).returning();
    return result;
  }` : `async update(id: string, dto: ${updateDtoName}): Promise<${pascalName}Entity> { throw new Error('Not implemented'); }`}

  ${ops.remove ? `async remove(id: string): Promise<${pascalName}Entity> {
    const [result] = await this.db.update(${camelName}Schema).set({ deletedAt: new Date() }).where(eq(${camelName}Schema.id, id)).returning();
    return result;
  }` : `async remove(id: string): Promise<${pascalName}Entity> { throw new Error('Not implemented'); }`}
}

@Injectable()
export class ${pascalName}Service extends BaseService<${pascalName}Entity, ${createDtoName}, ${updateDtoName}> {
  private readonly repository: Drizzle${pascalName}Repository;

  constructor(@Inject('DB_CONNECTION') private readonly db: any) {
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
  return `import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService, IBaseRepository, PaginationQueryDto } from '../../common/base';
${ops.create || ops.update ? `import { ${createDtoName} } from './dto/create-${kebabName}.dto';\nimport { ${updateDtoName} } from './dto/update-${kebabName}.dto';` : ''}

// Placeholder for Prisma Model type. 
// Assuming a model named \`${pascalName}\` exists in schema.prisma
type ${pascalName}Entity = any; 
${!ops.create && !ops.update ? `\ntype ${createDtoName} = any;\ntype ${updateDtoName} = any;` : ''}

class Prisma${pascalName}Repository implements IBaseRepository<${pascalName}Entity, ${createDtoName}, ${updateDtoName}> {
  constructor(private readonly prisma: PrismaService) {}

  ${ops.create ? `async create(dto: ${createDtoName}): Promise<${pascalName}Entity> {
    return (this.prisma as any).${camelName}.create({ data: dto });
  }` : `async create(dto: ${createDtoName}): Promise<${pascalName}Entity> { throw new Error('Not implemented'); }`}

  ${ops.findAll ? `async findAll(pagination: PaginationQueryDto): Promise<{ data: ${pascalName}Entity[]; total: number }> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      (this.prisma as any).${camelName}.findMany({ where: { deletedAt: null }, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      (this.prisma as any).${camelName}.count({ where: { deletedAt: null } }),
    ]);
    return { data, total };
  }` : `async findAll(p: PaginationQueryDto): Promise<{ data: ${pascalName}Entity[]; total: number }> { throw new Error('Not implemented'); }`}

  ${ops.findOne ? `async findOne(id: string): Promise<${pascalName}Entity | null> {
    return (this.prisma as any).${camelName}.findFirst({ where: { id, deletedAt: null } });
  }` : `async findOne(id: string): Promise<${pascalName}Entity | null> { throw new Error('Not implemented'); }`}

  ${ops.update ? `async update(id: string, dto: ${updateDtoName}): Promise<${pascalName}Entity> {
    return (this.prisma as any).${camelName}.update({ where: { id }, data: dto });
  }` : `async update(id: string, dto: ${updateDtoName}): Promise<${pascalName}Entity> { throw new Error('Not implemented'); }`}

  ${ops.remove ? `async remove(id: string): Promise<${pascalName}Entity> {
    return (this.prisma as any).${camelName}.update({ where: { id }, data: { deletedAt: new Date() } });
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

function getModuleContent(orm, pascalName, kebabName) {
  if (orm === 'typeorm') {
    return `import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ${pascalName}Controller } from './${kebabName}.controller';
import { ${pascalName}Service } from './${kebabName}.service';

@Module({
  imports: [TypeOrmModule.forFeature([/* ${pascalName}Entity */])],
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

@Module({
  imports: [MongooseModule.forFeature([{ name: '${pascalName}', schema: null /* ${pascalName}Schema */ }])],
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
    
    // Cegah duplikasi import
    if (content.includes(moduleImport) || content.includes(`${pascalName}Module`)) {
      return true;
    }

    // 1. Tambahkan baris import di paling atas file
    content = `${moduleImport}\n` + content;

    // 2. Inject ${pascalName}Module tepat di dalam decorator @Module({ imports: [ ... ] })
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

async function generateModule(providedModuleName, targetDir = process.cwd(), specifiedOrm = null) {
  try {
    const options = await promptForModuleOptions(providedModuleName);
    const kebabName = toKebabCase(options.moduleName);
    const pascalName = toPascalCase(options.moduleName);
    const camelName = toCamelCase(options.moduleName);

    // Detect ORM
    const orm = specifiedOrm || await detectOrm(targetDir);

    // Ensure inside a NestJS project structure
    const srcDir = path.join(targetDir, 'src');
    if (!(await fs.pathExists(srcDir))) {
      console.warn(chalk.yellow('⚠️ Could not find "src" directory. Generating at current directory.'));
    }

    const moduleDir = (await fs.pathExists(srcDir)) ? path.join(srcDir, 'modules', kebabName) : path.join(targetDir, 'modules', kebabName);
    const dtoDir = path.join(moduleDir, 'dto');

    await fs.ensureDir(moduleDir);
    await fs.ensureDir(dtoDir);

    const ops = {
      create: options.operations.includes('create'),
      findAll: options.operations.includes('findAll'),
      findOne: options.operations.includes('findOne'),
      update: options.operations.includes('update'),
      remove: options.operations.includes('remove')
    };

    // 1. Generate DTOs
    const createDtoName = `Create${pascalName}Dto`;
    const updateDtoName = `Update${pascalName}Dto`;
    const responseDtoName = `${pascalName}Dto`;

    if (ops.create || ops.update) {
      await fs.writeFile(
        path.join(dtoDir, `create-${kebabName}.dto.ts`),
        `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ${createDtoName} {
  @ApiProperty({ description: 'Example property', example: 'Example value' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Optional property', example: 'Optional value' })
  @IsString()
  @IsOptional()
  description?: string;
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

    await fs.writeFile(
      path.join(dtoDir, `${kebabName}.dto.ts`),
      `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ${responseDtoName} {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Example value' })
  name: string;

  @ApiPropertyOptional({ example: 'Optional value' })
  description?: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ nullable: true, example: null })
  deletedAt?: Date | null;
}
`
    );

    // 2. Generate Service
    const serviceContent = getServiceContent(orm, pascalName, camelName, kebabName, createDtoName, updateDtoName, ops);
    await fs.writeFile(path.join(moduleDir, `${kebabName}.service.ts`), serviceContent);

    // 3. Generate Controller
    const controllerContent = `import { Controller${ops.findAll ? ', Query' : ''}${ops.findOne || ops.update || ops.remove ? ', Param, ParseUUIDPipe, HttpStatus' : ''}${ops.create ? ', Post, Body' : ''}${ops.findAll || ops.findOne ? ', Get' : ''}${ops.update ? ', Put' : ''}${ops.remove ? ', Delete' : ''}, Type } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiExtraModels, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { BaseController } from '../../common/base/base.controller';
import { ApiResponseDto, ApiResponseSchema, PaginatedResponseDto, PaginatedResponseSchema, PaginationQueryDto } from '../../common/base';
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
  @ApiResponse({ status: 201, description: '${pascalName} successfully created', schema: ApiResponseSchema(${responseDtoName}) })
  override async create(@Body() dto: ${createDtoName}): Promise<ApiResponseDto<${pascalName}Entity>> {
    return super.create(dto);
  }
` : ''}${ops.findAll ? `
  @Get()
  @ApiOperation({ summary: 'Get all ${kebabName} (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated ${kebabName}', schema: PaginatedResponseSchema(${responseDtoName}) })
  override async findAll(@Query() pagination: PaginationQueryDto): Promise<PaginatedResponseDto<${pascalName}Entity>> {
    return super.findAll(pagination);
  }
` : ''}${ops.findOne ? `
  @Get(':id')
  @ApiOperation({ summary: 'Get ${kebabName} by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: '${pascalName} found', schema: ApiResponseSchema(${responseDtoName}) })
  @ApiResponse({ status: 404, description: '${pascalName} not found' })
  override async findOne(@Param('id', new ParseUUIDPipe({ version: '4', errorHttpStatusCode: HttpStatus.BAD_REQUEST })) id: string): Promise<ApiResponseDto<${pascalName}Entity>> {
    return super.findOne(id);
  }
` : ''}${ops.update ? `
  @Put(':id')
  @ApiOperation({ summary: 'Update ${kebabName} by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: '${pascalName} successfully updated', schema: ApiResponseSchema(${responseDtoName}) })
  @ApiResponse({ status: 404, description: '${pascalName} not found' })
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
  @ApiResponse({ status: 200, description: '${pascalName} successfully deleted', schema: ApiResponseSchema(${responseDtoName}) })
  @ApiResponse({ status: 404, description: '${pascalName} not found' })
  override async remove(@Param('id', new ParseUUIDPipe({ version: '4', errorHttpStatusCode: HttpStatus.BAD_REQUEST })) id: string): Promise<ApiResponseDto<${pascalName}Entity>> {
    return super.remove(id);
  }
` : ''}
}
`;
    await fs.writeFile(path.join(moduleDir, `${kebabName}.controller.ts`), controllerContent);

    // 4. Generate Module
    const moduleContent = getModuleContent(orm, pascalName, kebabName);
    await fs.writeFile(path.join(moduleDir, `${kebabName}.module.ts`), moduleContent);

    // 5. Auto-register in src/app.module.ts
    const isAutoRegistered = await registerInAppModule(targetDir, pascalName, kebabName);

    console.log(chalk.green(`\n✅ Module "${kebabName}" successfully generated in ${path.relative(process.cwd(), moduleDir)}`));
    console.log(chalk.gray(`   Detected ORM: ${orm}`));

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
  detectOrm
};