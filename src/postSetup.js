/**
 * Post-Setup Interactive Handlers
 * @module postSetup
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');
const inquirer = require('inquirer');
const { ORM_OPTIONS, DATABASE_OPTIONS } = require('./constants');
const { generateJWTSecret, getRunPrefix } = require('./utils');

// Lazy-loaded to avoid circular deps: moduleGenerator requires constants/utils
let _generateModule;
function getGenerateModule() {
  if (!_generateModule) _generateModule = require('./moduleGenerator').generateModule;
  return _generateModule;
}

/**
 * Handles interactive post-setup configuration
 * @param {string} targetDir - Project directory
 * @param {string} appName - Application name
 * @param {object} options - Configuration options
 * @returns {Promise<boolean>} Whether interactive setup completed
 */
async function handlePostSetup(targetDir, appName, options) {
  const { packageManager, orm, database, swagger, baseCrud, generateFirstCrud, firstModuleName, yes: isYesMode, skipInstall } = options;

  if (isYesMode || skipInstall) {
    return false;
  }

  printSuccessHeader(appName, orm, database, swagger, baseCrud);

  const { continueSetup } = await inquirer.prompt([{
    type: 'confirm',
    name: 'continueSetup',
    message: 'Would you like to complete the setup now? (.env, databases)',
    default: true,
  }]);

  if (!continueSetup) {
    return false;
  }

  // Step 1: Configure JWT secrets and database URL
  await configureEnvironment(targetDir, database);

  // Step 2: CRUD module generation (updates ORM schema before running migrations)
  if (generateFirstCrud !== false) {
    await promptCrudGeneration(targetDir, orm, firstModuleName);
  }

  // Step 3: ORM-specific database setup (Generate Client → Migration → Seed)
  await setupDatabase(targetDir, orm, packageManager);

  // Step 4: Display Post-Setup Summary Log with Next Steps
  printNextStepsSummary(orm);

  // Step 5: Optionally start dev server
  await promptDevServer(targetDir, packageManager);

  return true;
}

/**
 * Prints the success header
 */
function printSuccessHeader(appName, orm, database, swagger, baseCrud) {
  console.log(chalk.green('\n✅ Success! Created ' + chalk.bold(appName)));
  console.log(chalk.gray(`   ORM: ${ORM_OPTIONS[orm]?.name || orm}`));
  console.log(chalk.gray(`   Database: ${DATABASE_OPTIONS[database]?.name || database}`));
  if (swagger) {
    console.log(chalk.gray(`   Swagger: ${chalk.green('Enabled')}`));
  }
  if (baseCrud) {
    console.log(chalk.gray(`   Base CRUD Architecture: ${chalk.green('Enabled')} — src/common/base/`));
  }
  console.log(chalk.white('\n🎉 Your project is ready!\n'));
}

/**
 * Configures environment variables
 */
async function configureEnvironment(targetDir, database) {
  console.log(chalk.yellow('\n🔑 Generating JWT secrets...\n'));
  const accessSecret = generateJWTSecret();
  const refreshSecret = generateJWTSecret();

  console.log(chalk.gray('   Generated JWT_ACCESS_SECRET'));
  console.log(chalk.gray('   Generated JWT_REFRESH_SECRET\n'));

  const dbInfo = DATABASE_OPTIONS[database];
  const { databaseUrl } = await inquirer.prompt([{
    type: 'input',
    name: 'databaseUrl',
    message: `Enter your ${dbInfo.name} database URL:`,
    default: dbInfo.urlTemplate,
    validate: (input) => {
      if (!input || input.trim() === '') {
        return 'Database URL is required';
      }
      const validPrefix = dbInfo.urlPrefix.some((prefix) => input.startsWith(prefix));
      if (!validPrefix) {
        return `Database URL must start with ${dbInfo.urlPrefix.join(' or ')}`;
      }
      return true;
    },
  }]);

  // Update .env file
  console.log(chalk.gray('\n   Updating .env file...'));
  const envPath = path.join(targetDir, '.env');

  try {
    let envContent = await fs.readFile(envPath, 'utf8');
    envContent = envContent.replace(/DATABASE_URL=.*/, `DATABASE_URL="${databaseUrl}"`);
    envContent = envContent.replace(/JWT_ACCESS_SECRET=.*/, `JWT_ACCESS_SECRET="${accessSecret}"`);
    envContent = envContent.replace(/JWT_REFRESH_SECRET=.*/, `JWT_REFRESH_SECRET="${refreshSecret}"`);
    await fs.writeFile(envPath, envContent);
    console.log(chalk.green('   ✓ Environment variables configured\n'));
  } catch {
    console.error(chalk.red('   ✗ Failed to update .env file'));
  }
}

/**
 * Sets up the database based on selected ORM
 */
async function setupDatabase(targetDir, orm, packageManager) {
  const setupHandlers = {
    prisma: setupPrisma,
    typeorm: setupTypeOrm,
    mongoose: setupMongoose,
    drizzle: setupDrizzle,
  };

  const handler = setupHandlers[orm];
  if (handler) {
    await handler(targetDir, packageManager);
  }
}

async function setupPrisma(targetDir, packageManager) {
  const { setupDatabase } = await inquirer.prompt([{
    type: 'confirm',
    name: 'setupDatabase',
    message: 'Set up the database now? (generate Prisma client, run migrations, seed)',
    default: true,
  }]);

  if (!setupDatabase) return;

  // Prompt for migration name before running prisma commands
  const { migrationName } = await inquirer.prompt([{
    type: 'input',
    name: 'migrationName',
    message: 'Enter migration name:',
    default: 'init',
    validate: (input) => {
      if (!input || input.trim() === '') {
        return 'Migration name is required';
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(input)) {
        return 'Migration name can only contain letters, numbers, underscores, and hyphens';
      }
      return true;
    },
  }]);

  console.log(chalk.yellow('\n📦 Setting up database...\n'));
  const pmPrefix = getRunPrefix(packageManager);

  try {
    console.log(chalk.gray('   Generating Prisma client...'));
    execSync(`${pmPrefix} prisma:generate`, { cwd: targetDir, stdio: 'inherit' });

    console.log(chalk.gray('\n   Running database migrations...'));
    // Run prisma directly with --name to avoid double prompt
    execSync(`npx prisma migrate dev --name ${migrationName}`, { cwd: targetDir, stdio: 'inherit' });

    console.log(chalk.gray('\n   Seeding database...'));
    execSync(`${pmPrefix} prisma:seed`, { cwd: targetDir, stdio: 'inherit' });

    printCredentials();
  } catch {
    console.error(chalk.red('\n   ✗ Database setup failed'));
    console.error(chalk.yellow('   Run these commands manually:'));
    console.error(chalk.gray(`     ${pmPrefix} prisma:generate`));
    console.error(chalk.gray(`     ${pmPrefix} prisma:migrate`));
    console.error(chalk.gray(`     ${pmPrefix} prisma:seed\n`));
  }
}

async function setupTypeOrm(targetDir, packageManager) {
  const { setupDatabase } = await inquirer.prompt([{
    type: 'confirm',
    name: 'setupDatabase',
    message: 'Set up the database now? (sync schema, seed)',
    default: true,
  }]);

  if (!setupDatabase) return;

  console.log(chalk.yellow('\n📦 Setting up database...\n'));
  const pmPrefix = getRunPrefix(packageManager);

  try {
    console.log(chalk.gray('   Synchronizing database schema...'));
    execSync(`${pmPrefix} schema:sync`, { cwd: targetDir, stdio: 'inherit' });

    console.log(chalk.gray('\n   Seeding database...'));
    execSync(`${pmPrefix} seed`, { cwd: targetDir, stdio: 'inherit' });

    printCredentials();
  } catch {
    console.error(chalk.red('\n   ✗ Database setup failed'));
    console.error(chalk.yellow('   Run these commands manually:'));
    console.error(chalk.gray(`     ${pmPrefix} schema:sync`));
    console.error(chalk.gray(`     ${pmPrefix} seed\n`));
  }
}

async function setupMongoose(targetDir, packageManager) {
  const { setupDatabase } = await inquirer.prompt([{
    type: 'confirm',
    name: 'setupDatabase',
    message: 'Seed the database now? (create default admin user)',
    default: true,
  }]);

  if (!setupDatabase) return;

  console.log(chalk.yellow('\n📦 Setting up database...\n'));
  const pmPrefix = getRunPrefix(packageManager);

  try {
    console.log(chalk.gray('   Seeding database...'));
    execSync(`${pmPrefix} db:seed`, { cwd: targetDir, stdio: 'inherit' });

    printCredentials();
  } catch {
    console.error(chalk.red('\n   ✗ Database setup failed'));
    console.error(chalk.yellow('   Run this command manually:'));
    console.error(chalk.gray(`     ${pmPrefix} db:seed\n`));
  }
}

async function setupDrizzle(targetDir, packageManager) {
  const { setupDatabase } = await inquirer.prompt([{
    type: 'confirm',
    name: 'setupDatabase',
    message: 'Set up the database now? (push schema, seed)',
    default: true,
  }]);

  if (!setupDatabase) return;

  console.log(chalk.yellow('\n📦 Setting up database...\n'));
  const pmPrefix = getRunPrefix(packageManager);

  try {
    console.log(chalk.gray('   Pushing schema to database...'));
    execSync(`${pmPrefix} db:push`, { cwd: targetDir, stdio: 'inherit' });

    console.log(chalk.gray('\n   Seeding database...'));
    execSync(`${pmPrefix} db:seed`, { cwd: targetDir, stdio: 'inherit' });

    printCredentials();
  } catch {
    console.error(chalk.red('\n   ✗ Database setup failed'));
    console.error(chalk.yellow('   Run these commands manually:'));
    console.error(chalk.gray(`     ${pmPrefix} db:push`));
    console.error(chalk.gray(`     ${pmPrefix} db:seed\n`));
  }
}

/**
 * Prints default admin credentials
 */
function printCredentials() {
  console.log(chalk.green('\n   ✓ Database setup complete!\n'));
  console.log(chalk.cyan('   📝 Default admin credentials:'));
  console.log(chalk.white('      Email:    admin@example.com'));
  console.log(chalk.white('      Password: Admin@123\n'));
}

/**
 * Prompts user to generate their first CRUD module
 */
async function promptCrudGeneration(targetDir, orm, providedModuleName) {
  let moduleName = providedModuleName;

  if (!moduleName) {
    const { generateNow } = await inquirer.prompt([{
      type: 'confirm',
      name: 'generateNow',
      message: 'Do you want to generate your first CRUD module now?',
      default: true,
    }]);

    if (!generateNow) {
      console.log(chalk.gray('\n   Skipping CRUD generation. Run `speedrun-cli generate <name>` anytime.\n'));
      return;
    }
  }

  try {
    await getGenerateModule()(moduleName, targetDir, orm);
  } catch (err) {
    console.warn(chalk.yellow(`\n   ⚠️ CRUD generation failed: ${err.message}`));
    console.warn(chalk.gray('   Run `speedrun-cli generate <name>` manually inside your project.\n'));
  }
}

/**
 * Display post-install summary with instructions to run database migrations and seeds dynamically based on selected ORM
 */
function printNextStepsSummary(orm) {
  console.log(chalk.cyan.bold('\n💡 Next Steps:\n'));

  if (orm === 'prisma') {
    console.log(chalk.white('1. Run Database Migration: ') + chalk.yellow('npx prisma db push'));
    console.log(chalk.white('2. Run Database Seed:      ') + chalk.yellow('npm run seed\n'));
  } else if (orm === 'typeorm') {
    console.log(chalk.white('1. Synchronize Database Schema: ') + chalk.yellow('npm run schema:sync'));
    console.log(chalk.white('2. Run Database Seed:            ') + chalk.yellow('npm run seed\n'));
  } else if (orm === 'mongoose') {
    console.log(chalk.white('1. Run Database Seed: ') + chalk.yellow('npm run db:seed\n'));
  } else if (orm === 'drizzle') {
    console.log(chalk.white('1. Push Schema to Database: ') + chalk.yellow('npm run db:push'));
    console.log(chalk.white('2. Run Database Seed:       ') + chalk.yellow('npm run db:seed\n'));
  } else {
    console.log(chalk.white('1. Run Database Migration & Seed commands for your ORM\n'));
  }
}

/**
 * Prompts user to start dev server
 */
async function promptDevServer(targetDir, packageManager) {
  const { startServer } = await inquirer.prompt([{
    type: 'confirm',
    name: 'startServer',
    message: 'Start the development server now?',
    default: false,
  }]);

  if (!startServer) return;

  console.log(chalk.yellow('\n🚀 Starting development server...\n'));
  console.log(chalk.gray(`   Your API will be available at: ${chalk.cyan('http://localhost:8080/api/v1')}`));
  console.log(chalk.gray(`   Press ${chalk.bold('Ctrl+C')} to stop the server\n`));

  const pmPrefix = getRunPrefix(packageManager);

  try {
    execSync(`${pmPrefix} start:dev`, { cwd: targetDir, stdio: 'inherit' });
  } catch {
    console.log(chalk.yellow('\n   Server stopped.'));
  }
}

/**
 * Prints manual setup instructions when interactive setup is skipped
 */
function printManualInstructions(appName, options) {
  const { orm, database, packageManager, installDependencies, swagger, baseCrud } = options;

  console.log(chalk.green('\n✅ Success! Created ' + chalk.bold(appName)));
  console.log(chalk.gray(`   ORM: ${ORM_OPTIONS[orm]?.name || orm}`));
  console.log(chalk.gray(`   Database: ${DATABASE_OPTIONS[database]?.name || database}`));
  if (swagger) {
    console.log(chalk.gray(`   Swagger: ${chalk.green('Enabled')}`));
  }
  if (baseCrud) {
    console.log(chalk.gray(`   Base CRUD Architecture: ${chalk.green('Enabled')} — see CRUD_README.md`));
  }
  console.log(chalk.white('\n📚 Next steps:\n'));
  console.log(chalk.cyan(`   cd ${appName}`));

  if (!installDependencies) {
    const installCmd = require('./utils').getInstallCommand(packageManager);
    console.log(chalk.cyan(`   ${installCmd}`));
  }

  console.log(chalk.cyan('\n   # Generate secure JWT secrets (save these!):'));
  console.log(chalk.gray('   openssl rand -base64 32  # For JWT_ACCESS_SECRET'));
  console.log(chalk.gray('   openssl rand -base64 32  # For JWT_REFRESH_SECRET'));
  console.log(chalk.cyan('\n   # Edit .env with your database URL and JWT secrets'));

  printNextStepsSummary(orm);

  console.log(chalk.cyan('   # Generate your first CRUD module:'));
  console.log(chalk.gray('   speedrun-cli generate <module-name>'));
  console.log(chalk.gray('   # e.g. speedrun-cli generate orders'));

  console.log(chalk.cyan('\n   # Start development server:'));
  console.log(chalk.gray('   npm run start:dev'));

  if (swagger) {
    console.log(chalk.cyan('\n   # Swagger API documentation:'));
    console.log(chalk.gray('   http://localhost:8080/api/docs'));
  }

  if (baseCrud) {
    console.log(chalk.cyan('\n   # Base CRUD Architecture:'));
    console.log(chalk.gray('   src/common/base/   — BaseService & BaseController'));
    console.log(chalk.gray('   CRUD_README.md     — Full guide & cheatsheet'));
  }

  console.log(chalk.white('\n📖 Documentation: https://github.com/masabinhok/create-nestjs-auth'));
  console.log(chalk.white('🐛 Issues: https://github.com/masabinhok/create-nestjs-auth/issues\n'));
  console.log(chalk.magenta('Happy coding! 🎉\n'));
}

module.exports = {
  handlePostSetup,
  printManualInstructions,
  printNextStepsSummary,
};
