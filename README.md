# CX Assessment — Backend API

Enterprise-grade NestJS REST API with JWT authentication and multi-stage form workflow.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 11 |
| Language | TypeScript 5 |
| Database | PostgreSQL 16 (TypeORM) |
| Auth | JWT (argon2 hashing) + Passport |
| File Upload | Multer (AWS S3 storage) |
| Docs | Swagger / OpenAPI |
| Security | Helmet, Cookie-parser, CORS |

---

## Quick Start

### 1. Prerequisites

- Node.js ≥ 20
- Docker (for PostgreSQL) — or a local PostgreSQL instance

### 2. Clone & Install

```bash
cd cx-backend
npm install
```

### 3. Start PostgreSQL

```bash
docker-compose up -d
```

### 4. Configure Environment

```bash
cp .env .env.local   # edit if needed
```

Default `.env`:
```
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cx_assessment
JWT_ACCESS_SECRET=super_secret_access_key_change_me_in_prod
JWT_REFRESH_SECRET=super_secret_refresh_key_change_me_in_prod
NODE_ENV=development

AWS_ACCESS_KEY=your_access_key
AWS_SECRET_KEY=your_secret_key
AWS_S3_BUCKET_NAME=cx-assessment
AWS_REGION=ap-south-1
```

### 5. Run

```bash
npm run start:dev    # development (watch mode)
npm run start:prod   # production
```

Server: `http://localhost:3000/api/v1`  
Swagger: `http://localhost:3000/api/docs`

---

## API Reference

### Base URL: `/api/v1`

### Auth Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/auth/register` | Register new user | Public |
| POST | `/auth/login` | Login with email + password | Public |
| POST | `/auth/refresh` | Refresh tokens (rotation) | Refresh token |
| POST | `/auth/logout` | Logout + invalidate refresh token | Access token |

### Forms Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/forms` | Create new form | ✅ |
| GET | `/forms` | List forms (paginated) | ✅ |
| GET | `/forms/:id` | Get form by ID (for resume) | ✅ |
| POST | `/forms/:id/stage/1` | Basic Information | ✅ |
| POST | `/forms/:id/stage/2` | Address Details | ✅ |
| POST | `/forms/:id/stage/3` | Professional Details | ✅ |
| POST | `/forms/:id/stage/4` | Document Upload (files) | ✅ |
| POST | `/forms/:id/stage/5` | Emergency Contact | ✅ |
| POST | `/forms/:id/submit` | Submit form | ✅ |

### Pagination

```
GET /api/v1/forms?page=1&limit=10&status=in-progress
```

Response:
```json
{
  "data": [...],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 10,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

## Form Stages

All stage endpoints accept `multipart/form-data`.

### Stage 1 — Basic Information
```
firstName, lastName, email, phone, dateOfBirth?, gender?
```

### Stage 2 — Address Details
```
addressLine1, addressLine2?, city, state, pincode, country?
```

### Stage 3 — Professional Details
```
company, designation, yearsOfExperience, skills?, linkedInUrl?, portfolioUrl?
```

### Stage 4 — Document Upload
```
photoId   (file, required): PDF/JPG/PNG, max 5MB
resume    (file, required): PDF/JPG/PNG, max 5MB
additionalDocuments (files, optional): up to 3 files
```

### Stage 5 — Emergency Contact
```
emergencyContactName, emergencyContactPhone, emergencyContactRelationship
```

### Submit
```
POST /api/v1/forms/:id/submit
Validates all stages are complete before marking as submitted.
```

---

## Auth Flow

```
1. POST /auth/register  → returns { accessToken, refreshToken }
                        → sets httpOnly cookies: access_token (1min), refresh_token (7d)

2. POST /auth/login     → same as register

3. POST /auth/refresh   → requires valid refresh_token (cookie or Authorization: Bearer <rt>)
                        → issues NEW token pair (rotation — old RT invalidated)

4. POST /auth/logout    → clears cookies + nullifies hashed RT in DB
```

### Using Bearer Token
```
Authorization: Bearer <accessToken>
```

### Using Cookies
Cookies are set automatically. Browsers send them automatically.

---

## Response Envelope

All responses are wrapped:
```json
{
  "success": true,
  "statusCode": 200,
  "timestamp": "2026-05-14T17:00:00.000Z",
  "data": { ... }
}
```

Error responses:
```json
{
  "success": false,
  "statusCode": 400,
  "timestamp": "2026-05-14T17:00:00.000Z",
  "path": "/api/v1/forms/abc/stage/4",
  "message": "Photo ID document is required"
}
```

---

## Security

- Passwords hashed with **argon2** (winner of PHC, state of the art)
- Refresh tokens **hashed with argon2** before storage (double-protection)
- **Token rotation** — every refresh issues a new pair and invalidates the old one
- **HTTP-only cookies** — XSS-resistant token storage
- **Helmet** — sets 14 security headers
- **ValidationPipe** with `whitelist: true` — strips unknown fields
- JWT secrets never logged

---

## File Upload

- Files stored in **AWS S3** with UUID filenames
- Allowed types: PDF, JPG, PNG
- Max size: 5MB per file
- Stage 4 requires exactly: `photoId` + `resume` (named fields)
- Files are publicly accessible via the S3 URL (using `public-read` ACL)

---

## Project Structure

```
src/
├── main.ts                   # Bootstrap (swagger, cors, pipes, cookies)
├── app.module.ts             # Root module
├── common/
│   ├── decorators/           # @GetUser()
│   ├── filters/              # HttpExceptionFilter
│   └── interceptors/         # TransformInterceptor (response envelope)
├── users/
│   ├── user.entity.ts
│   ├── users.module.ts
│   └── users.service.ts
├── auth/
│   ├── dto/                  # RegisterDto, LoginDto
│   ├── guards/               # JwtAuthGuard, JwtRefreshGuard
│   ├── stratergies/          # JwtStrategy, JwtRefreshStrategy
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   └── auth.service.ts
└── forms/
    ├── dto/                  # Stage1Dto … Stage5Dto
    ├── multer/               # multerConfig (storage, filter, limits)
    ├── forms.entity.ts
    ├── forms.controller.ts
    ├── forms.module.ts
    └── forms.service.ts
```
