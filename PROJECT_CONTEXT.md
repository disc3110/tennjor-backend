# Project Context — Tennjor Backend

## Overview

This repository contains the backend API for **Tennjor**, a wholesale shoe catalog platform for a shoe store based in Mexico.

The platform allows customers to browse products and request quotes instead of purchasing items directly online.

Unlike traditional e‑commerce systems, this application **does not include online payments or a shopping cart checkout**. Instead, the main conversion flow is based on contacting the business through **WhatsApp or email after selecting products and variants**.

The backend is responsible for:

- Managing the product catalog
- Managing product categories
- Managing product variants (sizes and colors)
- Storing quote requests
- Providing authentication for admin users
- Managing product images
- Exporting admin data to CSV (products, categories, dashboard stats + quote requests)

The backend exposes a **REST API** that is consumed by a **Next.js frontend application**.

---

# Technology Stack

Framework: NestJS  
Language: TypeScript  
Database: PostgreSQL  
ORM: Prisma  
Containerization: Docker / Docker Compose  
Image hosting: Cloudinary

---

# Architecture

The backend follows a **modular monolith architecture**.

The project is organized by **domain modules**, allowing the system to scale in the future if it needs to be split into microservices.

Typical structure:

```
src/
  modules/
    auth/
    users/
    catalog/
    quotes/
    admin/
```

Each module typically contains:

- controller
- service
- DTOs
- validation logic

Shared utilities should live under common paths when cross-domain reuse is needed.
Example in current codebase:

- `src/common/utils/csv.util.ts` for CSV serialization
- `src/auth/guards/admin-role.guard.ts` for ADMIN-only protection

### Design Rules

Controllers should:

- validate incoming requests
- call services
- return responses

Services should:

- contain business logic
- interact with the database via Prisma

Database access should be centralized through **Prisma Client**.

---

# Core Domains

## Auth

Handles authentication for admin users.

Responsibilities:

- login
- password hashing
- JWT token generation
- authentication guards

---

## Users

Represents administrators of the platform.

Responsibilities:

- admin account management
- authentication integration

---

## Catalog

Handles all product catalog data.

Entities include:

- Categories
- Products
- Product variants
- Product images

Products support:

- multiple sizes
- multiple colors
- multiple images

---

## Quotes

Handles quote requests sent by customers.

Customers can:

- select products
- choose size and color
- include notes
- send a quote request

Quotes are stored so that administrators can later respond with pricing or availability.

---

## Admin

Admin-only operations.

Responsibilities:

- create products
- update products
- delete products
- manage categories
- upload product images
- activate or deactivate products
- export products/categories/dashboard data as CSV files

CSV export routes currently available:

- `GET /admin/products/export/csv`
- `GET /admin/categories/export/csv`
- `GET /admin/dashboard/stats/export/csv`

Notes:

- CSV export endpoints return `text/csv` with `Content-Disposition: attachment`.
- Dashboard CSV includes multiple sections in one file:
  - summary
  - quotesByStatus
  - topRequestedProducts
  - quoteRequests
- CSV export endpoints are protected with JWT + explicit ADMIN role guard (`AdminRoleGuard`).

---

# Database

Database engine: PostgreSQL  
ORM: Prisma

Example entities:

- User
- Category
- Product
- Variant
- ProductImage
- Quote
- QuoteItem

The schema is defined in `prisma/schema.prisma`.

---

# Environment Variables

Typical environment variables used by the project:

```
DATABASE_URL=
JWT_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
WHATSAPP_PHONE_NUMBER=
```

Sensitive values should always be stored in `.env` and never committed to the repository.

---

# Development Workflow

Start services with Docker:

```
docker compose up
```

Run migrations:

```
npx prisma migrate dev
```

Seed the database:

```
npx prisma db seed
```

---

# Integration with Frontend

This backend is consumed by a **Next.js frontend application**.

The frontend calls this API to:

- fetch categories
- fetch products
- fetch product details
- send quote requests
- download CSV exports for admin reporting

The frontend communicates with the backend using REST endpoints exposed by NestJS controllers.

---

# Guidelines for Automated Agents

This file provides context for automated code agents such as **Codex**.

When analyzing or modifying this repository, agents should:

- respect the modular architecture
- avoid unnecessary architectural refactoring
- keep controllers thin and business logic inside services
- avoid introducing tight coupling between modules
- analyze code before making changes

Major architectural changes should only be made if explicitly requested.

---

# API Design Guidelines

All REST endpoints should follow consistent API conventions.

### Response Structure

Current API response style is **mixed by endpoint**:

- Many admin/public JSON endpoints return either:
  - `{ data: ... }`
  - `{ message: string, data: ... }`
  - raw arrays/objects for some public routes
- CSV export endpoints return raw CSV string responses with:
  - `Content-Type: text/csv; charset=utf-8`
  - download filename in `Content-Disposition`

When adding new endpoints, keep response shape explicit and consistent within each domain module.

### Validation

All request payloads must be validated using **DTOs and class-validator**.

Controllers should never trust raw request bodies.

Example responsibilities:

Controller:

- receive request
- validate DTO
- call service

Service:

- implement business logic
- interact with Prisma

### HTTP Conventions

Standard REST patterns should be used:

GET

- fetch resources

POST

- create resources

PATCH

- partial updates

DELETE

- remove resources

Avoid placing business logic inside controllers.

---

# Git Workflow

This project follows a structured Git workflow suitable for professional development.

### Branch Strategy

Main branches:

`main`

- production-ready code

`dev`

- active development

Feature branches should be created from `dev`.

Example branch names:

```
feat/catalog-api
feat/quote-system
fix/product-slug
refactor/catalog-service
```

### Commit Convention

Commits should follow conventional commit style:

```
feat: add product catalog endpoint
fix: resolve slug routing issue
refactor: separate quote service logic
chore: update docker configuration
```

### Pull Requests

Each feature branch should open a Pull Request into `dev`.

PRs should include:

- description of the feature
- summary of changes
- screenshots or API examples if relevant

---

# Scalability Considerations

Although this backend is currently a modular monolith, it is designed to evolve if the business grows.

Possible future improvements include:

- extracting catalog service
- introducing inventory management
- adding pricing rules
- implementing microservices
- adding message queues for async processes

The current architecture keeps modules loosely coupled to make these transitions easier.

---

# Project Goal

The goal of this project is to build a **clean, scalable backend architecture suitable for a professional portfolio and real production usage**, while keeping the system simple enough for a small to medium-sized business.

The system should remain easy to extend in the future if the business grows and requires features such as:

- microservices
- inventory tracking
- pricing systems
- payment integration
