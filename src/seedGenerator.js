/**
 * Seed Generator for speedrun-cli
 * Generates realistic dummy/seed data for a target CRUD module based on its DTOs / ORM Schema.
 * @module seedGenerator
 */

const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const crypto = require('crypto');
const {
  detectOrm,
  detectModulePrimaryKey,
  toKebabCase,
  toPascalCase,
  toSingularPascal,
  toSingularCamel,
} = require('./moduleGenerator');
const { parseExistingFields } = require('./fieldManager');
const { detectPackageManager, getRunPrefix } = require('./utils');

/**
 * Generates realistic mock values based on field name and field type.
 */
function generateMockValue(fieldName, fieldType, index = 1) {
  const lowerName = fieldName.toLowerCase();

  if (lowerName.includes('email')) {
    return `user${index}@example.com`;
  }
  if (lowerName.includes('phone') || lowerName.includes('mobile')) {
    return `+1555010${(index % 100).toString().padStart(4, '0')}`;
  }
  if (lowerName.includes('name') || lowerName.includes('title')) {
    return `Sample ${fieldName} ${index}`;
  }
  if (lowerName.includes('price') || lowerName.includes('amount') || lowerName.includes('cost') || lowerName.includes('total')) {
    return Number((10 + index * 5.5).toFixed(2));
  }
  if (lowerName.includes('count') || lowerName.includes('quantity') || lowerName.includes('stock')) {
    return 10 * index;
  }
  if (lowerName.includes('url') || lowerName.includes('image') || lowerName.includes('avatar')) {
    return `https://example.com/assets/${lowerName}-${index}.jpg`;
  }
  if (lowerName.includes('description') || lowerName.includes('note') || lowerName.includes('remark') || lowerName.includes('comment')) {
    return `This is a sample ${fieldName} content for item #${index}.`;
  }

  // Type fallbacks
  const ft = (fieldType || '').toLowerCase();
  if (['int', 'integer', 'number'].includes(ft)) {
    return index * 10;
  }
  if (['float', 'decimal', 'numeric'].includes(ft)) {
    return Number((9.99 + index).toFixed(2));
  }
  if (['boolean'].includes(ft)) {
    return index % 2 === 0;
  }
  if (['datetime', 'date', 'timestamp'].includes(ft)) {
    return new Date(Date.now() - index * 86400000).toISOString();
  }
  if (['json', 'object'].includes(ft)) {
    return { key: `value_${index}` };
  }
  if (ft === 'array') {
    return [`item_${index}_a`, `item_${index}_b`];
  }

  return `Sample ${fieldName} ${index}`;
}

/**
 * Main Interactive Seed Generator Entry Point
 */
async function generateSeed(providedModuleName, targetDir = process.cwd()) {
  try {
    let moduleName = providedModuleName;

    if (!moduleName) {
      const nameAnswer = await inquirer.prompt([{
        type: 'input',
        name: 'moduleName',
        message: 'Which module do you want to generate seed data for? (e.g., orders, products)',
        validate: (input) => (input && input.trim() ? true : 'Module name is required'),
      }]);
      moduleName = nameAnswer.moduleName.trim();
    }

    const kebabName = toKebabCase(moduleName);
    const pascalName = toPascalCase(moduleName);
    const singularPascal = toSingularPascal(pascalName);
    const singularCamel = toSingularCamel(kebabName);

    const srcDir = path.join(targetDir, 'src');
    const moduleDir = (await fs.pathExists(srcDir))
      ? path.join(srcDir, 'modules', kebabName)
      : path.join(targetDir, 'modules', kebabName);

    if (!(await fs.pathExists(moduleDir))) {
      console.error(chalk.red(`\n❌ Module "${kebabName}" not found at ${moduleDir}`));
      return false;
    }

    const orm = await detectOrm(targetDir);
    const primaryKey = await detectModulePrimaryKey(moduleDir, kebabName);
    const fields = await parseExistingFields(moduleDir, kebabName, orm);
    const pm = detectPackageManager();
    const runPrefix = getRunPrefix(pm);

    console.log(chalk.cyan(`\n🌱 Generating seed data for module: ${chalk.bold(kebabName)} (Detected ORM: ${orm})`));

    // 1. Prompt for count
    const { countStr } = await inquirer.prompt([{
      type: 'input',
      name: 'countStr',
      message: 'How many seed records do you want to generate?',
      default: '10',
      validate: (input) => {
        const num = parseInt(input, 10);
        return !isNaN(num) && num > 0 ? true : 'Please enter a positive integer';
      },
    }]);
    const count = parseInt(countStr, 10);

    // 2. Prompt for seed strategy
    const { seedStrategy } = await inquirer.prompt([{
      type: 'list',
      name: 'seedStrategy',
      message: 'Select target output format / seeding strategy:',
      choices: [
        { name: 'Prisma Seed Script (prisma/seeds/[module].seed.ts integration)', value: 'prisma' },
        { name: 'TypeORM / Custom Script (src/database/seeds/[module].seed.ts)', value: 'typeorm' },
        { name: 'Raw JSON Mock File (src/modules/[module]/mock-data.json)', value: 'json' },
      ],
      default: orm === 'prisma' ? 'prisma' : 'typeorm',
    }]);

    // 3. Generate Records
    const records = [];
    for (let i = 1; i <= count; i++) {
      const uuidVal = crypto.randomUUID ? crypto.randomUUID() : `123e4567-e89b-12d3-a456-${(100000000000 + i).toString()}`;
      const rec = {
        [primaryKey]: uuidVal,
      };

      fields.forEach((f) => {
        rec[f.name] = generateMockValue(f.name, f.type, i);
      });

      rec['status'] = 'ACTIVE';
      records.push(rec);
    }

    // 4. Output according to selected strategy
    if (seedStrategy === 'prisma') {
      const prismaSeedsDir = path.join(targetDir, 'prisma', 'seeds');
      await fs.ensureDir(prismaSeedsDir);
      const moduleSeedPath = path.join(prismaSeedsDir, `${kebabName}.seed.ts`);

      const seedScriptContent = `import { PrismaClient } from '@prisma/client';

export const ${singularCamel}SeedData = ${JSON.stringify(records, null, 2)};

export async function seed${pascalName}(prisma: PrismaClient) {
  console.log('🌱 Seeding ${kebabName}...');
  for (const item of ${singularCamel}SeedData) {
    await (prisma as any).${singularCamel}.upsert({
      where: { ${primaryKey}: item.${primaryKey} },
      update: {},
      create: item,
    });
  }
  console.log('   ✓ Seeded ${count} ${kebabName} records');
}
`;
      await fs.writeFile(moduleSeedPath, seedScriptContent, 'utf8');
      console.log(chalk.green(`\n⚡ Generated Prisma seed script at: ${path.relative(targetDir, moduleSeedPath)}`));

      // Check master prisma/seed.ts
      const masterSeedPath = path.join(targetDir, 'prisma', 'seed.ts');
      if (await fs.pathExists(masterSeedPath)) {
        let masterContent = await fs.readFile(masterSeedPath, 'utf8');
        const importLine = `import { seed${pascalName} } from './seeds/${kebabName}.seed';`;
        const callLine = `await seed${pascalName}(prisma);`;

        if (!masterContent.includes(importLine)) {
          masterContent = `${importLine}\n` + masterContent;
        }

        if (!masterContent.includes(callLine)) {
          masterContent = masterContent.replace(/async function main\(\) \{/, `async function main() {\n  ${callLine}`);
        }

        await fs.writeFile(masterSeedPath, masterContent, 'utf8');
        console.log(chalk.green(`✨ Integrated seed${pascalName} into prisma/seed.ts`));
      }

      console.log(chalk.cyan(`\n💡 To execute this seed script, run:`));
      console.log(chalk.bold(`   ${runPrefix} prisma:seed (or npx prisma db seed)\n`));
    } else if (seedStrategy === 'typeorm') {
      const seedsDir = path.join(targetDir, 'src', 'database', 'seeds');
      await fs.ensureDir(seedsDir);
      const customSeedPath = path.join(seedsDir, `${kebabName}.seed.ts`);

      const customSeedContent = `/**
 * Seed data for module "${kebabName}"
 */
export const ${singularCamel}SeedData = ${JSON.stringify(records, null, 2)};

export async function seed${pascalName}() {
  console.log('🌱 Seeding ${kebabName} with ${count} records...');
  return ${singularCamel}SeedData;
}
`;
      await fs.writeFile(customSeedPath, customSeedContent, 'utf8');
      console.log(chalk.green(`\n⚡ Generated seed script at: ${path.relative(targetDir, customSeedPath)}`));
      console.log(chalk.cyan(`\n💡 To execute custom seeds, run:`));
      console.log(chalk.bold(`   ${runPrefix} db:seed (or ${runPrefix} seed)\n`));
    } else if (seedStrategy === 'json') {
      const jsonMockPath = path.join(moduleDir, 'mock-data.json');
      await fs.writeFile(jsonMockPath, JSON.stringify(records, null, 2), 'utf8');
      console.log(chalk.green(`\n⚡ Generated raw JSON mock data file at: ${path.relative(targetDir, jsonMockPath)}`));
      console.log(chalk.gray(`   Contains ${count} mock records.\n`));
    }

    return true;
  } catch (error) {
    console.error(chalk.red('\n❌ Seed generation failed:'), error.message);
    return false;
  }
}

module.exports = { generateSeed, generateMockValue };
