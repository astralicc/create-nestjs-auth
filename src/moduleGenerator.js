/**
 * Shared Interactive Module Generator for create-nestjs-auth
 * @module moduleGenerator
 */

const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { detectPackageManager, getRunPrefix } = require('./utils');

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
 * Ensures src/common/base, src/common/guards, and src/common/decorators exist with required abstract classes, DTOs, guards & decorators
 */
async function ensureBaseArchitecture(targetDir) {
  try {
    const commonBaseDir = path.join(targetDir, 'src', 'common', 'base');
    const commonGuardsDir = path.join(targetDir, 'src', 'common', 'guards');
    const commonDecoratorsDir = path.join(targetDir, 'src', 'common', 'decorators');

    if (!(await fs.pathExists(commonBaseDir))) {
      const templateBaseDir = path.join(__dirname, '..', 'templates', 'base-crud', 'src', 'common', 'base');
      if (await fs.pathExists(templateBaseDir)) {
        await fs.copy(templateBaseDir, commonBaseDir);
        console.log(chalk.green('   ✓ Scaffolded Base CRUD architecture at src/common/base'));
      }
    }

    // Scaffold Guards if missing
    await fs.ensureDir(commonGuardsDir);
    const jwtGuardPath = path.join(commonGuardsDir, 'jwt-auth.guard.ts');
    const authGuardPath = path.join(commonGuardsDir, 'auth.guard.ts');
    const rolesGuardPath = path.join(commonGuardsDir, 'roles.guard.ts');

    if (!(await fs.pathExists(jwtGuardPath)) && !(await fs.pathExists(authGuardPath))) {
      const jwtGuardContent = `import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    return true;
  }
}
`;
      await fs.writeFile(jwtGuardPath, jwtGuardContent, 'utf8');
      console.log(chalk.green('   ✓ Scaffolded JwtAuthGuard at src/common/guards/jwt-auth.guard.ts'));
    }

    if (!(await fs.pathExists(rolesGuardPath))) {
      const rolesGuardContent = `import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    return true;
  }
}
`;
      await fs.writeFile(rolesGuardPath, rolesGuardContent, 'utf8');
      console.log(chalk.green('   ✓ Scaffolded RolesGuard at src/common/guards/roles.guard.ts'));
    }

    // Scaffold Decorators if missing
    await fs.ensureDir(commonDecoratorsDir);
    const rolesDecoratorPath = path.join(commonDecoratorsDir, 'roles.decorator.ts');

    if (!(await fs.pathExists(rolesDecoratorPath))) {
      const rolesDecoratorContent = `import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
`;
      await fs.writeFile(rolesDecoratorPath, rolesDecoratorContent, 'utf8');
      console.log(chalk.green('   ✓ Scaffolded Roles decorator at src/common/decorators/roles.decorator.ts'));
    }
  } catch (error) {
    console.warn(chalk.yellow(`   ⚠️ Could not scaffold Base CRUD architecture: ${error.message}`));
  }
}

/**
 * Returns field type choices based on ORM
 */
function getOrmFieldChoices(orm) {
  switch (orm) {
    case 'typeorm':
      return ['varchar', 'text', 'int', 'float', 'decimal', 'boolean', 'timestamp', 'json'];
    case 'mongoose':
      return ['String', 'Number', 'Boolean', 'Date', 'Array', 'Object'];
    case 'drizzle':
      return ['varchar', 'text', 'integer', 'numeric', 'boolean', 'timestamp', 'json'];
    case 'prisma':
    default:
      return ['String', 'Int', 'Float', 'Decimal', 'Boolean', 'DateTime', 'Json'];
  }
}

/**
 * Helper to map field type to TypeScript type, validator decorators, and sample example value
 */
function getFieldDetails(fieldType) {
  const ft = fieldType;

  if (['String', 'varchar', 'text'].includes(ft)) {
    return { tsType: 'string', valDecorators: ['@IsString()'], ex: 'Sample value' };
  }
  if (['Int', 'int', 'integer'].includes(ft)) {
    return { tsType: 'number', valDecorators: ['@IsInt()'], ex: 10 };
  }
  if (['Float', 'Decimal', 'float', 'decimal', 'numeric', 'Number'].includes(ft)) {
    return { tsType: 'number', valDecorators: ['@IsNumber()'], ex: 99.99 };
  }
  if (['Boolean', 'boolean'].includes(ft)) {
    return { tsType: 'boolean', valDecorators: ['@IsBoolean()'], ex: true };
  }
  if (['DateTime', 'timestamp', 'Date'].includes(ft)) {
    return {
      tsType: 'Date',
      valDecorators: ['@IsDate()', '@Type(() => Date)'],
      ex: '2025-01-01T00:00:00.000Z',
    };
  }
  if (['Json', 'json', 'Object'].includes(ft)) {
    return { tsType: 'object', valDecorators: ['@IsObject()'], ex: { key: 'value' } };
  }
  if (ft === 'Array') {
    return { tsType: 'string[]', valDecorators: ['@IsArray()'], ex: ['item1', 'item2'] };
  }
  return { tsType: 'string', valDecorators: ['@IsString()'], ex: 'Sample value' };
}

/**
 * Interactive prompt for module options (Name, CRUD Mode, PK, Fields, Relations, Auth Guards)
 */
async function promptForModuleOptions(providedModuleName, detectedOrm = 'prisma', targetDir = process.cwd()) {
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

  const kebabName = toKebabCase(moduleName);
  const srcDir = path.join(targetDir, 'src');
  const moduleDir = (await fs.pathExists(srcDir))
    ? path.join(srcDir, 'modules', kebabName)
    : path.join(targetDir, 'modules', kebabName);

  if (await fs.pathExists(moduleDir)) {
    const relPath = path.relative(targetDir, moduleDir);
    console.log(chalk.red(`\n❌ Module "${kebabName}" already exists at ${relPath}!`));
    console.log(chalk.gray(`   💡 Use "speedrun-cli field ${kebabName}" (alias: f) to add or edit fields.`));
    console.log(chalk.gray(`   💡 Use "speedrun-cli config ${kebabName}" (alias: c) to configure guards & routes.\n`));
    console.log(chalk.yellow(`Module generation cancelled because "${kebabName}" already exists.\n`));
    return null;
  }

  const pascalName = toPascalCase(moduleName);
  const singularPascal = toSingularPascal(pascalName);
  const singularSnake = toSnakeCase(singularPascal);
  const singularCamel = toSingularCamel(kebabName);

  // CRUD mode selection
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

  // 1. Primary Key Selection
  const { pkChoice } = await inquirer.prompt([{
    type: 'list',
    name: 'pkChoice',
    message: `Select primary key format for '${moduleName}':`,
    choices: [
      { name: 'id (Default UUID)', value: 'id' },
      { name: `${singularSnake}_id (e.g., ${singularSnake}_id)`, value: `${singularSnake}_id` },
      { name: `${singularCamel}Id (e.g., ${singularCamel}Id)`, value: `${singularCamel}Id` },
      { name: 'Custom Primary Key Name...', value: 'custom' },
    ],
    default: 'id',
  }]);

  let primaryKey = pkChoice;
  if (pkChoice === 'custom') {
    const { customPk } = await inquirer.prompt([{
      type: 'input',
      name: 'customPk',
      message: 'Enter custom primary key name:',
      default: 'id',
      validate: (input) => (input && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(input.trim()) ? true : 'Invalid identifier for primary key'),
    }]);
    primaryKey = customPk.trim();
  }

  // 2. Interactive Field Builder Loop
  const fields = [];
  const ormTypeChoices = getOrmFieldChoices(detectedOrm);

  const { addCustomFields } = await inquirer.prompt([{
    type: 'list',
    name: 'addCustomFields',
    message: `Do you want to add custom fields to '${moduleName}'?`,
    choices: [
      { name: 'Yes', value: true },
      { name: 'No', value: false },
    ],
    default: true,
  }]);

  if (addCustomFields) {
    let managingFields = true;
    while (managingFields) {
      if (fields.length > 0) {
        console.log(chalk.cyan(`\n📋 Current fields for '${moduleName}':`));
        fields.forEach((f, idx) => {
          console.log(chalk.gray(`   ${idx + 1}. ${f.name}: ${f.type} (${f.isOptional ? 'Optional' : 'Required'})`));
        });
        console.log('');

        const { fieldAction } = await inquirer.prompt([{
          type: 'list',
          name: 'fieldAction',
          message: 'Choose an action:',
          choices: [
            { name: '➕ Add another field', value: 'add' },
            { name: '✏️ Edit an existing field', value: 'edit' },
            { name: '🗑️ Delete a field', value: 'delete' },
            { name: '✅ Finish defining fields', value: 'finish' },
          ],
        }]);

        if (fieldAction === 'finish') {
          managingFields = false;
          break;
        }

        if (fieldAction === 'delete') {
          const { fieldToDelete } = await inquirer.prompt([{
            type: 'list',
            name: 'fieldToDelete',
            message: 'Select field to delete:',
            choices: fields.map((f, i) => ({ name: `${f.name} (${f.type})`, value: i })),
          }]);
          const removed = fields.splice(fieldToDelete, 1);
          console.log(chalk.yellow(`   Removed field '${removed[0].name}'`));
          continue;
        }

        if (fieldAction === 'edit') {
          const { fieldToEditIndex } = await inquirer.prompt([{
            type: 'list',
            name: 'fieldToEditIndex',
            message: 'Select field to edit:',
            choices: fields.map((f, i) => ({ name: `${f.name}: ${f.type} (${f.isOptional ? 'Optional' : 'Required'})`, value: i })),
          }]);

          const targetField = fields[fieldToEditIndex];

          const { editPropChoice } = await inquirer.prompt([{
            type: 'list',
            name: 'editPropChoice',
            message: `Select property to edit for '${targetField.name}':`,
            choices: [
              { name: '1. Change Field Name', value: 'name' },
              { name: '2. Change Field Type', value: 'type' },
              { name: '3. Change Optional Status', value: 'optional' },
              { name: '4. Edit All Properties', value: 'all' },
            ],
          }]);

          if (editPropChoice === 'name' || editPropChoice === 'all') {
            const { newName } = await inquirer.prompt([{
              type: 'input',
              name: 'newName',
              message: 'Enter field name:',
              default: targetField.name,
              validate: (input) => (input && /^[a-zA-Z][a-zA-Z0-9_]*$/.test(input.trim()) ? true : 'Field name must be a valid identifier'),
            }]);
            targetField.name = newName.trim();
          }

          if (editPropChoice === 'type' || editPropChoice === 'all') {
            const { newType } = await inquirer.prompt([{
              type: 'list',
              name: 'newType',
              message: `Select field type for '${targetField.name}':`,
              choices: ormTypeChoices,
              default: targetField.type,
            }]);
            targetField.type = newType;
          }

          if (editPropChoice === 'optional' || editPropChoice === 'all') {
            const { newOpt } = await inquirer.prompt([{
              type: 'list',
              name: 'newOpt',
              message: `Is '${targetField.name}' optional?`,
              choices: [
                { name: 'Yes', value: true },
                { name: 'No', value: false },
              ],
              default: targetField.isOptional,
            }]);
            targetField.isOptional = newOpt;
          }

          console.log(chalk.green(`   ✓ Updated field '${targetField.name}'`));
          continue;
        }
      }

      // Add field path
      const fieldAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'fieldName',
          message: 'Enter field name (e.g., totalAmount, title):',
          validate: (input) => {
            if (!input || !input.trim()) return 'Field name is required';
            const name = input.trim();
            if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
              return 'Field name must be a valid identifier (e.g., totalAmount)';
            }
            if (name === primaryKey) {
              return `Primary key '${primaryKey}' is already defined. Please choose another field name.`;
            }
            if (['id', 'status', 'createdAt', 'updatedAt', 'deletedAt'].includes(name)) {
              return `Field '${name}' is a system field. Please choose another field name.`;
            }
            if (fields.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
              return `Field '${name}' already exists in module '${moduleName}'. Please choose a different name.`;
            }
            return true;
          },
        },
        {
          type: 'list',
          name: 'fieldType',
          message: (ans) => `Select field type for '${ans.fieldName}':`,
          choices: ormTypeChoices,
          default: ormTypeChoices[0],
        },
        {
          type: 'list',
          name: 'isOptional',
          message: (ans) => `Is '${ans.fieldName}' optional?`,
          choices: [
            { name: 'Yes', value: true },
            { name: 'No', value: false },
          ],
          default: false,
        },
      ]);

      fields.push({
        name: fieldAnswers.fieldName.trim(),
        type: fieldAnswers.fieldType,
        isOptional: fieldAnswers.isOptional,
      });

      if (fields.length === 1) {
        const { continueLoop } = await inquirer.prompt([{
          type: 'list',
          name: 'continueLoop',
          message: 'Do you want to add another field?',
          choices: [
            { name: 'Yes', value: true },
            { name: 'No', value: false },
          ],
          default: false,
        }]);
        if (!continueLoop) {
          managingFields = false;
        }
      }
    }
  }

  // Fallback if no custom fields added
  if (fields.length === 0) {
    fields.push({ name: 'name', type: ormTypeChoices[0] || 'String', isOptional: false });
  }

  // 3. Relationships Prompt
  const relations = [];
  const { addRelation } = await inquirer.prompt([{
    type: 'list',
    name: 'addRelation',
    message: 'Do you want to add a relation to another module?',
    choices: [
      { name: 'Yes', value: true },
      { name: 'No', value: false },
    ],
    default: false,
  }]);

  if (addRelation) {
    let addingRel = true;
    while (addingRel) {
      const relAnswers = await inquirer.prompt([
        {
          type: 'list',
          name: 'relType',
          message: 'Select relation type:',
          choices: [
            { name: 'Many-to-One (e.g. Order belongs to User)', value: 'Many-to-One' },
            { name: 'One-to-Many', value: 'One-to-Many' },
          ],
        },
        {
          type: 'input',
          name: 'targetModule',
          message: 'Target module name (e.g., users, categories):',
          validate: (input) => (input && input.trim() ? true : 'Target module name is required'),
        },
        {
          type: 'input',
          name: 'fkField',
          message: (ans) => `Foreign key field name (e.g., ${toSingularCamel(ans.targetModule)}Id):`,
          default: (ans) => `${toSingularCamel(ans.targetModule)}Id`,
        },
      ]);

      relations.push({
        type: relAnswers.relType,
        targetModule: relAnswers.targetModule.trim(),
        fkField: relAnswers.fkField.trim(),
      });

      const { continueRel } = await inquirer.prompt([{
        type: 'list',
        name: 'continueRel',
        message: 'Do you want to add another relation?',
        choices: [
          { name: 'Yes', value: true },
          { name: 'No', value: false },
        ],
        default: false,
      }]);
      addingRel = continueRel;
    }
  }

  // 4. Status Field Prompt
  const { includeStatus } = await inquirer.prompt([{
    type: 'list',
    name: 'includeStatus',
    message: "Include default 'status' field (e.g. ACTIVE)?",
    choices: [
      { name: 'Yes', value: true },
      { name: 'No', value: false },
    ],
    default: true,
  }]);

  // 5. Role & Auth Guard Protection Prompt
  const { protectWriteOps } = await inquirer.prompt([{
    type: 'list',
    name: 'protectWriteOps',
    message: 'Protect write operations (POST, PUT, DELETE) with Auth/Roles Guard?',
    choices: [
      { name: 'Yes', value: true },
      { name: 'No', value: false },
    ],
    default: true,
  }]);

  let selectedRoles = [];
  if (protectWriteOps) {
    const { roles } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'roles',
      message: 'Select allowed roles:',
      choices: [
        { name: 'ADMIN', value: 'ADMIN', checked: true },
        { name: 'USER', value: 'USER' },
        { name: 'MANAGER', value: 'MANAGER' },
      ],
    }]);
    selectedRoles = roles.length > 0 ? roles : ['ADMIN'];
  }

  return {
    moduleName,
    operations: selectedOperations,
    primaryKey,
    fields,
    relations,
    includeStatus,
    protectWriteOps,
    roles: selectedRoles,
  };
}

function getFieldExampleValue(field, pascalName) {
  const details = getFieldDetails(field.type);
  const name = field.name.toLowerCase();

  if (details.tsType === 'string') {
    if (name.includes('email')) return 'user@example.com';
    if (name.includes('phone')) return '+1234567890';
    if (name.includes('url')) return 'https://example.com';
    if (name.includes('sku') || name.includes('code')) return 'SKU-1001';
    return `Sample ${field.name}`;
  }
  return details.ex;
}

/**
 * Dynamic ORM Schema Synchronization: Prisma
 * @param {boolean} forceUpdate - When true, replace existing model block instead of skipping
 */
async function syncPrismaSchema(targetDir, singularPascal, kebabName, primaryKey, fields, relations, includeStatus = true, forceUpdate = false) {
  try {
    const schemaPath = path.join(targetDir, 'prisma', 'schema.prisma');
    if (!(await fs.pathExists(schemaPath))) return;

    let content = await fs.readFile(schemaPath, 'utf8');

    const modelRegex = new RegExp(`(\\bmodel\\s+${singularPascal}\\s*\\{[^}]*\\})`, 's');
    const modelExists = modelRegex.test(content);

    if (modelExists && !forceUpdate) {
      return;
    }

    const fieldLines = fields.map((f) => {
      let pType = 'String';
      if (['Int', 'int', 'integer'].includes(f.type)) pType = 'Int';
      else if (['Float', 'float'].includes(f.type)) pType = 'Float';
      else if (['Decimal', 'decimal', 'numeric'].includes(f.type)) pType = 'Decimal';
      else if (['Boolean', 'boolean'].includes(f.type)) pType = 'Boolean';
      else if (['DateTime', 'timestamp', 'Date'].includes(f.type)) pType = 'DateTime';
      else if (['Json', 'json', 'Object'].includes(f.type)) pType = 'Json';

      return `  ${f.name}  ${pType}${f.isOptional ? '?' : ''}`;
    });

    const relLines = relations.map((r) => {
      const targetPascal = toSingularPascal(toPascalCase(r.targetModule));
      const targetCamel = toSingularCamel(r.targetModule);
      return `  ${targetCamel}  ${targetPascal}? @relation(fields: [${r.fkField}], references: [id])\n  ${r.fkField}  String?`;
    });

    const statusLine = includeStatus ? '  status    String   @default("ACTIVE")\n' : '';

    const modelDefinition = `
model ${singularPascal} {
  ${primaryKey}  String   @id @default(uuid())
${fieldLines.join('\n')}
${relLines.length > 0 ? relLines.join('\n') + '\n' : ''}${statusLine}  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?

  @@map("${toSnakeCase(kebabName)}")
}
`;

    if (modelExists && forceUpdate) {
      content = content.replace(modelRegex, modelDefinition.trim());
      console.log(chalk.green(`   ✓ Updated existing Prisma model ${singularPascal} in schema.prisma`));
    } else {
      content += modelDefinition;
      console.log(chalk.green(`   ✓ Added Prisma model ${singularPascal} to schema.prisma`));
    }

    await fs.writeFile(schemaPath, content, 'utf8');
  } catch (error) {
    console.warn(chalk.yellow(`   ⚠️ Could not sync prisma/schema.prisma: ${error.message}`));
  }
}

/**
 * Dynamic ORM Schema Synchronization: TypeORM
 */
async function syncTypeOrmSchema(moduleDir, singularPascal, kebabName, primaryKey, fields, relations, includeStatus = true) {
  try {
    const entityDir = path.join(moduleDir, 'entities');
    await fs.ensureDir(entityDir);
    const entityPath = path.join(entityDir, `${toSingularKebab(kebabName)}.entity.ts`);

    const fieldLines = fields.map((f) => {
      const details = getFieldDetails(f.type);
      let colDecorator = `@Column({ nullable: ${f.isOptional} })`;

      if (['decimal', 'numeric', 'Decimal'].includes(f.type)) {
        colDecorator = `@Column('decimal', { precision: 10, scale: 2, nullable: ${f.isOptional} })`;
      } else if (['boolean', 'Boolean'].includes(f.type)) {
        colDecorator = `@Column({ default: false, nullable: ${f.isOptional} })`;
      } else if (['timestamp', 'DateTime', 'Date'].includes(f.type)) {
        colDecorator = `@Column({ type: 'timestamp', nullable: ${f.isOptional} })`;
      } else if (['json', 'Json', 'Object'].includes(f.type)) {
        colDecorator = `@Column({ type: 'json', nullable: ${f.isOptional} })`;
      } else if (['text'].includes(f.type)) {
        colDecorator = `@Column({ type: 'text', nullable: ${f.isOptional} })`;
      }

      return `  ${colDecorator}\n  ${f.name}${f.isOptional ? '?' : ''}: ${details.tsType};`;
    });

    const relLines = relations.map((r) => {
      const targetPascal = toSingularPascal(toPascalCase(r.targetModule));
      const targetCamel = toSingularCamel(r.targetModule);
      return `  @ManyToOne(() => ${targetPascal}, { nullable: true })\n  @JoinColumn({ name: '${r.fkField}' })\n  ${targetCamel}?: any;\n\n  @Column({ nullable: true })\n  ${r.fkField}?: string;`;
    });

    const hasRelations = relations.length > 0;
    const imports = [`Entity`, `PrimaryGeneratedColumn`, `Column`, `CreateDateColumn`, `UpdateDateColumn`, `DeleteDateColumn`].concat(hasRelations ? [`ManyToOne`, `JoinColumn`] : []);

    const statusLine = includeStatus ? '  @Column({ default: \'ACTIVE\' })\n  status: string;\n\n' : '';

    const entityContent = `import { ${imports.join(', ')} } from 'typeorm';

@Entity('${toSnakeCase(kebabName)}')
export class ${singularPascal} {
  @PrimaryGeneratedColumn('uuid')
  ${primaryKey}: string;

${fieldLines.join('\n\n')}

${relLines.length > 0 ? relLines.join('\n\n') + '\n\n' : ''}${statusLine}  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date | null;
}
`;

    await fs.writeFile(entityPath, entityContent, 'utf8');
    console.log(chalk.green(`   ✓ Generated TypeORM entity at src/modules/${kebabName}/entities/${toSingularKebab(kebabName)}.entity.ts`));
  } catch (error) {
    console.warn(chalk.yellow(`   ⚠️ Could not generate TypeORM entity: ${error.message}`));
  }
}

/**
 * Dynamic ORM Schema Synchronization: Mongoose
 */
async function syncMongooseSchema(moduleDir, singularPascal, kebabName, primaryKey, fields, relations, includeStatus = true) {
  try {
    const schemaDir = path.join(moduleDir, 'schemas');
    await fs.ensureDir(schemaDir);
    const schemaPath = path.join(schemaDir, `${toSingularKebab(kebabName)}.schema.ts`);

    const fieldLines = fields.map((f) => {
      const details = getFieldDetails(f.type);
      let propDecorator = `@Prop({ required: ${!f.isOptional} })`;

      if (['boolean', 'Boolean'].includes(f.type)) {
        propDecorator = `@Prop({ default: false })`;
      } else if (['timestamp', 'DateTime', 'Date'].includes(f.type)) {
        propDecorator = `@Prop({ type: Date, required: ${!f.isOptional} })`;
      } else if (['json', 'Json', 'Object'].includes(f.type)) {
        propDecorator = `@Prop({ type: Object, required: ${!f.isOptional} })`;
      } else if (f.type === 'Array') {
        propDecorator = `@Prop({ type: [String], default: [] })`;
      }

      return `  ${propDecorator}\n  ${f.name}${f.isOptional ? '?' : ''}: ${details.tsType};`;
    });

    const relLines = relations.map((r) => {
      const targetPascal = toSingularPascal(toPascalCase(r.targetModule));
      return `  @Prop({ type: SchemaTypes.ObjectId, ref: '${targetPascal}', default: null })\n  ${r.fkField}?: string;`;
    });

    const pkLine = primaryKey !== 'id'
      ? `  @Prop({ default: () => new Types.ObjectId().toString() })\n  ${primaryKey}: string;\n\n`
      : '';

    const statusLine = includeStatus ? '  @Prop({ default: \'ACTIVE\' })\n  status: string;\n\n' : '';

    const schemaContent = `import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type ${singularPascal}Document = HydratedDocument<${singularPascal}>;

@Schema({ timestamps: true })
export class ${singularPascal} {
${pkLine}${fieldLines.join('\n\n')}

${relLines.length > 0 ? relLines.join('\n\n') + '\n\n' : ''}${statusLine}  @Prop({ type: Date, default: null })
  deletedAt?: Date | null;
}

export const ${singularPascal}Schema = SchemaFactory.createForClass(${singularPascal});
`;

    await fs.writeFile(schemaPath, schemaContent, 'utf8');
    console.log(chalk.green(`   ✓ Generated Mongoose schema at src/modules/${kebabName}/schemas/${toSingularKebab(kebabName)}.schema.ts`));
  } catch (error) {
    console.warn(chalk.yellow(`   ⚠️ Could not generate Mongoose schema: ${error.message}`));
  }
}

/**
 * Dynamic ORM Schema Synchronization: Drizzle
 */
async function syncDrizzleSchema(moduleDir, singularPascal, kebabName, primaryKey, fields, relations, includeStatus = true) {
  try {
    const schemaDir = path.join(moduleDir, 'schema');
    await fs.ensureDir(schemaDir);
    const schemaPath = path.join(schemaDir, `${kebabName}.schema.ts`);

    const fieldLines = fields.map((f) => {
      let colDef = `varchar('${toSnakeCase(f.name)}', { length: 255 })`;
      if (['int', 'integer', 'Int'].includes(f.type)) {
        colDef = `integer('${toSnakeCase(f.name)}')`;
      } else if (['float', 'decimal', 'numeric', 'Float', 'Decimal', 'Number'].includes(f.type)) {
        colDef = `numeric('${toSnakeCase(f.name)}')`;
      } else if (['boolean', 'Boolean'].includes(f.type)) {
        colDef = `boolean('${toSnakeCase(f.name)}').default(false)`;
      } else if (['timestamp', 'DateTime', 'Date'].includes(f.type)) {
        colDef = `timestamp('${toSnakeCase(f.name)}')`;
      } else if (['json', 'Json', 'Object'].includes(f.type)) {
        colDef = `json('${toSnakeCase(f.name)}')`;
      } else if (f.type === 'text') {
        colDef = `text('${toSnakeCase(f.name)}')`;
      }

      if (!f.isOptional) {
        colDef += '.notNull()';
      }

      return `  ${f.name}: ${colDef},`;
    });

    const relLines = relations.map((r) => {
      return `  ${r.fkField}: varchar('${toSnakeCase(r.fkField)}', { length: 36 }),`;
    });

    const statusLine = includeStatus ? "  status: varchar('status', { length: 50 }).default('ACTIVE').notNull(),\n" : '';

    const schemaContent = `import { pgTable, varchar, text, integer, numeric, boolean, timestamp, json } from 'drizzle-orm/pg-core';

export const ${toCamelCase(kebabName)}s = pgTable('${toSnakeCase(kebabName)}', {
  ${primaryKey}: varchar('${toSnakeCase(primaryKey)}', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
${fieldLines.join('\n')}
${relLines.length > 0 ? relLines.join('\n') + '\n' : ''}${statusLine}  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export type ${singularPascal} = typeof ${toCamelCase(kebabName)}s.$inferSelect;
export type New${singularPascal} = typeof ${toCamelCase(kebabName)}s.$inferInsert;
`;

    await fs.writeFile(schemaPath, schemaContent, 'utf8');
    console.log(chalk.green(`   ✓ Generated Drizzle schema at src/modules/${kebabName}/schema/${kebabName}.schema.ts`));
  } catch (error) {
    console.warn(chalk.yellow(`   ⚠️ Could not generate Drizzle schema: ${error.message}`));
  }
}

/**
 * Auto-Generate Starter Seed File Template
 */
async function generateSeedFileTemplate(targetDir, orm, singularPascal, kebabName, primaryKey, fields, includeStatus = true) {
  try {
    const singularCamel = toSingularCamel(kebabName);
    const dummyObjFields = fields.map((f) => {
      const ex = getFieldExampleValue(f, singularPascal);
      const valStr = typeof ex === 'string' ? `'${ex}'` : JSON.stringify(ex);
      return `      ${f.name}: ${valStr},`;
    }).join('\n');

    const statusProp = includeStatus ? '\n      status: \'ACTIVE\',' : '';

    if (orm === 'prisma') {
      const seedsDir = path.join(targetDir, 'prisma', 'seeds');
      await fs.ensureDir(seedsDir);
      const seedPath = path.join(seedsDir, `${kebabName}.seed.ts`);

      const seedContent = `import { PrismaClient } from '@prisma/client';

export async function seed${singularPascal}(prisma: PrismaClient) {
  console.log('🌱 Seeding ${singularPascal}...');
  await (prisma as any).${singularCamel}.create({
    data: {
${dummyObjFields}${statusProp}
    },
  });
}
`;
      await fs.writeFile(seedPath, seedContent, 'utf8');
      console.log(chalk.green(`   ✓ Generated Prisma seed template at prisma/seeds/${kebabName}.seed.ts`));
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
      console.log(chalk.green(`   ✓ Generated seed template at src/database/seeds/${kebabName}.seed.ts`));
    }
  } catch (error) {
    console.warn(chalk.yellow(`   ⚠️ Could not generate seed template: ${error.message}`));
  }
}

function getServiceContent(orm, pascalName, singularPascal, camelName, kebabName, primaryKey, createDtoName, updateDtoName, ops) {
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

  ${ops.findOne ? `async findOne(${primaryKey}: string): Promise<${pascalName}Entity | null> {
    return this.repo.findOne({ where: { ${primaryKey}, deletedAt: IsNull() } as any });
  }` : `async findOne(${primaryKey}: string): Promise<${pascalName}Entity | null> { throw new Error('Not implemented'); }`}

  ${ops.update ? `async update(${primaryKey}: string, dto: ${updateDtoName}): Promise<${pascalName}Entity> {
    await this.repo.update({ ${primaryKey} } as any, dto as any);
    return this.repo.findOneOrFail({ where: { ${primaryKey} } as any });
  }` : `async update(${primaryKey}: string, dto: ${updateDtoName}): Promise<${pascalName}Entity> { throw new Error('Not implemented'); }`}

  ${ops.remove ? `async remove(${primaryKey}: string): Promise<${pascalName}Entity> {
    const entity = await this.repo.findOneOrFail({ where: { ${primaryKey} } as any });
    entity.deletedAt = new Date();
    return this.repo.save(entity);
  }` : `async remove(${primaryKey}: string): Promise<${pascalName}Entity> { throw new Error('Not implemented'); }`}
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

  ${ops.findOne ? `async findOne(${primaryKey}: string): Promise<${pascalName}Entity | null> {
    return this.model.findOne({ ${primaryKey === 'id' ? '_id' : primaryKey}: ${primaryKey}, deletedAt: null }).exec();
  }` : `async findOne(${primaryKey}: string): Promise<${pascalName}Entity | null> { throw new Error('Not implemented'); }`}

  ${ops.update ? `async update(${primaryKey}: string, dto: ${updateDtoName}): Promise<${pascalName}Entity> {
    return this.model.findOneAndUpdate({ ${primaryKey === 'id' ? '_id' : primaryKey}: ${primaryKey} }, dto as any, { new: true }).exec() as Promise<${pascalName}Entity>;
  }` : `async update(${primaryKey}: string, dto: ${updateDtoName}): Promise<${pascalName}Entity> { throw new Error('Not implemented'); }`}

  ${ops.remove ? `async remove(${primaryKey}: string): Promise<${pascalName}Entity> {
    return this.model.findOneAndUpdate({ ${primaryKey === 'id' ? '_id' : primaryKey}: ${primaryKey} }, { deletedAt: new Date() }, { new: true }).exec() as Promise<${pascalName}Entity>;
  }` : `async remove(${primaryKey}: string): Promise<${pascalName}Entity> { throw new Error('Not implemented'); }`}
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

  ${ops.findOne ? `async findOne(${primaryKey}: string): Promise<${pascalName}Entity | null> {
    const [result] = await this.db.select().from(${camelName}s)
      .where(eq(${camelName}s.${primaryKey}, ${primaryKey}));
    return result || null;
  }` : `async findOne(${primaryKey}: string): Promise<${pascalName}Entity | null> { throw new Error('Not implemented'); }`}

  ${ops.update ? `async update(${primaryKey}: string, dto: ${updateDtoName}): Promise<${pascalName}Entity> {
    const [result] = await this.db.update(${camelName}s).set(dto).where(eq(${camelName}s.${primaryKey}, ${primaryKey})).returning();
    return result;
  }` : `async update(${primaryKey}: string, dto: ${updateDtoName}): Promise<${pascalName}Entity> { throw new Error('Not implemented'); }`}

  ${ops.remove ? `async remove(${primaryKey}: string): Promise<${pascalName}Entity> {
    const [result] = await this.db.update(${camelName}s).set({ deletedAt: new Date() }).where(eq(${camelName}s.${primaryKey}, ${primaryKey})).returning();
    return result;
  }` : `async remove(${primaryKey}: string): Promise<${pascalName}Entity> { throw new Error('Not implemented'); }`}
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

  ${ops.findOne ? `async findOne(${primaryKey}: string): Promise<${pascalName}Entity | null> {
    return (this.prisma as any).${singularCamel}.findFirst({ where: { ${primaryKey}, deletedAt: null } });
  }` : `async findOne(${primaryKey}: string): Promise<${pascalName}Entity | null> { throw new Error('Not implemented'); }`}

  ${ops.update ? `async update(${primaryKey}: string, dto: ${updateDtoName}): Promise<${pascalName}Entity> {
    return (this.prisma as any).${singularCamel}.update({ where: { ${primaryKey} }, data: dto });
  }` : `async update(${primaryKey}: string, dto: ${updateDtoName}): Promise<${pascalName}Entity> { throw new Error('Not implemented'); }`}

  ${ops.remove ? `async remove(${primaryKey}: string): Promise<${pascalName}Entity> {
    return (this.prisma as any).${singularCamel}.update({ where: { ${primaryKey} }, data: { deletedAt: new Date() } });
  }` : `async remove(${primaryKey}: string): Promise<${pascalName}Entity> { throw new Error('Not implemented'); }`}
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
    // 0. Ensure Base Architecture exists at src/common/base
    await ensureBaseArchitecture(targetDir);

    // Detect ORM first so prompt choices match
    const orm = specifiedOrm || (await detectOrm(targetDir));

    const options = await promptForModuleOptions(providedModuleName, orm, targetDir);
    if (!options) return false;

    const kebabName = toKebabCase(options.moduleName);
    const pascalName = toPascalCase(options.moduleName);
    const camelName = toCamelCase(options.moduleName);
    const singularPascal = toSingularPascal(pascalName);
    const primaryKey = options.primaryKey || 'id';

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
      await syncPrismaSchema(targetDir, singularPascal, kebabName, primaryKey, options.fields, options.relations, options.includeStatus);
    } else if (orm === 'typeorm') {
      await syncTypeOrmSchema(moduleDir, singularPascal, kebabName, primaryKey, options.fields, options.relations, options.includeStatus);
    } else if (orm === 'mongoose') {
      await syncMongooseSchema(moduleDir, singularPascal, kebabName, primaryKey, options.fields, options.relations, options.includeStatus);
    } else if (orm === 'drizzle') {
      await syncDrizzleSchema(moduleDir, singularPascal, kebabName, primaryKey, options.fields, options.relations, options.includeStatus);
    }

    // 2. Generate DTOs
    const createDtoName = `Create${singularPascal}Dto`;
    const updateDtoName = `Update${singularPascal}Dto`;
    const responseDtoName = `${pascalName}Dto`;

    const createFieldsText = options.fields.map((f) => {
      const details = getFieldDetails(f.type);
      const ex = getFieldExampleValue(f, pascalName);
      const exValStr = typeof ex === 'string' ? `'${ex}'` : JSON.stringify(ex);

      const swaggerDecorator = f.isOptional
        ? `@ApiPropertyOptional({ description: '${f.name} property', example: ${exValStr} })`
        : `@ApiProperty({ description: '${f.name} property', example: ${exValStr} })`;

      const valDecorators = [...details.valDecorators];
      if (f.isOptional) {
        valDecorators.push('@IsOptional()');
      } else {
        valDecorators.push('@IsNotEmpty()');
      }

      return `  ${swaggerDecorator}\n  ${valDecorators.join('\n  ')}\n  ${f.name}${f.isOptional ? '?' : ''}: ${details.tsType};`;
    }).join('\n\n');

    // Build FK fields for Create DTO from relations (e.g., userId, categoryId)
    const relationFkFields = (options.relations || []).map((r) => {
      return `  @ApiPropertyOptional({ description: 'Foreign key linking to ${r.targetModule}', example: '123e4567-e89b-12d3-a456-426614174000', format: 'uuid' })\n  @IsOptional()\n  @IsUUID()\n  ${r.fkField}?: string;`;
    }).join('\n\n');

    const hasDateFields = options.fields.some((f) => ['DateTime', 'timestamp', 'Date'].includes(f.type));
    const hasRelations = (options.relations || []).length > 0;

    // Validator import gathering — only collect 'Is*' decorators (class-validator)
    const allValDecorators = new Set(['IsOptional', 'IsNotEmpty']);
    options.fields.forEach((f) => {
      const details = getFieldDetails(f.type);
      details.valDecorators.forEach((dec) => {
        const name = dec.replace('@', '').replace(/\(.*\)/, '');
        // Only include class-validator decorators (Is* prefix), not Type from class-transformer
        if (name && name.startsWith('Is')) allValDecorators.add(name);
      });
    });
    if (hasRelations) allValDecorators.add('IsUUID');

    const createDtoBody = [createFieldsText, relationFkFields].filter(Boolean).join('\n\n');

    if (ops.create || ops.update) {
      await fs.writeFile(
        path.join(dtoDir, `create-${kebabName}.dto.ts`),
        `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ${Array.from(allValDecorators).join(', ')} } from 'class-validator';
${hasDateFields ? `import { Type } from 'class-transformer';\n` : ''}
export class ${createDtoName} {
${createDtoBody}
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
      const details = getFieldDetails(f.type);
      const ex = getFieldExampleValue(f, pascalName);
      const exValStr = typeof ex === 'string' ? `'${ex}'` : JSON.stringify(ex);

      const swaggerDecorator = f.isOptional
        ? `@ApiPropertyOptional({ example: ${exValStr} })`
        : `@ApiProperty({ example: ${exValStr} })`;

      return `  ${swaggerDecorator}\n  ${f.name}${f.isOptional ? '?' : ''}: ${details.tsType};`;
    }).join('\n\n');

    // FK relation fields in response DTO (always optional — may be null if not populated)
    const responseFkFields = (options.relations || []).map((r) => {
      return `  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000', format: 'uuid' })\n  ${r.fkField}?: string;`;
    }).join('\n\n');

    const statusDtoField = options.includeStatus !== false
      ? `  @ApiProperty({ example: 'ACTIVE' })\n  status: string;\n\n`
      : '';

    await fs.writeFile(
      path.join(dtoDir, `${kebabName}.dto.ts`),
      `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ${responseDtoName} {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', format: 'uuid' })
  ${primaryKey}: string;

${responseFieldsText}${
  responseFkFields ? `\n\n${responseFkFields}` : ''
}

${statusDtoField}  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
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
      primaryKey,
      createDtoName,
      updateDtoName,
      ops
    );
    await fs.writeFile(path.join(moduleDir, `${kebabName}.service.ts`), serviceContent);

    // 4. Generate Controller
    const { renderControllerContent } = require('./moduleConfigurator');
    const controllerContent = renderControllerContent({
      pascalName,
      kebabName,
      primaryKey,
      createDtoName,
      updateDtoName,
      responseDtoName,
      ops,
      protectWriteOps: options.protectWriteOps,
      roles: options.roles || ['ADMIN'],
    });
    await fs.writeFile(path.join(moduleDir, `${kebabName}.controller.ts`), controllerContent);

    // 5. Generate Module
    const moduleContent = getModuleContent(orm, pascalName, singularPascal, kebabName);
    await fs.writeFile(path.join(moduleDir, `${kebabName}.module.ts`), moduleContent);

    // 6. Auto-register in src/app.module.ts
    const isAutoRegistered = await registerInAppModule(targetDir, pascalName, kebabName);

    // 7. Auto-Generate Starter Seed File Template
    await generateSeedFileTemplate(targetDir, orm, singularPascal, kebabName, primaryKey, options.fields, options.includeStatus);

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

/**
 * Detect the primary key used by a module by scanning its response DTO file.
 * Falls back to 'id' if the file is missing or no PK can be found.
 */
async function detectModulePrimaryKey(moduleDir, kebabName) {
  try {
    const dtoPath = path.join(moduleDir, 'dto', `${kebabName}.dto.ts`);
    if (!(await fs.pathExists(dtoPath))) return 'id';

    const content = await fs.readFile(dtoPath, 'utf8');
    // The PK is the first property after 'export class Xxx {'
    // It is decorated with @ApiProperty and has format: 'uuid'
    const pkMatch = content.match(/@ApiProperty\([^)]*format:\s*['"](uuid)['"][^)]*\)[\s\S]*?\n\s*(\w+)\s*:/m);
    if (pkMatch && pkMatch[2]) return pkMatch[2];

    // Fallback: look for *_id or *Id as the first bare property
    const firstPropMatch = content.match(/^\s*([a-zA-Z][a-zA-Z0-9_]*)\s*:/m);
    if (firstPropMatch && firstPropMatch[1] !== 'status') return firstPropMatch[1];
  } catch {
    // swallow
  }
  return 'id';
}

/**
 * Regenerate module DTOs and ORM schemas when fields are updated via fieldManager
 */
async function regenerateModuleComponents(moduleName, fields, targetDir = process.cwd()) {
  const orm = await detectOrm(targetDir);
  const kebabName = toKebabCase(moduleName);
  const pascalName = toPascalCase(moduleName);
  const singularPascal = toSingularPascal(pascalName);

  const srcDir = path.join(targetDir, 'src');
  const moduleDir = (await fs.pathExists(srcDir))
    ? path.join(srcDir, 'modules', kebabName)
    : path.join(targetDir, 'modules', kebabName);
  const dtoDir = path.join(moduleDir, 'dto');

  await fs.ensureDir(moduleDir);
  await fs.ensureDir(dtoDir);

  // Detect the existing primary key from the module's response DTO
  const primaryKey = await detectModulePrimaryKey(moduleDir, kebabName);

  // 1. Sync ORM Schema (forceUpdate=true so existing definitions are replaced)
  if (orm === 'prisma') {
    await syncPrismaSchema(targetDir, singularPascal, kebabName, primaryKey, fields, [], true, true);
  } else if (orm === 'typeorm') {
    await syncTypeOrmSchema(moduleDir, singularPascal, kebabName, primaryKey, fields, [], true);
  } else if (orm === 'mongoose') {
    await syncMongooseSchema(moduleDir, singularPascal, kebabName, primaryKey, fields, [], true);
  } else if (orm === 'drizzle') {
    await syncDrizzleSchema(moduleDir, singularPascal, kebabName, primaryKey, fields, [], true);
  }

  // 2. Regenerate DTOs
  const createDtoName = `Create${singularPascal}Dto`;
  const updateDtoName = `Update${singularPascal}Dto`;
  const responseDtoName = `${pascalName}Dto`;

  const createFieldsText = fields.map((f) => {
    const details = getFieldDetails(f.type);
    const ex = getFieldExampleValue(f, pascalName);
    const exValStr = typeof ex === 'string' ? `'${ex}'` : JSON.stringify(ex);

    const swaggerDecorator = f.isOptional
      ? `@ApiPropertyOptional({ description: '${f.name} property', example: ${exValStr} })`
      : `@ApiProperty({ description: '${f.name} property', example: ${exValStr} })`;

    const valDecorators = [...details.valDecorators];
    if (f.isOptional) {
      valDecorators.push('@IsOptional()');
    } else {
      valDecorators.push('@IsNotEmpty()');
    }

    return `  ${swaggerDecorator}\n  ${valDecorators.join('\n  ')}\n  ${f.name}${f.isOptional ? '?' : ''}: ${details.tsType};`;
  }).join('\n\n');

  const hasDateFields = fields.some((f) => ['DateTime', 'timestamp', 'Date'].includes(f.type));

  const allValDecorators = new Set(['IsOptional', 'IsNotEmpty']);
  fields.forEach((f) => {
    const details = getFieldDetails(f.type);
    details.valDecorators.forEach((dec) => {
      const name = dec.replace('@', '').replace(/\(.*\)/, '');
      // Only class-validator Is* decorators — Type comes from class-transformer, not here
      if (name && name.startsWith('Is')) allValDecorators.add(name);
    });
  });

  await fs.writeFile(
    path.join(dtoDir, `create-${kebabName}.dto.ts`),
    `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ${Array.from(allValDecorators).join(', ')} } from 'class-validator';
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

  const responseFieldsText = fields.map((f) => {
    const details = getFieldDetails(f.type);
    const ex = getFieldExampleValue(f, pascalName);
    const exValStr = typeof ex === 'string' ? `'${ex}'` : JSON.stringify(ex);

    const swaggerDecorator = f.isOptional
      ? `@ApiPropertyOptional({ example: ${exValStr} })`
      : `@ApiProperty({ example: ${exValStr} })`;

    return `  ${swaggerDecorator}\n  ${f.name}${f.isOptional ? '?' : ''}: ${details.tsType};`;
  }).join('\n\n');

  await fs.writeFile(
    path.join(dtoDir, `${kebabName}.dto.ts`),
    `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ${responseDtoName} {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', format: 'uuid' })
  ${primaryKey}: string;

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
}

module.exports = {
  generateModule,
  promptForModuleOptions,
  detectOrm,
  detectModulePrimaryKey,
  getOrmFieldChoices,
  toKebabCase,
  toCamelCase,
  toPascalCase,
  toSingularPascal,
  toSingularCamel,
  toSnakeCase,
  registerInAppModule,
  ensureBaseArchitecture,
  regenerateModuleComponents,
};