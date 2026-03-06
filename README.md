## Running with Docker

### Prerequisites

- Docker
- Docker Compose

### Services

This project includes:

- `db`: PostgreSQL 16
- `api`: NestJS REST API

### Steps

1. Start the stack:

```bash
docker compose up -d

# Tennjor Backend (WhatsApp-First Shoe Store API)

Backend API for a WhatsApp-first online shoe store.
Built with **NestJS**, **Prisma**, and **PostgreSQL**, fully dockerized for local development and future production deployment.

---

## 🧱 Tech Stack

- **Framework:** NestJS (Node.js + TypeScript)
- **ORM:** Prisma
- **Database:** PostgreSQL 16
- **Containerization:** Docker + Docker Compose
- **Architecture:** Modular monolith (prepared for future microservices)

---

## 📦 Project Structure

```

src/
app.module.ts
main.ts
prisma/
prisma.module.ts
prisma.service.ts
users/
(future)
auth/
catalog/
admin/

````

---

## 🚀 Running the Project

You can run the project in two ways:

1. Locally (Node + Postgres installed on your machine)
2. Using Docker (recommended)

---

# 🐳 Running with Docker (Recommended)

## Prerequisites

- Docker
- Docker Compose

## Services

This project includes:

- `db`: PostgreSQL 16
- `api`: NestJS REST API

---

## 🔧 First Time Setup

### 1️⃣ Build and start containers

```bash
docker compose up -d --build
````

This will:

- Build the NestJS API image
- Start PostgreSQL
- Start the API on port `3000`

---

### 2️⃣ Run Prisma migrations

After containers are running:

```bash
npx prisma migrate dev --name init
```

If using Docker-only workflow later, this can be automated.

---

### 3️⃣ Verify API is running

Open:

```
http://localhost:3000/users
```

If everything is working, you should see:

```json
[]
```

---

## 🛑 Stopping Containers

```bash
docker compose down
```

To remove volumes (⚠ deletes DB data):

```bash
docker compose down -v
```

---

# 🧪 Running Without Docker

1. Make sure PostgreSQL is running locally.
2. Update `.env`:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/shoe_store_db?schema=public"
```

3. Run migrations:

```bash
npx prisma migrate dev
```

4. Start the app:

```bash
npm run start:dev
```

---

# 🌱 Prisma

Generate Prisma client:

```bash
npx prisma generate
```

Create migration:

```bash
npx prisma migrate dev --name <migration_name>
```

---

# 🔐 Environment Variables

Required environment variables:

```
DATABASE_URL=
NODE_ENV=
```

Future variables:

```
JWT_SECRET=
WHATSAPP_PHONE=
CLOUDINARY_URL=
```

---

# 🧠 Architecture Philosophy

This backend follows a **modular monolith** architecture:

- Clear domain separation (`auth`, `users`, `catalog`, `admin`)
- Controllers handle HTTP
- Services handle business logic
- Prisma handles persistence
- Ready to scale into microservices if needed

---

# 📈 Future Modules

- Auth (JWT-based admin login)
- Catalog (products, categories, variants)
- Admin (product management)
- File upload (Cloudinary/S3)
- Store configuration (WhatsApp number, etc.)

---

# 🏗 Development Workflow

Typical flow:

```bash
git checkout -b feature/<feature-name>
```

Commit style:

```
feat:
fix:
chore:
docs:
refactor:
```

Open Pull Request → Review → Merge into `main`.

---

# 📌 Production Notes

- Use environment variables (never commit secrets).
- Use production database instance.
- Enable proper logging.
- Consider health checks and rate limiting.
- Deploy API separately from frontend (Vercel + Railway/Fly.io).

---

# 👨‍💻 Author

Built as a full-stack portfolio project demonstrating:

- Clean architecture
- Dockerized development
- Scalable design
- Modern TypeScript backend practices
