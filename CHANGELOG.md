# Changelog

All notable changes to create-nestjs-auth will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.10.1] - 2026-08-22

### UX Improvements
- **Interactive Yes/No Selection Prompts Across All Commands** — Replaced raw `confirm` prompts across all CLI modules (`create`, `generate`/`g`, `field`/`f`, `config`/`c`, `seed`/`s`, `remover`) with interactive `list` selections featuring arrow key navigation (`❯ Yes / No`) and clear green output history logs (`✔ Install dependencies? Yes`). Solves un-echoed typing and user confusion.

---

## [2.10.0] - 2026-08-22

### Added
- **Module & CRUD Deletion Engine (`src/moduleRemover.js`)** — Introduced full CRUD module deletion capability. Safely prompts for confirmation (`⚠️ Are you sure?`, `🗄️ Remove DB schema?`), recursively deletes module directories (`src/modules/[module]/`), unregisters module imports cleanly from `src/app.module.ts`, and cleans up ORM models in `prisma/schema.prisma` or entity files.
- **Integrated Deletion in `config` (`c`) and `field` (`f`) Commands** — Added `🗑️ Delete this CRUD Module` option to `speedrun-cli config` and `speedrun-cli field` interactive menus.

---

## [2.9.2] - 2026-08-22

### Fixed & Enhanced
- **Strict Module & Field Exists Validation** — When running `speedrun-cli g [module]` and an existing module is detected (e.g. `orange`), the CLI displays a clear red error message detailing `field` & `config` hints and immediately cancels execution to prevent accidental overwrites.
- **Duplicate & System Field Validation** — Added prompt validation in both `speedrun-cli g` and `speedrun-cli f` to prevent adding duplicate fields or reserved system fields (`id`, `status`, `createdAt`, `updatedAt`, `deletedAt`, primary key), displaying `❌ Field "[name]" already exists in module "[module]"!`.

---

## [2.9.1] - 2026-08-22

### Enhanced
- **Interactive Handoff Menu for Existing Modules** — When running `speedrun-cli g [module]` and an existing module is detected (e.g. `orders`), the CLI now prompts with an interactive action menu to seamlessly transition to Field Manager (`field`), Configurator (`config`), Seed Generator (`seed`), Overwrite (`overwrite`), or Cancel (`cancel`).

---

## [2.9.0] - 2026-08-22

### Added
- **Realistic Seed Generator (`speedrun-cli seed [module]` / alias `s` or `sd`)** — Introduced a new core CLI command and generator module (`src/seedGenerator.js`) to interactively generate realistic dummy data tailored to a module's active fields (emails, titles, prices, dates, UUIDs) targeting Prisma seed scripts (`prisma/seeds/[module].seed.ts` & master `prisma/seed.ts`), TypeORM custom scripts (`src/database/seeds/[module].seed.ts`), or raw JSON mock files (`src/modules/[module]/mock-data.json`).
- **Interconnected CLI Ecosystem** — Integrated `seed` (`s`) with existing module parser (`parseExistingFields`), ORM detector (`detectOrm`), primary key resolver (`detectModulePrimaryKey`), and package manager runner.

---

## [2.8.2] - 2026-08-22

### Added
- **Duplicate Module Validation & Overwrite Guard** — When running `speedrun-cli g [module]`, the CLI now checks if the module directory (e.g. `src/modules/orange`) already exists. If detected, it displays a warning with hints to use `speedrun-cli field` (`f`) or `speedrun-cli config` (`c`), and prompts for explicit confirmation before proceeding (`default: false`), preventing accidental overwrites.

---

## [2.8.1] - 2026-08-22

### Fixed
- **Fixed TS2307: Cannot find module `../../common/guards/jwt-auth.guard`** — Enhanced `ensureBaseArchitecture(targetDir)` in `src/moduleGenerator.js` to automatically verify and scaffold placeholder guards (`src/common/guards/jwt-auth.guard.ts`, `src/common/guards/roles.guard.ts`) and decorators (`src/common/decorators/roles.decorator.ts`) whenever generating (`speedrun-cli g`) or configuring (`speedrun-cli c`) protected CRUD modules.

---

## [2.8.0] - 2026-08-22

### Added
- **Dynamic Module Configurator (`speedrun-cli config [module]` / alias `c`)** — Introduced a new core CLI command and sub-menu module (`src/moduleConfigurator.js`) allowing developers to dynamically customize Auth/Roles Guards (`@UseGuards`, `@Roles('ADMIN', 'SUPERADMIN', ...)`) and toggle active CRUD endpoints (`create`, `findAll`, `findOne`, `update`, `remove`) on existing modules without writing boilerplate code.
- **Guard Import Resolver** — Configurator automatically detects whether `JwtAuthGuard` or `AuthGuard` is present in `src/common/guards` and injects matching imports and decorators.
- **Interconnected CLI Ecosystem** — Integrated `config` (`c`) seamlessly across `generate` (`g`) and `field` (`f`) commands.

---

## [2.7.14] - 2026-08-22

### Fixed
- **FK fields now included in `Create*Dto` and response DTO** — When relations (Many-to-One / One-to-Many) are defined during `speedrun-cli g [module]`, the foreign key fields (e.g., `userId`, `categoryId`) are now generated in `create-[module].dto.ts` with `@IsUUID()` / `@IsOptional()` validators and `@ApiPropertyOptional({ format: 'uuid' })` Swagger docs. They also appear in the response DTO.
- **`IsUUID` added to class-validator imports when relations exist** — The validator import set now includes `IsUUID` whenever at least one relation FK field is generated, preventing `TS2304: Cannot find name 'IsUUID'`.
- **`Type` (class-transformer) no longer bleeds into class-validator import** — The `allValDecorators` collector now filters to `Is*` prefixed names only, preventing duplicate/wrong imports like `import { Type } from 'class-validator'` in both `generateModule` and `regenerateModuleComponents`.
- **TypeORM `update()` uses object criteria form** — Changed `this.repo.update(primaryKey, dto)` to `this.repo.update({ primaryKey } as any, dto)` so TypeORM correctly resolves the WHERE clause by column object rather than treating the PK name string as the row ID.
- **`parseExistingFields` reads `create-[module].dto.ts` and uses validator decorators for type inference** — Previously read the response DTO and guessed ORM types from TypeScript types, causing `number` → `'Number'` corruption. Now reads the create DTO (which has `@IsInt()`, `@IsDate()`, etc.) and maps them precisely to ORM-native types (`Int`, `DateTime`, `timestamp`, etc.) per detected ORM.

---

## [2.7.13] - 2026-08-22

### Fixed
- **`regenerateModuleComponents` – Primary Key now detected from existing DTO** — Previously hardcoded `primaryKey = 'id'`, which would overwrite custom PKs (`food_id`, `foodId`, etc.) when using `speedrun-cli field`. Now reads the PK from the module's response DTO via `detectModulePrimaryKey()`.
- **`syncPrismaSchema` – `forceUpdate` flag added** — Calling `speedrun-cli field` → Save no longer silently skips Prisma schema updates when the model already exists. The existing model block is now replaced in-place.
- **`fieldManager` – `kebabName` now uses `toKebabCase()`** — Multi-word module names like `OrderItems` are correctly normalised to `order-items` instead of `orderitems`.
- **`fieldManager` – `parseExistingFields` ignores custom PK/FK fields** — Fields ending with `_id` or `Id` are now excluded from the editable field list so custom primary keys and foreign keys are never accidentally modified.
- **`fieldManager` – `save` action correctly exits loop** — After saving, `managing` is now set to `false` so the prompt loop terminates instead of continuing.
- **`moduleGenerator` – `require('./utils')` result now assigned** — `detectPackageManager` and `getRunPrefix` from `utils` are now explicitly imported rather than silently discarded.
- **`moduleGenerator` – `toKebabCase` and `detectModulePrimaryKey` now exported** — Both utilities are exported so `fieldManager` and other consumers can import them directly.

---

## [2.7.12] - 2026-08-22

### Added
- **Database Migration & Seed Actions in Field Manager (`speedrun-cli field`)** — Added interactive prompt options `⚡ Run database migration / schema sync` and `🌱 Seed database table` directly to the `? What do you want to do?` menu in `speedrun-cli field` / `speedrun-cli f`. Also offers an optional prompt to immediately run migrations and seeds right after saving updated fields.

---

## [2.7.11] - 2026-08-22

### Fixed
- **Dynamic ORM Field Types in Interactive Field Manager (`speedrun-cli field`)** — Updated `src/fieldManager.js` to dynamically detect the project ORM (`detectOrm`) and populate field type choices using `getOrmFieldChoices(orm)` instead of hardcoded default choices.

---

## [2.7.10] - 2026-08-22

### Added
- **Auto-Scaffold Missing Base Architecture (`ensureBaseArchitecture`)** — When generating modules via `speedrun-cli g [module]`, `src/common/base` is automatically scaffolded if missing from target project, resolving TS2307 & TS4112 compilation errors.
- **Custom Primary Key Selection** — Prompt to choose primary key format (`id`, `<singular_snake>_id`, `<singular_camel>Id`, or `Custom...`), applied dynamically across ORM schemas, DTOs, response decorators, and `@Param()` controller annotations.
- **ORM-Native Field Types** — Customized field type choices in the interactive builder according to detected ORM:
  - **Prisma:** `[String, Int, Float, Decimal, Boolean, DateTime, Json]`
  - **TypeORM:** `[varchar, text, int, float, decimal, boolean, timestamp, json]`
  - **Mongoose:** `[String, Number, Boolean, Date, Array, Object]`
  - **Drizzle:** `[varchar, text, integer, numeric, boolean, timestamp, json]`
- **Specific Field Editing Sub-menu** — Interactive sub-menu allows modifying specific field properties (Field Name, Field Type, Optional Status, or All) instead of forcing full re-entry.
- **Advanced Relationship Builder** — Interactively add relations (`Many-to-One`, `One-to-Many`) pointing to target modules and foreign keys, automatically injecting attributes into Prisma, TypeORM, Mongoose, and Drizzle schemas.
- **Auth & Roles Guard Protection Prompt** — Optional step to protect write operations (`POST`, `PUT`, `DELETE`) with `@UseGuards()` and role-based decorators (`ADMIN`, `USER`, `MANAGER`).
- **Optional `status` Field Prompt** — Added interactive prompt `Include default 'status' field (e.g. ACTIVE)? (Y/n)` during module generation to include or omit status field.

### Fixed
- **Runtime Error `TypeError: manageFields is not a function` Fixed** — Exported `fieldManager` in `src/index.js` entry point so `manageFields` is properly destructured in `bin/cli.js` when executing `speedrun-cli field [module]`.
- **Module Field Regeneration** — Exported `regenerateModuleComponents` in `src/moduleGenerator.js` to enable automatic DTO and ORM schema updates when field definitions are edited via `speedrun-cli field`.
- **Automated Migration Flow for CRUD Modules & JWT Setup** — Reordered post-setup steps in `handlePostSetup` so CRUD module generation occurs *before* database migrations/seeding. Any generated CRUD modules and schema updates are now automatically included when running `prisma migrate dev` / `schema:sync` / `db:push` and seeding during CLI setup.
- **Strict Input Validation for CLI Confirm Prompts** — Enforced strict `y`/`n` input validation across all CLI interactive prompts.

### Changed
- **Standardized Import Statements** — Controller & Service templates now fetch `BaseController`, `BaseService`, `IBaseRepository`, `ApiResponseDto`, `ApiResponseSchema`, `PaginatedResponseDto`, `PaginatedResponseSchema`, `PaginationQueryDto` cleanly from the single barrel export `../../common/base`.

---

## [2.6.10] - 2026-08-21

### Fixed
- **Restored Products controller and DTO files** — Restored `products.controller.ts`, `create-product.dto.ts`, `update-product.dto.ts`, and `product.dto.ts` into the `base-crud` and `base-crud-*` templates to eliminate TypeScript compilation errors (`TS2307: Cannot find module './products.controller'` / `Cannot find module './dto/create-product.dto'`).
- **Automated `app.module.ts` registration** — `ProductsModule` (and any module generated via `speedrun-cli generate`) is now automatically imported and registered inside `src/app.module.ts`'s `imports` array upon generation.

---

## [2.6.9] - 2026-08-21

### Fixed
- **Products module no longer shipped by default** — `src/modules/products/` was incorrectly included in the `base-crud` shared template and therefore copied into every project where `--base-crud` was enabled, even before the user ran `speedrun-cli generate`. The products example files have been moved exclusively into the ORM-specific overlay templates (`base-crud-{orm}`), which are only written during the guided CRUD setup step. The `base-crud` shared layer now only contains the abstract classes (`src/common/base/`) and `CRUD_README.md`.
- **Seed runs twice on Prisma** — removed the `"prisma": { "seed": "ts-node prisma/seed.ts" }` field from `templates/orm/prisma/package.json`. This field caused Prisma to automatically invoke the seed at the end of every `prisma migrate dev`, while `postSetup.js` also called `npm run prisma:seed` explicitly — resulting in the seed being executed twice and credentials being printed double.

---

## [2.6.8] - 2026-08-21

### Added
- **Guided CRUD setup step** — `? Do you want to generate your first CRUD module now?` is now part of the main setup flow, positioned after Database (Schema/Migration → Seed) and before Dev server start
- **`promptCrudGeneration()`** in `postSetup.js` — reusable function that calls `generateModule` with the selected ORM token, and auto-registers the generated module in `src/app.module.ts`
- **Manual instructions** now include a CRUD generation step (`speedrun-cli generate <name>`) when interactive setup is skipped

### Changed
- Setup prompt message updated: `"Would you like to complete the setup now? (JWT secrets, database, CRUD)"` to accurately reflect full scope
- CRUD generation is now **always offered** during guided setup (previously only shown when `--base-crud` flag was set, and appeared _after_ the dev server prompt)
- Guided setup flow order: **JWT → Database → CRUD → Dev server**

### Fixed
- **Duplicate CRUD prompt** — removed orphaned CRUD prompt block from `bin/cli.js`; single source of truth is now `postSetup.js`
- **`registerInAppModule` false positive** — overly broad `includes(${Name}Module)` check replaced with regex word-boundary `\b${Name}Module\b` to prevent partial-name collisions
- **Drizzle inject token mismatch** — `@Inject('DB_CONNECTION')` corrected to `@Inject('DRIZZLE')` to match the exported token in `database.module.ts`
- **TypeORM `@InjectRepository(Object)`** — added inline comment guiding users to replace `Object` with their actual entity class
- Ctrl+C during dev server no longer silently drops the CRUD prompt (prompt now runs _before_ the dev server)

---

## [2.6.0] - 2026-08-18

### Added
- **Base CRUD Architecture** (`--base-crud` flag) — generates abstract `BaseService<T>` and `BaseController<T>` in `src/common/base/` with full Swagger integration
- **`BaseService<T>`** — generic CRUD abstraction with `create`, `findAll` (paginated), `findOne`, `update`, `remove` (soft-delete) and automatic `NotFoundException` throwing
- **`BaseController<T>`** — generic REST controller wiring `BaseService` methods to NestJS route decorators with full `@nestjs/swagger` decorators
- **Swagger DTO helpers** — `ApiResponseDto<T>`, `PaginatedResponseDto<T>`, `ApiResponseSchema()`, `PaginatedResponseSchema()` utility functions
- **ORM-specific ProductModule examples** — concrete `ProductsService` + `ProductsModule` templates for all four ORMs (`base-crud-{prisma,typeorm,drizzle,mongoose}`)
- **`ProductEntity` alias pattern** — each ORM service exports `export type ProductEntity = <OrmType>` so the shared controller imports from a single uniform name
- **`CRUD_README.md`** — full guide and cheatsheet copied into generated projects when `--base-crud` is enabled
- **`speedrun-cli generate [module-name]`** (`g` alias) — interactive CRUD module generator:
  - Full CRUD or Custom Selection (checkbox) for individual operations
  - ORM auto-detection from `package.json` dependencies
  - Generates `service`, `controller`, `module`, and `dto/` files
  - Auto-registers generated module in `src/app.module.ts`

### Changed
- Generator step 6 split into **6a (shared base-crud)** + **6b (ORM-specific overlay)** for correct template composition
- `printSuccessHeader` now displays Base CRUD status in success output

### Fixed
- Prisma template import paths corrected (`../../database/` → `../../prisma/`) to resolve `TS2307` errors
- Removed direct `@prisma/client` model imports in templates; replaced with local interface stubs to decouple from user schema (`TS2305` fix)

---

## [2.0.8] - 2025-12-05


### Fixed
- Fixed template copy failure when CLI is installed globally or via npx (node_modules path check issue)
- Fixed .gitignore not being included in generated projects (renamed to gitignore for npm compatibility)
- Fixed Prisma migration name prompt requiring double input (now prompts via inquirer before running prisma)

## [2.0.6] - 2025-12-04

### Fixed
- Fixed ENOENT error when generating projects (target directory not created before package.json merge)

## [2.0.0] - 2025-12-04

### Added
- Multi-ORM support - Choose between Prisma, Drizzle, TypeORM, or Mongoose
- Multi-database support - PostgreSQL, MySQL, SQLite, or MongoDB
- Modular template architecture - Base + ORM + Database composition
- Comprehensive test scripts - Test each ORM individually
- Modular CLI source code - Split into organized modules in `src/`
- GitHub Actions CI/CD - Automated testing and npm publishing
- Open source essentials - CODE_OF_CONDUCT.md, SECURITY.md, PR templates
- New CLI flags: `--orm` and `--database` for non-interactive selection

### Changed
- CLI architecture modularized from single file to `src/` directory
- Package structure reorganized with `bin/` and `src/` directories
- Keywords updated for better npm discoverability
- Documentation consolidated (removed redundant markdown files)

### Removed
- `index.old.js` - Obsolete backup file
- `CHANGES.md` - Merged into CHANGELOG.md
- `INTERACTIVE_SETUP.md` - Merged into CONTRIBUTING.md
- `QUICK_REFERENCE.md` - Content moved to README.md
- Unnecessary devDependencies (TypeScript not needed for JS CLI)

## [1.1.0] - 2025-11-17

### Added
- Interactive mode - Run without arguments for guided setup
- Project name prompt with validation
- Package manager selection with auto-detection (npm, pnpm, yarn, bun)
- Setup preferences - Interactive prompts for git and dependency installation
- Automatic JWT secret generation - No manual `openssl` commands required
- Database URL prompt - Guided PostgreSQL connection string input
- Interactive database setup - Automatic Prisma generate, migrate, and seed
- Dev server auto-start option
- Post-setup workflow - Complete end-to-end interactive configuration
- `--yes` flag - Skip all prompts for CI/CD and automation

### Changed
- Made `app-name` argument optional (prompts if not provided)
- Updated CLI description to emphasize "Prisma + PostgreSQL"
- Improved success messages with interactive setup flow
- Enhanced documentation with interactive mode examples
- Updated README with two setup options (interactive vs manual)
- Reorganized post-creation instructions for clarity

### Dependencies
- Added `inquirer@^8.2.6` for interactive prompts

## [1.0.0] - 2025-11-16

### Added
- Initial release of create-nestjs-auth CLI
- Comprehensive error handling and validation
- App name validation (npm naming conventions)
- Node.js version checking (requires >= 20.x)
- Package manager auto-detection (npm, pnpm, yarn, bun)
- CLI options: `--skip-install`, `--package-manager`, `--skip-git`
- Automatic .env file creation from .env.example
- Git repository initialization with initial commit
- Proper package.json metadata for npm

### Security
- Secrets generation using cryptographically secure methods
- Validation to prevent directory traversal attacks
- Proper handling of environment variables

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 2.6.8 | 2026-08-21 | CRUD generation integrated into guided setup flow + bug fixes |
| 2.6.0 | 2026-08-18 | Base CRUD Architecture, ORM-specific templates, `generate` command |
| 2.0.8 | 2025-12-05 | Template copy & Prisma migration prompt fixes |
| 2.0.0 | 2025-12-04 | Multi-ORM and multi-database support |
| 1.1.0 | 2025-11-17 | Interactive mode and post-setup automation |
| 1.0.0 | 2025-11-16 | Initial release with Prisma + PostgreSQL |
