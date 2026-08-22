/**
 * Module Configurator for speedrun-cli
 * Allows dynamic customization of Auth/Roles Guards and active CRUD endpoints on existing controllers.
 * @module moduleConfigurator
 */

const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const {
  toKebabCase,
  toPascalCase,
  toSingularPascal,
  detectModulePrimaryKey,
} = require('./moduleGenerator');

/**
 * Detects whether JwtAuthGuard or AuthGuard is used in the project
 */
async function getGuardImportDetails(targetDir) {
  const commonGuardsDir = path.join(targetDir, 'src', 'common', 'guards');
  if (await fs.pathExists(path.join(commonGuardsDir, 'jwt-auth.guard.ts'))) {
    return {
      guardName: 'JwtAuthGuard',
      guardImportPath: '../../common/guards/jwt-auth.guard',
    };
  }
  if (await fs.pathExists(path.join(commonGuardsDir, 'auth.guard.ts'))) {
    return {
      guardName: 'AuthGuard',
      guardImportPath: '../../common/guards/auth.guard',
    };
  }
  return {
    guardName: 'JwtAuthGuard',
    guardImportPath: '../../common/guards/jwt-auth.guard',
  };
}

/**
 * Parses existing controller file to extract active CRUD operations and roles configuration
 */
function parseExistingController(controllerContent) {
  const ops = {
    create: /@Post\s*\(/m.test(controllerContent) && /override\s+async\s+create\s*\(/m.test(controllerContent),
    findAll: /@Get\s*\(\s*\)/m.test(controllerContent) && /override\s+async\s+findAll\s*\(/m.test(controllerContent),
    findOne: /@Get\s*\(\s*':/m.test(controllerContent) && /override\s+async\s+findOne\s*\(/m.test(controllerContent),
    update: /@Put\s*\(/m.test(controllerContent) && /override\s+async\s+update\s*\(/m.test(controllerContent),
    remove: /@Delete\s*\(/m.test(controllerContent) && /override\s+async\s+remove\s*\(/m.test(controllerContent),
  };

  const hasGuards = /@UseGuards\s*\(/m.test(controllerContent);

  let roles = [];
  const rolesMatch = controllerContent.match(/@Roles\s*\(\s*([^)]+)\s*\)/m) || controllerContent.match(/\/\/\s*Roles:\s*(.+)/m);
  if (rolesMatch && rolesMatch[1]) {
    roles = rolesMatch[1]
      .split(',')
      .map((r) => r.replace(/['"\s]/g, '').trim())
      .filter(Boolean);
  }

  return { ops, hasGuards, roles };
}

/**
 * Generates pristine controller TypeScript file content
 */
function renderControllerContent({
  pascalName,
  kebabName,
  primaryKey = 'id',
  createDtoName,
  updateDtoName,
  responseDtoName,
  ops = { create: true, findAll: true, findOne: true, update: true, remove: true },
  protectWriteOps = false,
  roles = ['ADMIN'],
  guardName = 'JwtAuthGuard',
  guardImportPath = '../../common/guards/jwt-auth.guard',
}) {
  const formattedRoles = roles.map((r) => `'${r}'`).join(', ');
  const guardDecorator = protectWriteOps && roles.length > 0
    ? `\n  @UseGuards(${guardName}, RolesGuard)\n  @Roles(${formattedRoles})`
    : protectWriteOps
    ? `\n  @UseGuards(${guardName})`
    : '';

  const extraGuardsImports = protectWriteOps
    ? `import { ${guardName} } from '${guardImportPath}';\nimport { RolesGuard } from '../../common/guards/roles.guard';\nimport { Roles } from '../../common/decorators/roles.decorator';\n`
    : '';

  const nestCommonImports = ['Controller'];
  if (ops.findAll) nestCommonImports.push('Query');
  if (ops.findOne || ops.update || ops.remove) nestCommonImports.push('Param', 'ParseUUIDPipe', 'HttpStatus');
  if (ops.create) nestCommonImports.push('Post', 'Body');
  if (ops.findAll || ops.findOne) nestCommonImports.push('Get');
  if (ops.update) nestCommonImports.push('Put');
  if (ops.remove) nestCommonImports.push('Delete');
  nestCommonImports.push('Type');
  if (protectWriteOps) nestCommonImports.push('UseGuards');

  return `import { ${Array.from(new Set(nestCommonImports)).join(', ')} } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiExtraModels, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { BaseController, ApiResponseDto, ApiResponseSchema, PaginatedResponseDto, PaginatedResponseSchema, PaginationQueryDto } from '../../common/base';
${extraGuardsImports}import { ${pascalName}Service } from './${kebabName}.service';
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
  @Post()${guardDecorator}
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
  @Get(':${primaryKey}')
  @ApiOperation({ summary: 'Get ${kebabName} by ID' })
  @ApiParam({ name: '${primaryKey}', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, schema: ApiResponseSchema(${responseDtoName}) })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '${pascalName} not found' })
  override async findOne(@Param('${primaryKey}', new ParseUUIDPipe({ version: '4', errorHttpStatusCode: HttpStatus.BAD_REQUEST })) ${primaryKey}: string): Promise<ApiResponseDto<${pascalName}Entity>> {
    return super.findOne(${primaryKey});
  }
` : ''}${ops.update ? `
  @Put(':${primaryKey}')${guardDecorator}
  @ApiOperation({ summary: 'Update ${kebabName} by ID' })
  @ApiParam({ name: '${primaryKey}', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, schema: ApiResponseSchema(${responseDtoName}) })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '${pascalName} not found' })
  override async update(
    @Param('${primaryKey}', new ParseUUIDPipe({ version: '4', errorHttpStatusCode: HttpStatus.BAD_REQUEST })) ${primaryKey}: string,
    @Body() dto: ${updateDtoName}
  ): Promise<ApiResponseDto<${pascalName}Entity>> {
    return super.update(${primaryKey}, dto);
  }
` : ''}${ops.remove ? `
  @Delete(':${primaryKey}')${guardDecorator}
  @ApiOperation({ summary: 'Delete ${kebabName} by ID' })
  @ApiParam({ name: '${primaryKey}', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, schema: ApiResponseSchema(${responseDtoName}) })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '${pascalName} not found' })
  override async remove(@Param('${primaryKey}', new ParseUUIDPipe({ version: '4', errorHttpStatusCode: HttpStatus.BAD_REQUEST })) ${primaryKey}: string): Promise<ApiResponseDto<${pascalName}Entity>> {
    return super.remove(${primaryKey});
  }
` : ''}
}
`;
}

/**
 * Main Interactive Module Configurator Entry Point
 */
async function configureModule(providedModuleName, targetDir = process.cwd()) {
  try {
    const { ensureBaseArchitecture } = require('./moduleGenerator');
    await ensureBaseArchitecture(targetDir);

    let moduleName = providedModuleName;

    if (!moduleName) {
      const nameAnswer = await inquirer.prompt([{
        type: 'input',
        name: 'moduleName',
        message: 'Which module do you want to configure? (e.g., orders, products)',
        validate: (input) => (input && input.trim() ? true : 'Module name is required'),
      }]);
      moduleName = nameAnswer.moduleName.trim();
    }

    const kebabName = toKebabCase(moduleName);
    const pascalName = toPascalCase(moduleName);
    const singularPascal = toSingularPascal(pascalName);

    const srcDir = path.join(targetDir, 'src');
    const moduleDir = (await fs.pathExists(srcDir))
      ? path.join(srcDir, 'modules', kebabName)
      : path.join(targetDir, 'modules', kebabName);
    const controllerPath = path.join(moduleDir, `${kebabName}.controller.ts`);

    if (!(await fs.pathExists(controllerPath))) {
      console.error(chalk.red(`\n❌ Controller for module "${kebabName}" not found at ${controllerPath}`));
      return false;
    }

    const controllerContent = await fs.readFile(controllerPath, 'utf8');
    const { ops: currentOps, hasGuards, roles: currentRoles } = parseExistingController(controllerContent);
    const primaryKey = await detectModulePrimaryKey(moduleDir, kebabName);
    const { guardName, guardImportPath } = await getGuardImportDetails(targetDir);

    const createDtoName = `Create${singularPascal}Dto`;
    const updateDtoName = `Update${singularPascal}Dto`;
    const responseDtoName = `${pascalName}Dto`;

    console.log(chalk.cyan(`\n⚙️  Configuring module: ${chalk.bold(kebabName)}`));

    const { configChoice } = await inquirer.prompt([{
      type: 'list',
      name: 'configChoice',
      message: 'Select configuration action:',
      choices: [
        { name: '🔐 Manage Auth & Roles Guards (POST, PUT, DELETE protection)', value: 'guards' },
        { name: '🛠️  Toggle Active CRUD Operations (Enable/Disable endpoints)', value: 'operations' },
        { name: '🗑️  Delete this CRUD Module (Clean Files & Database Schema)', value: 'delete' },
        { name: '❌ Cancel', value: 'cancel' },
      ],
    }]);

    if (configChoice === 'cancel') {
      console.log(chalk.gray('Cancelled configuration. No files modified.'));
      return true;
    }

    if (configChoice === 'delete') {
      const { removeModule } = require('./moduleRemover');
      return await removeModule(kebabName, targetDir);
    }

    let protectWriteOps = hasGuards;
    let roles = currentRoles.length > 0 ? currentRoles : ['ADMIN'];
    let updatedOps = { ...currentOps };

    if (configChoice === 'guards') {
      const guardAnswer = await inquirer.prompt([{
        type: 'list',
        name: 'protectWriteOps',
        message: 'Protect write operations (POST, PUT, DELETE) with Auth/Roles Guard?',
        choices: [
          { name: 'Yes', value: true },
          { name: 'No', value: false },
        ],
        default: hasGuards,
      }]);

      protectWriteOps = guardAnswer.protectWriteOps;

      if (protectWriteOps) {
        const roleAnswer = await inquirer.prompt([{
          type: 'checkbox',
          name: 'selectedRoles',
          message: 'Select allowed roles for write operations:',
          choices: [
            { name: 'ADMIN', value: 'ADMIN', checked: roles.includes('ADMIN') || roles.length === 0 },
            { name: 'USER', value: 'USER', checked: roles.includes('USER') },
            { name: 'SUPERADMIN', value: 'SUPERADMIN', checked: roles.includes('SUPERADMIN') },
            { name: 'MANAGER', value: 'MANAGER', checked: roles.includes('MANAGER') },
            { name: 'Custom Role...', value: '__custom__' },
          ],
        }]);

        let finalRoles = roleAnswer.selectedRoles.filter((r) => r !== '__custom__');

        if (roleAnswer.selectedRoles.includes('__custom__')) {
          const customRoleAnswer = await inquirer.prompt([{
            type: 'input',
            name: 'customRoles',
            message: 'Enter custom role name(s) (comma-separated, e.g., AUDITOR, EDITOR):',
            validate: (input) => (input && input.trim() ? true : 'Custom role is required'),
          }]);

          const parsedCustom = customRoleAnswer.customRoles
            .split(',')
            .map((r) => r.trim().toUpperCase())
            .filter(Boolean);

          finalRoles = Array.from(new Set([...finalRoles, ...parsedCustom]));
        }

        roles = finalRoles.length > 0 ? finalRoles : ['ADMIN'];
      }
    } else if (configChoice === 'operations') {
      const opsAnswer = await inquirer.prompt([{
        type: 'checkbox',
        name: 'activeOps',
        message: 'Select active CRUD operations:',
        choices: [
          { name: 'Create (POST)', value: 'create', checked: currentOps.create },
          { name: 'Read All / findAll (GET)', value: 'findAll', checked: currentOps.findAll },
          { name: 'Read One / findOne (GET /:id)', value: 'findOne', checked: currentOps.findOne },
          { name: 'Update (PUT /:id)', value: 'update', checked: currentOps.update },
          { name: 'Delete / remove (DELETE /:id)', value: 'remove', checked: currentOps.remove },
        ],
      }]);

      updatedOps = {
        create: opsAnswer.activeOps.includes('create'),
        findAll: opsAnswer.activeOps.includes('findAll'),
        findOne: opsAnswer.activeOps.includes('findOne'),
        update: opsAnswer.activeOps.includes('update'),
        remove: opsAnswer.activeOps.includes('remove'),
      };
    }

    const updatedController = renderControllerContent({
      pascalName,
      kebabName,
      primaryKey,
      createDtoName,
      updateDtoName,
      responseDtoName,
      ops: updatedOps,
      protectWriteOps,
      roles,
      guardName,
      guardImportPath,
    });

    await fs.writeFile(controllerPath, updatedController, 'utf8');
    console.log(chalk.green(`\n✅ Successfully updated module configuration for "${kebabName}"!`));
    console.log(chalk.gray(`   Controller: ${path.relative(process.cwd(), controllerPath)}`));
    if (protectWriteOps) {
      console.log(chalk.gray(`   Protected Write Ops: ${roles.join(', ')}`));
    } else {
      console.log(chalk.gray(`   Protected Write Ops: Disabled`));
    }
    const activeOpsList = Object.keys(updatedOps).filter((op) => updatedOps[op]);
    console.log(chalk.gray(`   Active Operations: ${activeOpsList.join(', ')}`));

    return true;
  } catch (error) {
    console.error(chalk.red('\n❌ Module configuration failed:'), error.message);
    return false;
  }
}

module.exports = { configureModule, renderControllerContent };
