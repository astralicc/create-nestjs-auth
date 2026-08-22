/**
 * Interactive Field Manager for existing modules
 * @module fieldManager
 */

const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { execSync } = require('child_process');
const { detectOrm, getOrmFieldChoices, regenerateModuleComponents, toKebabCase } = require('./moduleGenerator');
const { detectPackageManager, getRunPrefix } = require('./utils');

/**
 * Map a class-validator decorator name to the best ORM-native type for the given ORM.
 * Used when round-tripping field types from the DTO file back into the field editor.
 */
function inferOrmTypeFromValidator(decoratorName, orm) {
  switch (decoratorName) {
    case 'IsInt':
      return orm === 'prisma' ? 'Int' : orm === 'mongoose' ? 'Number' : 'int';
    case 'IsNumber':
      if (orm === 'prisma') return 'Float';
      if (orm === 'typeorm') return 'decimal';
      if (orm === 'drizzle') return 'numeric';
      return 'Number'; // mongoose
    case 'IsBoolean':
      return orm === 'prisma' || orm === 'mongoose' ? 'Boolean' : 'boolean';
    case 'IsDate':
      if (orm === 'prisma') return 'DateTime';
      if (orm === 'mongoose') return 'Date';
      return 'timestamp'; // typeorm / drizzle
    case 'IsObject':
      return orm === 'prisma' ? 'Json' : orm === 'mongoose' ? 'Object' : 'json';
    case 'IsArray':
      return orm === 'mongoose' ? 'Array' : orm === 'prisma' ? 'Json' : 'json';
    case 'IsString':
    default:
      return orm === 'prisma' || orm === 'mongoose' ? 'String' : 'varchar';
  }
}

// Helper to parse existing fields from the create DTO file (most accurate source)
async function parseExistingFields(moduleDir, kebabName, orm = 'prisma') {
  // Prefer create DTO (has validators + real field types); fall back to response DTO
  const createDtoPath = path.join(moduleDir, 'dto', `create-${kebabName}.dto.ts`);
  const responseDtoPath = path.join(moduleDir, 'dto', `${kebabName}.dto.ts`);

  const targetPath = (await fs.pathExists(createDtoPath)) ? createDtoPath : responseDtoPath;
  if (!(await fs.pathExists(targetPath))) return [];

  const content = await fs.readFile(targetPath, 'utf8');
  const fields = [];

  // System / PK / FK fields to exclude from editing
  const IGNORED_EXACT = new Set(['id', 'status', 'createdAt', 'updatedAt', 'deletedAt']);

  // Split into per-property blocks by splitting at each decorator line or property line
  // Strategy: iterate line-by-line, collect decorator context then resolve property
  const lines = content.split('\n');
  let pendingDecorators = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Collect validator decorator names (e.g. @IsString(), @IsInt())
    const decMatch = trimmed.match(/^@(Is[A-Z][a-zA-Z]+)\(/);
    if (decMatch) {
      pendingDecorators.push(decMatch[1]);
      continue;
    }

    // Reset decorator context on non-decorator, non-property lines
    if (trimmed.startsWith('@') || trimmed === '' || trimmed.startsWith('import') || trimmed.startsWith('export') || trimmed.startsWith('//')) {
      if (!trimmed.match(/^([a-zA-Z0-9_]+)\??\s*:/)) {
        pendingDecorators = [];
      }
      continue;
    }

    // Match property line: fieldName?: tsType;
    const propMatch = trimmed.match(/^([a-zA-Z0-9_]+)(\?)?\s*:\s*([a-zA-Z_][\w\[\]]*)\s*;/);
    if (propMatch) {
      const [, name, optional, tsType] = propMatch;

      // Skip system fields and FK / custom PK patterns
      if (
        IGNORED_EXACT.has(name) ||
        /_id$/i.test(name) ||
        /Id$/.test(name)
      ) {
        pendingDecorators = [];
        continue;
      }

      // Determine ORM type from validator decorators (most accurate) or TS type fallback
      let ormType;
      const validatorDec = pendingDecorators.find((d) => d.startsWith('Is'));
      if (validatorDec) {
        ormType = inferOrmTypeFromValidator(validatorDec, orm);
      } else {
        // TS-type fallback mapping
        if (tsType === 'number') ormType = orm === 'prisma' ? 'Float' : orm === 'mongoose' ? 'Number' : 'decimal';
        else if (tsType === 'boolean') ormType = orm === 'prisma' || orm === 'mongoose' ? 'Boolean' : 'boolean';
        else if (tsType === 'Date') ormType = orm === 'prisma' ? 'DateTime' : orm === 'mongoose' ? 'Date' : 'timestamp';
        else if (tsType === 'object') ormType = orm === 'prisma' ? 'Json' : orm === 'mongoose' ? 'Object' : 'json';
        else ormType = orm === 'prisma' || orm === 'mongoose' ? 'String' : 'varchar';
      }

      fields.push({
        name,
        type: ormType,
        isOptional: !!optional,
      });

      pendingDecorators = [];
      continue;
    }

    pendingDecorators = [];
  }

  return fields;
}


/**
 * Executes ORM-specific database migration / schema sync
 */
async function runDatabaseMigration(targetDir, orm, packageManager) {
  const pmPrefix = getRunPrefix(packageManager);
  console.log(chalk.yellow(`\n⚡ Running database migration for ORM: ${chalk.bold(orm)}...\n`));

  try {
    if (orm === 'prisma') {
      execSync('npx prisma db push', { cwd: targetDir, stdio: 'inherit' });
    } else if (orm === 'typeorm') {
      execSync(`${pmPrefix} schema:sync`, { cwd: targetDir, stdio: 'inherit' });
    } else if (orm === 'drizzle') {
      execSync(`${pmPrefix} db:push`, { cwd: targetDir, stdio: 'inherit' });
    } else if (orm === 'mongoose') {
      console.log(chalk.green('   ✓ Mongoose schemas update dynamically on application startup.'));
    }
    console.log(chalk.green('\n   ✓ Database migration complete!\n'));
  } catch (error) {
    console.error(chalk.red(`\n   ✗ Database migration failed: ${error.message}\n`));
  }
}

/**
 * Executes ORM-specific database seed
 */
async function runDatabaseSeed(targetDir, orm, packageManager) {
  const pmPrefix = getRunPrefix(packageManager);
  console.log(chalk.yellow(`\n🌱 Seeding database for ORM: ${chalk.bold(orm)}...\n`));

  try {
    if (orm === 'prisma') {
      execSync(`${pmPrefix} prisma:seed`, { cwd: targetDir, stdio: 'inherit' });
    } else if (orm === 'typeorm') {
      execSync(`${pmPrefix} seed`, { cwd: targetDir, stdio: 'inherit' });
    } else if (orm === 'mongoose' || orm === 'drizzle') {
      execSync(`${pmPrefix} db:seed`, { cwd: targetDir, stdio: 'inherit' });
    }
    console.log(chalk.green('\n   ✓ Database seed complete!\n'));
  } catch (error) {
    console.error(chalk.red(`\n   ✗ Database seed failed: ${error.message}\n`));
  }
}

/**
 * Main Interactive Field Manager Entry Point
 */
async function manageFields(providedModuleName, targetDir = process.cwd()) {
  try {
    const orm = await detectOrm(targetDir);
    const ormTypeChoices = getOrmFieldChoices(orm);
    const pm = detectPackageManager();

    let moduleName = providedModuleName;

    if (!moduleName) {
      const nameAnswer = await inquirer.prompt([{
        type: 'input',
        name: 'moduleName',
        message: 'Which module do you want to manage fields for? (e.g., orders, products)',
        validate: (input) => (input && input.trim() ? true : 'Module name is required'),
      }]);
      moduleName = nameAnswer.moduleName.trim();
    }

    const kebabName = toKebabCase(moduleName);
    const moduleDir = path.join(targetDir, 'src', 'modules', kebabName);

    if (!(await fs.pathExists(moduleDir))) {
      console.error(chalk.red(`\n❌ Module "${kebabName}" not found at src/modules/${kebabName}`));
      return false;
    }

    // Load existing fields (pass orm so type inference produces ORM-native types)
    let fields = await parseExistingFields(moduleDir, kebabName, orm);
    console.log(chalk.cyan(`\n📦 Managing fields for module: ${chalk.bold(kebabName)} (Detected ORM: ${orm})`));

    let managing = true;

    const promptSingleField = async (initialValues = {}) => {
      return await inquirer.prompt([
        {
          type: 'input',
          name: 'fieldName',
          message: 'Enter field name:',
          default: initialValues.name,
          validate: (input) => {
            if (!input || !input.trim()) return 'Field name is required';
            const name = input.trim();
            if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
              return 'Field name must be a valid identifier';
            }
            if (initialValues.name && initialValues.name.toLowerCase() === name.toLowerCase()) {
              return true;
            }
            if (['id', 'status', 'createdAt', 'updatedAt', 'deletedAt'].includes(name)) {
              return `Field '${name}' is a system field. Please choose another field name.`;
            }
            if (fields.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
              return `Field '${name}' already exists in module '${kebabName}'. Please choose a different name.`;
            }
            return true;
          },
        },
        {
          type: 'list',
          name: 'fieldType',
          message: (answers) => `Select field type for '${answers.fieldName}':`,
          choices: ormTypeChoices,
          default: initialValues.type && ormTypeChoices.includes(initialValues.type) ? initialValues.type : ormTypeChoices[0],
        },
        {
          type: 'confirm',
          name: 'isOptional',
          message: (answers) => `Is '${answers.fieldName}' optional?`,
          default: initialValues.isOptional !== undefined ? initialValues.isOptional : false,
        },
      ]);
    };

    while (managing) {
      console.log(
        chalk.gray(`\nCurrent Fields (${fields.length}): `) +
        (fields.length > 0
          ? fields.map(f => chalk.yellow(`${f.name} (${f.type}${f.isOptional ? '?' : ''})`)).join(', ')
          : chalk.gray('None'))
      );

      const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'What do you want to do?',
        choices: [
          { name: '➕ Add new field', value: 'add' },
          { name: '✏️  Edit an existing field', value: 'edit' },
          { name: '🗑️  Delete a field', value: 'delete' },
          { name: '💾 Save changes & update files', value: 'save' },
          { name: '⚡ Run database migration / schema sync', value: 'migrate' },
          { name: '🌱 Seed database table', value: 'seed' },
          { name: '❌ Cancel / Exit', value: 'cancel' },
        ],
      }]);

      if (action === 'add') {
        const newField = await promptSingleField();
        fields.push({
          name: newField.fieldName.trim(),
          type: newField.fieldType,
          isOptional: newField.isOptional,
        });
      } else if (action === 'edit') {
        if (fields.length === 0) {
          console.log(chalk.yellow('⚠️ No fields to edit.'));
          continue;
        }

        const { fieldToEditIndex } = await inquirer.prompt([{
          type: 'list',
          name: 'fieldToEditIndex',
          message: 'Select field to edit:',
          choices: fields.map((f, index) => ({
            name: `${f.name} (${f.type}${f.isOptional ? '?' : ''})`,
            value: index,
          })),
        }]);

        const editedField = await promptSingleField(fields[fieldToEditIndex]);
        fields[fieldToEditIndex] = {
          name: editedField.fieldName.trim(),
          type: editedField.fieldType,
          isOptional: editedField.isOptional,
        };
        console.log(chalk.green(`✓ Field updated.`));
      } else if (action === 'delete') {
        if (fields.length === 0) {
          console.log(chalk.yellow('⚠️ No fields to delete.'));
          continue;
        }

        const { fieldToDeleteIndex } = await inquirer.prompt([{
          type: 'list',
          name: 'fieldToDeleteIndex',
          message: 'Select field to delete:',
          choices: fields.map((f, index) => ({
            name: `${f.name} (${f.type}${f.isOptional ? '?' : ''})`,
            value: index,
          })),
        }]);

        const deletedName = fields[fieldToDeleteIndex].name;
        fields.splice(fieldToDeleteIndex, 1);
        console.log(chalk.red(`🗑️ Field '${deletedName}' removed.`));
      } else if (action === 'save') {
        await regenerateModuleComponents(moduleName, fields, targetDir);
        console.log(chalk.green(`\n✅ Successfully updated fields for module "${kebabName}"!`));
        managing = false; // exit loop after successful save

        const { runDbNow } = await inquirer.prompt([{
          type: 'confirm',
          name: 'runDbNow',
          message: 'Run database migration & seed now?',
          default: false,
        }]);

        if (runDbNow) {
          await runDatabaseMigration(targetDir, orm, pm);
          await runDatabaseSeed(targetDir, orm, pm);
        }
      } else if (action === 'migrate') {
        await runDatabaseMigration(targetDir, orm, pm);
      } else if (action === 'seed') {
        await runDatabaseSeed(targetDir, orm, pm);
      } else if (action === 'cancel') {
        console.log(chalk.gray('Exited field manager.'));
        managing = false;
      }
    }
  } catch (error) {
    console.error(chalk.red('\n❌ Field management failed:'), error.message);
  }
}

module.exports = { manageFields, parseExistingFields };