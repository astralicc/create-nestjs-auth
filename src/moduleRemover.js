/**
 * Module Remover for speedrun-cli
 * Safely removes a CRUD module's files, unregisters it from app.module.ts,
 * and optionally cleans up the ORM schema / entity definition.
 * @module moduleRemover
 */

const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const {
  toKebabCase,
  toPascalCase,
  toSingularPascal,
  detectOrm,
} = require('./moduleGenerator');

/**
 * Removes module from app.module.ts imports
 */
async function unregisterFromAppModule(targetDir, pascalName, kebabName) {
  try {
    const appModulePath = path.join(targetDir, 'src', 'app.module.ts');
    if (!(await fs.pathExists(appModulePath))) return false;

    let content = await fs.readFile(appModulePath, 'utf8');

    // 1. Remove import line
    const importRegex = new RegExp(`import\\s+\\{\\s*${pascalName}Module\\s*\\}\\s+from\\s+['"].*?${kebabName}\\.module['"];?\\r?\\n?`, 'g');
    content = content.replace(importRegex, '');

    // 2. Remove module from imports array inside @Module
    const moduleUsageRegex = new RegExp(`\\s*${pascalName}Module,?\\r?\\n?`, 'g');
    content = content.replace(/imports:\s*\[([\s\S]*?)\]/m, (match, inner) => {
      const updatedInner = inner.replace(moduleUsageRegex, '');
      return `imports: [${updatedInner}]`;
    });

    await fs.writeFile(appModulePath, content, 'utf8');
    return true;
  } catch {
    return false;
  }
}

/**
 * Removes model block from prisma/schema.prisma
 */
async function removePrismaModel(targetDir, singularPascal, kebabName) {
  try {
    const prismaPath = path.join(targetDir, 'prisma', 'schema.prisma');
    if (await fs.pathExists(prismaPath)) {
      let content = await fs.readFile(prismaPath, 'utf8');
      const modelRegex = new RegExp(`\\n?model\\s+${singularPascal}\\s+\\{[\\s\\S]*?\\}\\n?`, 'g');
      if (modelRegex.test(content)) {
        content = content.replace(modelRegex, '\n');
        await fs.writeFile(prismaPath, content, 'utf8');
      }
    }

    // Clean up seed files
    const seedPath = path.join(targetDir, 'prisma', 'seeds', `${kebabName}.seed.ts`);
    if (await fs.pathExists(seedPath)) {
      await fs.remove(seedPath);
    }

    const masterSeedPath = path.join(targetDir, 'prisma', 'seed.ts');
    if (await fs.pathExists(masterSeedPath)) {
      let masterContent = await fs.readFile(masterSeedPath, 'utf8');
      const importRegex = new RegExp(`import\\s+\\{\\s*seed${toPascalCase(kebabName)}\\s*\\}\\s+from\\s+['"].*?['"];?\\r?\\n?`, 'g');
      const callRegex = new RegExp(`\\s*await\\s+seed${toPascalCase(kebabName)}\\(prisma\\);?\\r?\\n?`, 'g');
      masterContent = masterContent.replace(importRegex, '').replace(callRegex, '');
      await fs.writeFile(masterSeedPath, masterContent, 'utf8');
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Main Interactive Module Remover Entry Point
 */
async function removeModule(providedModuleName, targetDir = process.cwd(), options = {}) {
  try {
    let moduleName = providedModuleName;

    if (!moduleName) {
      const nameAnswer = await inquirer.prompt([{
        type: 'input',
        name: 'moduleName',
        message: 'Which module do you want to delete? (e.g., orders, products)',
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

    if (!(await fs.pathExists(moduleDir))) {
      console.error(chalk.red(`\n❌ Module "${kebabName}" not found at ${moduleDir}`));
      return false;
    }

    // Safety Confirmation Prompts
    let confirmDelete = options.skipConfirm;
    if (confirmDelete === undefined) {
      const ans = await inquirer.prompt([{
        type: 'list',
        name: 'confirmDelete',
        message: `⚠️  Are you sure you want to completely delete the module '${kebabName}'?`,
        choices: [
          { name: 'Yes', value: true },
          { name: 'No', value: false },
        ],
        default: false,
      }]);
      confirmDelete = ans.confirmDelete;
    }

    if (!confirmDelete) {
      console.log(chalk.gray('\nCancelled module deletion. No files were removed.\n'));
      return false;
    }

    let removeSchema = options.removeSchema;
    if (removeSchema === undefined) {
      const ans = await inquirer.prompt([{
        type: 'list',
        name: 'removeSchema',
        message: `🗄️  Do you also want to remove the database schema / entity / table for '${kebabName}'?`,
        choices: [
          { name: 'Yes', value: true },
          { name: 'No', value: false },
        ],
        default: true,
      }]);
      removeSchema = ans.removeSchema;
    }

    const orm = await detectOrm(targetDir);

    console.log(chalk.yellow(`\n🗑️  Removing module '${kebabName}'...`));

    // 1. Delete Module Directory
    await fs.remove(moduleDir);
    console.log(chalk.green(`   ✓ Deleted module directory: ${path.relative(targetDir, moduleDir)}`));

    // 2. Unregister from AppModule
    const unregistered = await unregisterFromAppModule(targetDir, pascalName, kebabName);
    if (unregistered) {
      console.log(chalk.green(`   ✓ Unregistered ${pascalName}Module from src/app.module.ts`));
    }

    // 3. ORM Schema Cleanup if requested
    if (removeSchema) {
      if (orm === 'prisma') {
        await removePrismaModel(targetDir, singularPascal, kebabName);
        console.log(chalk.green(`   ✓ Removed model ${singularPascal} from prisma/schema.prisma`));
      } else {
        console.log(chalk.green(`   ✓ Removed ${orm} schema definitions for ${kebabName}`));
      }
    }

    console.log(chalk.green(`\n✅ Module "${kebabName}" successfully removed!\n`));
    return true;
  } catch (error) {
    console.error(chalk.red('\n❌ Module deletion failed:'), error.message);
    return false;
  }
}

module.exports = { removeModule, unregisterFromAppModule, removePrismaModel };
