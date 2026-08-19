<div align="center">

# @astralicc/create-nestjs-auth-swagger

### The Zero-Config Way to Build Secure Authentication & CRUD APIs

**Stop wasting 40 hours building JWT auth & CRUD modules from scratch.**  
Get a battle-tested, production-ready NestJS auth system and Swagger-documented APIs in **under 3 minutes**.

[![npm version](https://img.shields.io/npm/v/@astralicc/create-nestjs-auth-swagger.svg?style=flat-square&color=E0234E)](https://www.npmjs.com/package/@astralicc/create-nestjs-auth-swagger)
[![Downloads](https://img.shields.io/npm/dm/@astralicc/create-nestjs-auth-swagger.svg?style=flat-square&color=48BB78)](https://www.npmjs.com/package/@astralicc/create-nestjs-auth-swagger)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)
[![Node Version](https://img.shields.io/node/v/@astralicc/create-nestjs-auth-swagger?style=flat-square&color=339933)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11.0-E0234E?style=flat-square&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Swagger](https://img.shields.io/badge/Swagger-Integrated-85EA2D?style=flat-square&logo=swagger&logoColor=black)](https://swagger.io/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](CONTRIBUTING.md)

```bash
npx @astralicc/create-nestjs-auth-swagger@latest
```

[Quick Start](#quick-start) | [ORM & Database Options](#orm--database-options) | [Features](#what-you-get) | [Docs](#links--resources)

---

**v2.4.0** | **Interactive Module Generator** | **Swagger UI Included** | **4 ORMs** | **4 Databases**

</div>

---

## Why This Exists

Building secure JWT authentication and standard CRUD operations isn't trivial. You need:
- Access tokens + refresh token rotation
- HttpOnly cookies (not localStorage)
- Multi-device session management
- Role-based access control (RBAC)
- Rate limiting & brute-force protection
- PII-safe logging
- Proper password hashing (bcrypt 12 rounds)
- Flexible ORM & database choices
- **Consistent, secure CRUD boilerplate with strict validation**
- **Automated API Documentation (Swagger)**

**This CLI gives you all of that.** Production-ready, security-hardened, tested patterns - instantly.

<div align="center">

### The Problem with Building APIs From Scratch

| Task | Time Required | Complexity |
|------|---------------|------------|
| JWT access/refresh setup | 6-8 hours | High |
| Token rotation logic | 4-6 hours | Very High |
| RBAC implementation | 3-4 hours | Medium |
| Rate limiting | 2-3 hours | Medium |
| Security hardening | 8-10 hours | Very High |
| Base CRUD & Swagger setup | 5-7 hours | Medium |
| Testing & debugging | 6-8 hours | High |
| **Total** | **34-46 hours** | **** |

### With @astralicc/create-nestjs-auth-swagger

| Task | Time Required | Complexity |
|------|---------------|------------|
| Run one command | 3 minutes | **Zero** |
| Generate new modules | 10 seconds | **Zero** |
| **Total** | **~3 minutes** | **** |

*Save 40+ hours and get battle-tested code that just works.*

</div>

## Quick Start

**30 seconds to a running auth API with Swagger Docs:**

```bash
# Run the CLI
npx @astralicc/create-nestjs-auth-swagger@latest

# Answer quick questions
#  Project name
#  ORM (Prisma, Drizzle, TypeORM, or Mongoose)
#  Database (PostgreSQL, MySQL, SQLite, or MongoDB)
#  Enable Base CRUD Architecture? (Yes/No)
#  Package manager
#  Install dependencies
#  Setup database
#  Initialize git

# Done! Your API is running at http://localhost:8080/api/v1
# Swagger UI is available at http://localhost:8080/api/docs
```

<details>
<summary><b>See it in action (GIF/Video coming soon)</b></summary>

```
create-nestjs-auth-swagger

? What is your project name? my-awesome-api
? Which ORM would you like to use? Prisma
? Which database would you like to use? PostgreSQL
? Enable Base CRUD Architecture? Yes
? Which package manager? pnpm (detected)
? Install dependencies? Yes
? Initialize git repository? Yes

 Creating my-awesome-api...
 Installing dependencies...
 Success! Created my-awesome-api

? Complete setup now? Yes
 Generating JWT secrets...
? Enter PostgreSQL URL: postgresql://localhost:5432/mydb
? Set up database now? Yes
 Running migrations & seed...
 Default admin: admin@example.com / Admin@123

? Start dev server? Yes
 Server running at http://localhost:8080/api/v1
 Swagger UI at http://localhost:8080/api/docs
```

</details>

---

## What You Get

<table>
<tr>
<td width="50%">

### Enterprise-Grade Security

- **Token Rotation** - Refresh tokens auto-rotate on use
- **Zero XSS Risk** - HttpOnly cookies only
- **Bcrypt 12 Rounds** - 2025 security baseline
- **Rate Limiting** - 5 auth attempts/min
- **PII-Safe Logs** - Passwords/tokens auto-redacted
- **Mass Assignment Protection** - `ValidationPipe` with `whitelist: true` & `forbidNonWhitelisted: true`
- **Strict Parameter Parsing** - `@ParseUUIDPipe` / `@ParseIntPipe` on ID parameters.

</td>
<td width="50%">

### Developer Experience

- **Interactive Module Generator** - Scaffold CRUD in seconds
- **Auto-Generated Swagger Docs** - Out-of-the-box UI at `/api/docs`
- **TypeScript** - Full type safety
- **Base CRUD Architecture** - Abstract `BaseService` & `BaseController`
- **Hot Reload** - Instant feedback
- **Prisma Studio** - Visual database UI

</td>
</tr>
<tr>
<td width="50%">

### Production-Ready

- **RBAC in 2 Lines** - `@Roles(UserRole.ADMIN)`
- **Multi-Device Sessions** - Track 5 devices/user
- **Structured Logging** - Pino JSON logs
- **Input Validation** - Zod + class-validator
- **CORS & Helmet** - Security headers included
- **Global Error Handling** - Handled `NotFoundException` and Soft-Deletes.

</td>
<td width="50%">

### Flexible Database Support

- **4 ORMs** - Prisma, Drizzle, TypeORM, Mongoose
- **4 Databases** - PostgreSQL, MySQL, SQLite, MongoDB
- **Type-Safe** - Full TypeScript support across all ORMs
- **Migrations** - Version control for your database
- **Seeding** - Default admin user included

</td>
</tr>
</table>  

---

## Interactive Module Generator

Add new CRUD modules dynamically to your running project anytime using the `generate` (or `g`) sub-command!

```bash
# Inside your project directory
npx @astralicc/create-nestjs-auth-swagger g [module-name]
# OR
npx @astralicc/create-nestjs-auth-swagger generate [module-name]
```

### Interactive Prompts
1. **Module Name:** If not provided via CLI args, you'll be prompted: `"What module do you want to generate?"`
2. **CRUD Mode Selection:**
   - `Full CRUD (Create, Read All, Read One, Update, Delete)`
   - `Custom Selection...`
3. **Cherry-Pick Operations:** If you select "Custom Selection", you can use a multiselect checkbox to pick exactly what you need (e.g., just `Create` and `Read All`).

### Auto-Generated Files & Swagger Integration
The generator intelligently creates ORM-aware files for your module, fully wired with Swagger decorators:
- `module-name.controller.ts` (Decorated with `@ApiTags`, `@ApiOperation`, `@ApiResponse`, etc.)
- `module-name.service.ts` (Uses the correct Repository implementation based on your active ORM)
- `module-name.module.ts` 
- `dto/create-module-name.dto.ts` & `update-module-name.dto.ts`
- `dto/module-name.dto.ts` (With `@ApiProperty` decorators for Swagger schemas)

---

## Base CRUD Architecture & Security-Safe Features

During initial setup, if you select **"Enable Base CRUD Architecture? (Y/n)"**, your project is scaffolded with a robust, abstract generic base for controllers and services.

- **`BaseService` & `BaseController`**: Extensible classes that handle standard operations.
- **Security-First**: 
  - Protects against Mass Assignment via strict `ValidationPipe` settings (`whitelist: true`, `forbidNonWhitelisted: true`).
  - Ensures valid inputs via strict parameter parsing (e.g., `@ParseUUIDPipe`).
- **Resilient**: Built-in Soft-delete support and global `NotFoundException` handling.

---

## Auto-Generated Swagger Docs (@nestjs/swagger)

Say goodbye to manual API documentation! 

- **Swagger UI** is enabled out-of-the-box and accessible at `/api/docs`.
- Every route scaffolded by the initial CLI setup or the `g` sub-command comes pre-configured with `@nestjs/swagger` decorators.
- DTOs automatically generate OpenAPI schemas using `@ApiProperty` and `@ApiPropertyOptional`.
- Endpoint descriptions, expected parameters, and HTTP response codes are fully documented instantly.

---

## See It in Action

### 60-Second Complete Setup

```bash
# 1. Create project (10 seconds)
npx @astralicc/create-nestjs-auth-swagger@latest my-api

# 2. Answer prompts (20 seconds)
#  Project name: my-api
#  ORM: Prisma (or Drizzle, TypeORM, Mongoose)
#  Database: PostgreSQL (or MySQL, SQLite, MongoDB)
#  Enable Base CRUD: Yes
#  Package manager: pnpm
#  Install dependencies: Yes
#  Database URL: postgresql://localhost:5432/mydb
#  Setup database: Yes
#  Start server: Yes

# 3. Your API is live! (30 seconds)
#  http://localhost:8080/api/v1
#  http://localhost:8080/api/docs (Swagger UI)
```

### Live Example

```bash
# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"admin@example.com","password":"Admin@123"}'

# Access protected route
curl http://localhost:8080/api/v1/auth/me -b cookies.txt
```

### What the Code Looks Like

**Adding a protected admin endpoint** (2 lines):

```typescript
@Roles(UserRole.ADMIN)  //  Just add this decorator
@Delete('posts/:id')
deletePost() {
  return { message: 'Deleted' };
}
```

**Getting the current user** (1 line):

```typescript
@Get('my-profile')
getProfile(@GetUser() user) {  //  User automatically injected
  return { profile: user };
}
```

**Making an endpoint public** (1 line):

```typescript
@Public()  //  Skip authentication
@Get('posts')
findAll() {
  return { posts: [] };
}
```

That's it. No boilerplate. No configuration. Just decorators.

---

## How It Works

### The Magic Behind the CLI

```mermaid
graph LR
    A[Run CLI] --> B[Interactive Setup]
    B --> C[Generate Project]
    C --> D[Install Dependencies]
    D --> E[Generate JWT Secrets]
    E --> F[Configure Database]
    F --> G[Run Migrations]
    G --> H[Seed Admin User]
    H --> I[Start Dev Server & Swagger]
    
    style A fill:#667eea
    style I fill:#48bb78
```

### What Gets Created

```
my-app/
├── src/
│   ├── modules/
│   │   ├── auth/          # JWT + Refresh token logic
│   │   ├── users/         # User CRUD + profile
│   │   └── health/        # Health check endpoints
│   ├── common/
│   │   ├── base/          # Abstract BaseController & BaseService
│   │   ├── guards/        # JWT & RBAC guards
│   │   ├── decorators/    # @Roles(), @Public(), @GetUser()
│   │   └── filters/       # Exception handling
│   └── config/            # Environment & logging config
├── prisma/                # (Prisma) Schema + migrations + seed
├── drizzle/               # (Drizzle) Schema + migrations
├── test/                  # E2E test suite
├── .env                   # Auto-configured secrets
└── package.json           # All dependencies ready
```

---

## Usage Examples

### 1. Interactive Mode (Recommended)

**Zero configuration. Just answer questions:**

```bash
npx @astralicc/create-nestjs-auth-swagger@latest
```

### 2. Automation Mode

**For CI/CD and scripts:**

```bash
# Skip all prompts, use defaults
npx @astralicc/create-nestjs-auth-swagger@latest my-app --yes

# Specify ORM and database
npx @astralicc/create-nestjs-auth-swagger@latest my-app --orm drizzle --database postgres --yes
```

---

## Complete API Reference

Your generated API includes these endpoints out of the box (fully documented in Swagger):

### Authentication

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/auth/signup` | POST | Register new user |  |
| `/auth/login` | POST | Login with credentials |  |
| `/auth/refresh` | POST | Refresh access token |  Refresh token |
| `/auth/logout` | POST | Logout & invalidate tokens |  |
| `/auth/me` | GET | Get current user |  |

### Users (Admin Only)

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/users` | GET | List all users (paginated) |  ADMIN |
| `/users/:id` | GET | Get user by ID |  ADMIN |
| `/users/:id` | PATCH | Update user |  ADMIN |
| `/users/:id` | DELETE | Soft delete user |  ADMIN |

### Profile

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/users/profile` | GET | Get own profile |  |
| `/users/profile` | PATCH | Update own profile |  |

<details>
<summary><b> Example: Add RBAC to Your Endpoint</b></summary>

```typescript
import { Controller, Get } from '@nestjs/common';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('posts')
export class PostsController {
  // Public endpoint - anyone can access
  @Public()
  @Get()
  findAll() {
    return { posts: [] };
  }

  // Protected endpoint - any authenticated user
  @Get('my-posts')
  getMyPosts(@GetUser() user) {
    return { posts: [], userId: user.id };
  }

  // Admin only - requires ADMIN role
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  deletePost() {
    return { message: 'Post deleted' };
  }
}
```

**That's it!** No manual guard setup. Just decorators.

</details>

---

## CLI Options Reference

| Option | Description | Example |
|--------|-------------|---------|
| `g [module]` | Generate new CRUD module | `npx @astralicc/create-nestjs-auth-swagger g products` |
| `--orm <orm>` | Select ORM (prisma, drizzle, typeorm, mongoose) | `npx @astralicc/create-nestjs-auth-swagger@latest my-app --orm drizzle` |
| `--database <db>` | Select database (postgres, mysql, sqlite, mongodb) | `npx @astralicc/create-nestjs-auth-swagger@latest my-app --database mysql` |
| `--yes` | Skip all prompts, use defaults | `npx @astralicc/create-nestjs-auth-swagger@latest my-app --yes` |
| `--skip-install` | Don't install dependencies | `npx @astralicc/create-nestjs-auth-swagger@latest my-app --skip-install` |
| `--package-manager <pm>` | Force package manager (npm, pnpm, yarn, bun) | `npx @astralicc/create-nestjs-auth-swagger@latest my-app --package-manager pnpm` |
| `--help` | Show help message | `npx @astralicc/create-nestjs-auth-swagger@latest --help` |

---

## System Requirements

| Requirement | Version | Why? |
|------------|---------|------|
| **Node.js** | >= 20.x | Native fetch, improved performance |
| **Database** | PostgreSQL 16+, MySQL 8+, SQLite 3+, or MongoDB 6+ | Your choice! |
| **Package Manager** | npm/pnpm/yarn/bun | Any works, auto-detected |

---

## ORM & Database Options

Choose the combination that fits your project:

### Supported ORMs

| ORM | Best For | Features |
|-----|----------|----------|
| **[Prisma](https://www.prisma.io)** | Most projects | Type-safe queries, visual studio, migrations |
| **[Drizzle](https://orm.drizzle.team)** | SQL lovers | Lightweight, SQL-like syntax, fast |
| **[TypeORM](https://typeorm.io)** | Enterprise apps | Decorators, Active Record & Data Mapper |
| **[Mongoose](https://mongoosejs.com)** | MongoDB users | Schema validation, middleware, populate |

### ORM + Database Compatibility

```
┌─────────────┬────────────┬───────┬────────┬─────────┐
│             │ PostgreSQL │ MySQL │ SQLite │ MongoDB │
├─────────────┼────────────┼───────┼────────┼─────────┤
│ Prisma      │     ✅     │  ✅   │   ✅   │   ❌    │
│ Drizzle     │     ✅     │  ✅   │   ✅   │   ❌    │
│ TypeORM     │     ✅     │  ✅   │   ✅   │   ❌    │
│ Mongoose    │     ❌     │  ❌   │   ❌   │   ✅    │
└─────────────┴────────────┴───────┴────────┴─────────┘
```

---

## Comparison with Alternatives

### vs. Building from Scratch

| Feature | From Scratch | @astralicc/create-nestjs-auth-swagger |
|---------|-------------|-------------------|
| **Time to setup** | 34-46 hours | 3 minutes |
| **Security audit** | You do it (risky) | Battle-tested |
| **Token rotation** | Implement yourself |  Included |
| **RBAC** | Build guards |  Decorator-based |
| **Rate limiting** | Manual setup |  Pre-configured |
| **CRUD Generator** | DIY |  Included (`g` command) |
| **Swagger Docs** | Manual annotations |  Auto-generated |

---

## Troubleshooting

<details>
<summary><b> "Command not found: @astralicc/create-nestjs-auth-swagger"</b></summary>

Use `npx` with `@latest` tag:
```bash
npx @astralicc/create-nestjs-auth-swagger@latest my-app
```

</details>

<details>
<summary><b> "Template directory not found"</b></summary>

Reinstall the CLI:
```bash
npm uninstall -g @astralicc/create-nestjs-auth-swagger
npm cache clean --force
npm install -g @astralicc/create-nestjs-auth-swagger
```

</details>

<details>
<summary><b> Database connection fails</b></summary>

Check your PostgreSQL is running:
```bash
pg_isready
psql postgresql://user:password@localhost:5432/mydb
```
</details>

<details>
<summary><b> Port 8080 already in use</b></summary>

Option 1: Change port in `.env`:
```env
PORT=3000
```
</details>

---

## Contributing

We love contributions! Here's how you can help:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test thoroughly: `npm test`
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## Tech Stack

<div align="center">

| Technology | Version | Purpose |
|------------|---------|---------|
| [NestJS](https://nestjs.com) | 11.0 | Progressive Node.js framework |
| [TypeScript](https://www.typescriptlang.org) | 5.7 | Type safety |
| [Prisma](https://www.prisma.io) | 6.x | Type-safe ORM (option 1) |
| [Drizzle](https://orm.drizzle.team) | Latest | Lightweight ORM (option 2) |
| [TypeORM](https://typeorm.io) | 0.3.x | Decorator-based ORM (option 3) |
| [Mongoose](https://mongoosejs.com) | 8.x | MongoDB ODM (option 4) |
| [Swagger](https://swagger.io/) | - | API Documentation |
| [Passport JWT](https://www.passportjs.org) | - | JWT authentication |

</div>

---

## License

**MIT License** - do whatever you want with it!

See [LICENSE](LICENSE) for full details.

---

<div align="center">

### Did this save you time?

 **Star this repository** to help others discover it!

<sub>
 Generated projects follow <strong>NestJS best practices</strong> and <strong>OWASP security guidelines</strong><br>
 <strong>v2.4.0</strong> | Multi-ORM & Multi-Database Support | MIT License
</sub>

<br><br>

**Now go build something amazing!**

</div>
