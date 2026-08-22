# Changelog

All notable changes to create-nestjs-auth will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.8.3] - 2026-08-22

### Fixed
- **Runtime Error `TypeError: manageFields is not a function` Fixed** — Exported `fieldManager` in `src/index.js` entry point so `manageFields` is properly destructured in `bin/cli.js` when executing `speedrun-cli field [module]`.
- **Module Field Regeneration** — Exported `regenerateModuleComponents` in `src/moduleGenerator.js` to enable automatic DTO and ORM schema updates when field definitions are edited via `speedrun-cli field`.

---

## [2.8.2] - 2026-08-22

### Added
- **Optional `status` Field Prompt** — Added interactive prompt `Include default 'status' field (e.g. ACTIVE)? (Y/n)` during module generation. Users can now choose whether to include or omit the `status` column from ORM schemas (Prisma, TypeORM, Mongoose, Drizzle), DTOs, and seed files.

---

## [2.8.1] - 2026-08-22

### Fixed
- **Automated Migration Flow for CRUD Modules & JWT Setup** — Reordered post-setup steps in `handlePostSetup` so CRUD module generation occurs *before* database migrations/seeding. Any generated CRUD modules and schema updates are now automatically included when running `prisma migrate dev` / `schema:sync` / `db:push` and seeding during CLI setup.

---

## [2.8.0] - 2026-08-22

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

### Changed
- **Standardized Import Statements** — Controller & Service templates now fetch `BaseController`, `BaseService`, `IBaseRepository`, `ApiResponseDto`, `ApiResponseSchema`, `PaginatedResponseDto`, `PaginatedResponseSchema`, `PaginationQueryDto` cleanly from the single barrel export `../../common/base`.

---

## [2.7.1] - 2026-08-22

### Fixed
- **Strict Input Validation for CLI Confirm Prompts** — Implemented `StrictConfirmPrompt` across all CLI interactive prompts. Previously, typing invalid characters (e.g. `'t'`) on boolean confirm prompts would silently default to `'no'`. Now, only valid inputs (`'y'`, `'n'`, `'yes'`, `'no'`, or pressing Enter for default) are accepted, and typing invalid characters displays `>> Invalid input. Please enter 'y' or 'n'.` and re-prompts the user.

---

## [2.7.0] - 2026-08-22

### Added
- **Scaffolding Cleanup** — Static `src/modules/products` directory has been completely removed from all initial project templates (`templates/base-crud*`). Scaffolding now creates zero CRUD modules by default.
- **Interactive Field Builder Loop** — When generating a module (via guided setup or `speedrun-cli g [module_name]`), users can interactively define custom fields (`fieldName`, `fieldType`: `String`/`Number`/`Boolean`/`Date`, `isOptional`).
- **Dynamic ORM Schema Synchronization** — Automatically syncs definitions to the project's detected ORM:
  - **Prisma:** Appends `model` with appropriate data types (`String`, `Float`/`Int`, `Boolean`, `DateTime`) and optional modifiers (`?`) to `prisma/schema.prisma`.
  - **TypeORM:** Generates `@Entity()` class in `src/modules/[kebab]/entities/[singular].entity.ts`.
  - **Mongoose:** Generates `@Schema()` class in `src/modules/[kebab]/schemas/[singular].schema.ts`.
  - **Drizzle:** Generates `pgTable` definition in `src/modules/[kebab]/schema/[kebab].schema.ts`.
- **Auto-Generated Starter Seed Template** — Creates starter seed snippet populated with dummy data based on defined fields in `prisma/seeds/[kebab].seed.ts` (Prisma) or `src/database/seeds/[kebab].seed.ts` (TypeORM/Mongoose/Drizzle).
- **Dynamic Post-Setup Summary Log** — Displays clear post-install next steps dynamically tailored for each ORM (migration & seed commands).

### Changed
- **Interactive Setup Prompt Sequence** updated:
  1. `Enable Base CRUD Architecture?` (Default: `Yes`)
  2. `Do you want to generate your first CRUD module now?` (Default: `Yes`)
  3. Shared Module Generator execution for module name, CRUD mode, and custom field loop.
- **Controller Service Constructor Visibility** fixed to `protected readonly service: [Name]Service` so generated controllers safely extend `BaseController`.

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
