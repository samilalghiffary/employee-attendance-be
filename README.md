# Employee Attendance API (Backend)

REST API backend for the **Employee Attendance Management System**, built with **NestJS**, **Prisma ORM**, **PostgreSQL**, and **TypeScript**.

This repository provides full-featured APIs for user authentication (RBAC), employee geolocation-based attendance tracking, profile management, attendance history, statistical summaries, and dynamic administrative work schedule configuration.

---

## 🚀 Tech Stack

- **Framework:** [NestJS](https://nestjs.com/) (Modular Architecture)
- **Database ORM:** [Prisma ORM](https://www.prisma.io/)
- **Database:** PostgreSQL (>= 15)
- **Authentication:** JWT (JSON Web Tokens) with Passport & Bcrypt
- **API Documentation:** [Swagger / OpenAPI](https://swagger.io/)
- **Testing:** [Vitest](https://vitest.dev/) (Unit & E2E Testing)
- **Linter & Formatter:** [Oxlint](https://oxc.rs/) & [Prettier](https://prettier.io/)

---

## 📌 Key Features

- 🔐 **Authentication & RBAC:**
  - Secure login and registration with password hashing (`bcrypt`).
  - Role-Based Access Control (`ADMIN` & `EMPLOYEE`).
- 📍 **Employee Attendance Tracking:**
  - Self-service check-in & check-out with GPS geolocation recording (`latitude` & `longitude`).
  - Automated status evaluation (`PRESENT`, `LATE`, `ABSENT`, `LEAVE`) with dynamic company policy tolerance.
  - Granular calculation and tracking of `lateMinutes` and `earlyLeaveMinutes`.
  - Comprehensive attendance logs and history (daily, monthly, yearly) with server-side multi-field sorting.
- 📊 **Aggregated Attendance Analytics:**
  - Dedicated personal summary endpoint (`/api/attendance/my-summary`) with date range filtering.
  - Company-wide admin summary endpoint (`/api/admin/attendance/summary`) with optional employee filtering (`userId`).
- 👥 **User Management (Admin):**
  - Employee user lifecycle management (CRUD), account status toggle (`isActive`), and role assignments.
- ⚙️ **Work Schedule & System Settings:**
  - Dynamically configurable schedule policies: work start time (`workStartTime`), work end time (`workEndTime`), and late tolerance window (`lateToleranceMinutes`).
- 📖 **Interactive Swagger Documentation:**
  - Interactive API playground at `/api/docs` with Bearer token authentication support.

---

## 📁 Directory Structure

```text
backend/
├── src/
│   ├── attendance/         # Attendance module (Check-in, Check-out, History, Summaries)
│   ├── auth/               # Auth module (JWT strategy, guards, roles)
│   ├── common/             # Decorators, filters, interceptors, & utilities
│   ├── health/             # Health check endpoint
│   ├── prisma/             # Prisma schema, client, & database seed scripts
│   │   ├── seed.ts             # Initial admin credentials & default settings
│   │   └── seed-attendance.ts  # Mock historical attendance logs for development
│   ├── settings/           # Work schedule & company policy configuration
│   ├── users/              # User profile & administrative management
│   ├── app.module.ts       # Root application module
│   └── main.ts             # Application entry point, global pipes, prefix, & Swagger setup
├── test/                   # Vitest E2E integration test suite
├── .env.example            # Environment variables template
├── package.json
└── tsconfig.json
```

---

## 🛠️ Installation & Setup

### 1. Prerequisites
- **Node.js** (v20+ recommended)
- **PostgreSQL** (v15+)

### 2. Clone Repository
```bash
git clone https://github.com/samilalghiffary/employee-attendance-be.git
cd employee-attendance-be
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables (`.env`)
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

Update the configuration variables in `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/employee_attendance?schema=public"
JWT_SECRET="your-secure-jwt-secret-key"
JWT_EXPIRES_IN="1d"
PORT=3001
```

### 5. Database Sync & Seeding
Emit the Prisma contract and seed the database with initial Admin credentials and settings:
```bash
# Emit Prisma contract & run migrations
npm run contract:emit

# Seed core system data (Admin user & work settings)
npm run db:seed

# (Optional) Seed realistic 1-month historical attendance records for testing
npm run db:seed:attendance
```

### 6. Run the Application

```bash
# Development (watch mode)
npm run start:dev

# Production build & run
npm run build
npm run start:prod
```

Once running:
- **API Base URL:** `http://localhost:3001/api`
- **Swagger Documentation:** `http://localhost:3001/api/docs`

---

## 🧪 Testing & Linting

```bash
# Run unit tests
npm run test

# Run E2E integration tests
npm run test:e2e

# Run test coverage
npm run test:cov

# Lint code (Oxlint)
npm run lint

# Format code (Prettier)
npm run format
```

---

## 📑 Core API Endpoints

| Method | Endpoint | Access / Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Application & database connection health check |
| `POST` | `/api/auth/register` | Public | Register a new user account |
| `POST` | `/api/auth/login` | Public | Authenticate and obtain JWT Bearer token |
| `GET` | `/api/users/profile` | Authenticated | Retrieve current user profile |
| `POST` | `/api/attendance/check-in` | Employee / Admin | Record daily check-in with GPS geolocation |
| `POST` | `/api/attendance/check-out` | Employee / Admin | Record daily check-out with GPS geolocation |
| `GET` | `/api/attendance/history` | Employee / Admin | Retrieve personal attendance history (supports sorting & pagination) |
| `GET` | `/api/attendance/my-summary` | Employee / Admin | Get personal attendance metrics summary (`startDate`, `endDate`) |
| `GET` | `/api/admin/attendance` | Admin | View company-wide attendance logs (filter by user, date, status, sorting) |
| `GET` | `/api/admin/attendance/summary` | Admin | Get aggregated attendance metrics (optional `userId`, `startDate`, `endDate`) |
| `GET` | `/api/admin/users` | Admin | List and manage all employees |
| `PATCH` | `/api/admin/users/:id/status`| Admin | Update employee active status (`isActive`) |
| `GET` | `/api/settings` | Authenticated | View current work schedule & policies |
| `PATCH` | `/api/admin/settings` | Admin | Update system work schedule and late tolerances |

For full request/response schemas, DTO models, and interactive testing, visit **[Swagger UI](http://localhost:3001/api/docs)**.

---

## 📄 License

UNLICENSED - Internal Project.
