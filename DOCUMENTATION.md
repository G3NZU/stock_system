# Stock System – Complete Project Documentation

> **Who is this for?** Someone learning software engineering who wants to understand every detail of this project – what technologies are used, why they were chosen, how the pieces fit together, and where the project goes next.

---

## Table of Contents

1. [What Is This Project?](#1-what-is-this-project)
2. [Technology Stack](#2-technology-stack)
3. [Architecture Overview](#3-architecture-overview)
4. [Project Folder Structure](#4-project-folder-structure)
5. [Database – The Foundation](#5-database--the-foundation)
   - [Tables & Relationships](#tables--relationships)
   - [Row Level Security (RLS)](#row-level-security-rls)
   - [Database Functions (RPCs)](#database-functions-rpcs)
6. [Backend – The Express API](#6-backend--the-express-api)
7. [Frontend – The Next.js Application](#7-frontend--the-nextjs-application)
   - [App Router & Pages](#app-router--pages)
   - [Authentication Flow](#authentication-flow)
   - [Role-Based Dashboards](#role-based-dashboards)
   - [Tailwind CSS Styling](#tailwind-css-styling)
8. [How Data Flows End-to-End](#8-how-data-flows-end-to-end)
9. [Environment Variables & Configuration](#9-environment-variables--configuration)
10. [Testing](#10-testing)
11. [Scripts & Developer Workflow](#11-scripts--developer-workflow)
12. [How the Project Was Built – Step by Step](#12-how-the-project-was-built--step-by-step)
13. [What Comes Next – The Roadmap](#13-what-comes-next--the-roadmap)
14. [Glossary – Key Terms Explained](#14-glossary--key-terms-explained)

---

## 1. What Is This Project?

**Stock System** is a web-based inventory management application designed for **construction companies**. Imagine a company that is building several sites at once. Each site has multiple projects, each project has physical locations (a main warehouse, floors in a building, outdoor storage, etc.), and items (cement bags, steel rods, PPE) that need to be tracked.

The system lets different people with different jobs manage the inventory:

| Role | What they do |
|------|-------------|
| **Admin (boss)** | Oversees everything; reads all data across sites and projects; cannot directly manipulate stock |
| **Warehouse Operator** | Receives goods, adds them to stock, removes stock, transfers between locations, and handles enquiries |
| **Manager** | Views stock levels and orders to make decisions; creates enquiries to request items or orders |
| **Buyer** | Creates and manages purchase orders with suppliers; handles enquiries routed to them |

The project is in **active development** – the core data model, security, and read-only dashboards are working. The interactive parts (buttons that actually perform actions) are placeholders for the next phase.

---

## 2. Technology Stack

This section explains every technology used and **why** it was chosen.

### 2.1 TypeScript

**What it is:** TypeScript is JavaScript with a type system layered on top. You declare what shape your data has (e.g. `{ id: string; name: string }`) and the compiler tells you when you use it wrongly.

**Why it's used here:** Both the frontend and backend are written in TypeScript. It catches bugs before the code even runs, makes code easier to understand (you always know what a function expects and returns), and improves IDE auto-complete.

```typescript
// Example: TypeScript catches mistakes at compile time
interface Site {
  id: string
  name: string
  location: string
}

const site: Site = { id: '123', name: 'Demo Site' }
// TS Error: Property 'location' is missing
```

### 2.2 React 19

**What it is:** React is a JavaScript library for building user interfaces. You write small, reusable pieces called **components** and React efficiently updates the browser when your data changes.

**Why it's used here:** React is the most widely used UI library in the industry. It has a massive ecosystem and makes building interactive UIs much easier than raw HTML/JS.

**Key concept – components:** Everything you see on screen is a component. `NavBar`, `AdminDashboard`, `LoginPage` are all React components – JavaScript functions that return JSX (HTML-like syntax mixed with JavaScript logic).

```tsx
// A simple React component
function WelcomeBanner({ userName }: { userName: string }) {
  return <h1 className="text-2xl font-bold">Welcome, {userName}!</h1>
}
```

### 2.3 Next.js 16

**What it is:** Next.js is a framework built on top of React. It provides routing, server-side rendering, image optimization, and many other features out of the box.

**Why it's used here:** Without Next.js, you'd have to configure all of this manually. Next.js uses the **App Router** (the `app/` directory), where each folder with a `page.tsx` file becomes a URL route automatically.

```
app/
  page.tsx           → http://localhost:3000/
  login/
    page.tsx         → http://localhost:3000/login
  dashboard/
    page.tsx         → http://localhost:3000/dashboard
```

**Key Next.js concepts used:**
- `'use client'` directive – marks a component as running in the browser (not on the server), required for hooks like `useState` and `useEffect`
- `useRouter` – programmatically navigates to a different page
- `usePathname` – reads the current URL path
- `Metadata` export – sets the browser tab title and description

### 2.4 Tailwind CSS 4

**What it is:** Tailwind is a CSS framework where instead of writing `.button { background: blue; padding: 8px }` in a separate CSS file, you apply small utility classes directly in the HTML: `className="bg-blue-600 px-2 py-1"`.

**Why it's used here:** Tailwind makes it fast to style components without switching between files. Every class does one thing (padding, colour, font size, etc.), and the final CSS bundle only includes classes you actually use.

```tsx
// Tailwind classes inline – no separate CSS needed
<button className="bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700">
  Submit
</button>
```

### 2.5 Express.js

**What it is:** Express is a minimal web framework for Node.js. You define HTTP routes (e.g. GET `/api/sites`) and what each route returns.

**Why it's used here:** The frontend (browser) cannot directly use the `SUPABASE_SERVICE_ROLE_KEY` (it's a secret). Instead, the Express backend holds the secret and exposes a safe public API. Any business logic that shouldn't run in the browser lives here.

```typescript
// An Express route
router.get('/', async (_req, res) => {
  const { data, error } = await supabase.from('sites').select('*')
  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})
```

### 2.6 Supabase

**What it is:** Supabase is an open-source "Backend-as-a-Service" (BaaS) built on top of **PostgreSQL**. It provides:
- A PostgreSQL database
- An auto-generated REST and GraphQL API
- Authentication (user accounts, sessions, JWTs)
- Row Level Security enforcement
- Real-time subscriptions
- A web-based Studio UI for managing the database
- A CLI for local development

**Why it's used here:** Instead of building a custom auth system and database API from scratch, Supabase provides all of that. You can run it **locally** with `supabase start` (it spins up Docker containers) which is ideal for development.

**Two Supabase clients in this project:**

| Client | Key used | Where used | Purpose |
|--------|----------|------------|---------|
| `@supabase/supabase-js` (anon) | `SUPABASE_ANON_KEY` | Frontend browser | Limited access, protected by RLS policies |
| `@supabase/supabase-js` (service role) | `SUPABASE_SERVICE_ROLE_KEY` | Backend server | Full admin access, bypasses RLS |

### 2.7 PostgreSQL (via Supabase)

**What it is:** PostgreSQL (often called "Postgres") is one of the most powerful open-source relational databases. Data is stored in tables with rows and columns. Tables link to each other via **foreign keys**.

**Why it's used here:** The data model (sites → projects → locations → inventory) is inherently relational. PostgreSQL handles complex queries efficiently and supports advanced features like Row Level Security, stored functions, and transactions.

### 2.8 Vitest

**What it is:** Vitest is a fast testing framework for JavaScript/TypeScript (similar to Jest but faster).

**Why it's used here:** The RLS (Row Level Security) policies are tested automatically. The tests sign in as different users and verify that the database correctly allows or blocks their actions.

### 2.9 Node.js & npm

**What it is:** Node.js lets you run JavaScript/TypeScript on your computer (not just in a browser). npm (Node Package Manager) manages all the third-party libraries the project depends on.

**Why it's used here:** Both the Express backend and the Next.js frontend run on Node.js. npm scripts (in `package.json`) are used to start the app, run tests, and manage the database.

### 2.10 Concurrently

**What it is:** A small npm package that runs multiple commands at the same time in one terminal.

**Why it's used here:** The project has two servers to run (frontend on port 3000, backend on port 4000). `concurrently` starts both with one command: `npm run dev`.

### 2.11 dotenv

**What it is:** A library that reads a `.env` file and loads the values as environment variables accessible via `process.env`.

**Why it's used here:** Secrets (like database keys) should never be hardcoded in source code. They live in `.env` files that are gitignored (not committed to the repository).

---

## 3. Architecture Overview

The project follows a **three-tier architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                     BROWSER (User)                           │
│                                                             │
│    Next.js Frontend (React + Tailwind)                      │
│    http://localhost:3000                                     │
│    - Login page                                             │
│    - Role-based dashboards                                  │
│    - Talks to Backend API via fetch()                       │
└───────────────────┬──────────────────────┬──────────────────┘
                    │ HTTP (fetch)          │ Supabase JS client
                    │ http://localhost:4000 │ (anon key, for auth)
                    ▼                       ▼
┌─────────────────────────────┐  ┌──────────────────────────────┐
│  Express Backend API        │  │  Supabase Auth               │
│  http://localhost:4000      │  │  http://localhost:54321/auth  │
│  - /api/sites               │  │  - signInWithPassword        │
│  - /api/projects            │  │  - JWT token management      │
│  - /api/items               │  └──────────────────────────────┘
│  - /api/inventory           │
│  - /api/orders              │
│  Uses service role key      │
└───────────────┬─────────────┘
                │ Service Role Key (admin access)
                ▼
┌─────────────────────────────────────────────────────────────┐
│                 Supabase / PostgreSQL                        │
│                 http://localhost:54321                       │
│                                                             │
│  Tables: sites, projects, locations, items, inventory,      │
│          orders, order_items, enquiries, roles, users, ...  │
│                                                             │
│  Row Level Security (RLS): enforces who can see/edit what   │
│  Database Functions (RPCs): add_stock, create_order, ...    │
└─────────────────────────────────────────────────────────────┘
```

**Key architectural decisions:**

1. **Why a separate Express backend?** The frontend (browser) can't safely store the `SUPABASE_SERVICE_ROLE_KEY`. The backend holds this key and exposes only what the frontend needs. In the future, the backend will also handle complex business logic, validation, and authentication.

2. **Why does the frontend also use Supabase directly?** For authentication (`supabase.auth.signInWithPassword`). Auth tokens are needed in the browser. The frontend uses the `ANON_KEY` which has limited permissions enforced by RLS.

3. **Why RLS at the database level?** Security at the database level means that even if the application code has a bug, unauthorised data access is blocked by PostgreSQL itself. RLS is the last line of defence.

---

## 4. Project Folder Structure

```
stock_system/                          ← Root of the project
│
├── package.json                       ← Root scripts (npm run dev, npm test, etc.)
├── README.md                          ← Quick-start guide
├── DOCUMENTATION.md                   ← This file!
│
├── frontend/                          ← The Next.js web application
│   ├── package.json                   ← Frontend dependencies (React, Next.js, Tailwind)
│   ├── next.config.ts                 ← Next.js configuration
│   ├── tsconfig.json                  ← TypeScript configuration for frontend
│   ├── eslint.config.mjs              ← Code style/linting rules
│   ├── postcss.config.mjs             ← Required for Tailwind CSS to work
│   ├── .env.example                   ← Template for environment variables
│   │
│   ├── app/                           ← Next.js App Router – each folder = a URL route
│   │   ├── layout.tsx                 ← Root layout: wraps every page with AuthProvider + NavBar
│   │   ├── globals.css                ← Global CSS (Tailwind imports)
│   │   ├── page.tsx                   ← Root page "/" – redirects to /dashboard
│   │   ├── login/
│   │   │   └── page.tsx               ← Login page (/login)
│   │   ├── dashboard/
│   │   │   └── page.tsx               ← Dashboard router – picks correct dashboard by role
│   │   └── _reference/                ← Reference/placeholder pages (not in use yet)
│   │       ├── inventory/page.tsx
│   │       ├── items/page.tsx
│   │       ├── orders/page.tsx
│   │       └── projects/page.tsx
│   │
│   ├── components/                    ← Reusable React components
│   │   ├── NavBar.tsx                 ← Top navigation bar (shown on all protected pages)
│   │   ├── ProtectedLayout.tsx        ← Redirects unauthenticated users to /login
│   │   └── dashboards/
│   │       ├── AdminDashboard.tsx     ← Dashboard for admin/boss role
│   │       ├── WarehouseOperatorDashboard.tsx
│   │       ├── ManagerDashboard.tsx
│   │       └── BuyerDashboard.tsx
│   │
│   ├── lib/                           ← Shared utilities and logic
│   │   ├── supabase.ts                ← Creates and exports the Supabase browser client
│   │   ├── auth.ts                    ← Auth types, session helpers, mock login logic
│   │   ├── AuthContext.tsx            ← React Context: shares auth state across all components
│   │   └── api.ts                     ← Helper function for calling the Express backend
│   │
│   └── public/                        ← Static files (images, icons)
│
├── backend/                           ← The Express.js API server
│   ├── package.json                   ← Backend dependencies (express, cors, supabase-js)
│   ├── tsconfig.json                  ← TypeScript configuration for backend
│   ├── .env.example                   ← Template for environment variables
│   │
│   └── src/
│       ├── index.ts                   ← Entry point: creates Express app, registers routes
│       └── lib/
│       │   └── supabase.ts            ← Creates Supabase client using SERVICE_ROLE_KEY
│       └── routes/
│           ├── sites.ts               ← GET /api/sites, GET /api/sites/:id
│           ├── projects.ts            ← GET /api/projects, GET /api/projects/:id
│           ├── items.ts               ← GET /api/items, GET /api/items/:id
│           ├── inventory.ts           ← GET /api/inventory
│           └── orders.ts              ← GET /api/orders, GET /api/orders/:id
│
├── supabase/                          ← Supabase local development configuration
│   ├── config.toml                    ← Supabase local settings (ports, auth config, etc.)
│   └── migrations/                    ← SQL files that define the database schema
│       ├── 20260226152409_remote_schema.sql     ← Initial schema (tables, functions)
│       ├── 20260226171555_remote_schema.sql     ← Schema updates (order_items fix)
│       ├── 20260226175113_rls_project_only_and_lockdown.sql  ← Full RLS policies
│       ├── 20260226182243_items_soft_delete_and_permissions.sql
│       ├── 20260226191253_fix_projects_policy_recursion.sql
│       ├── 20260226192233_fix_rls_recursion_roles_management.sql
│       ├── 20260226193922_fix_projects_policies_no_helpers.sql
│       ├── 20260226194737_fix_projects_select_policy_inline.sql
│       ├── 20260226195823_fix_project_user_roles_select_recursion.sql
│       └── 20260226200631_update_create_order_require_supplier.sql
│
├── scripts/
│   └── seed-local.mjs                 ← Creates test users and data in the local database
│
└── tests/
    └── rls.test.ts                    ← Tests that verify RLS policies work correctly
```

---

## 5. Database – The Foundation

The database is the heart of the system. All state (users, sites, inventory, orders) is stored here.

### Tables & Relationships

Here is the complete data model with every table explained:

```
auth.users (managed by Supabase)
    │
    │ trigger: handle_new_user
    ▼
public.users           ← Your own profile table (mirrors Supabase auth user)
    id, email, full_name, created_at

public.roles           ← Lookup table: 'admin', 'warehouse', 'manager', 'buyer'
    id, name

public.sites           ← A construction site
    id, name, location, owner_id → users.id, created_at

public.site_members    ← Who has access to a site
    id, site_id → sites.id, user_id → users.id, created_at

public.projects        ← A project within a site
    id, site_id → sites.id, name, description, created_at

public.project_user_roles  ← Which role does each user have in a project?
    id, user_id → users.id, project_id → projects.id,
    role_id → roles.id, is_active, elevated_permissions (JSONB), created_at

public.locations       ← A physical location within a project (e.g. "Main Store", "Floor 2")
    id, project_id → projects.id, name, created_at

public.items           ← A type of item (e.g. "Cement Bag" SKU: CEM-001)
    id, project_id → projects.id, name, sku, description, unit_type, is_active, created_at

public.inventory       ← How many of an item are at a location RIGHT NOW
    id, item_id → items.id, location_id → locations.id, quantity, updated_at
    (unique per item+location pair)

public.stock_movements ← Audit log: every time stock moved (IN / OUT / TRANSFER)
    id, project_id, item_id, from_location_id, to_location_id,
    quantity, movement_type, created_by, created_at, notes

public.orders          ← A purchase order to a supplier
    id, project_id → projects.id, created_by → users.id,
    supplier_name, delivery_location_id, status, expected_delivery_date, created_at

public.order_items     ← A line item within an order
    id, order_id → orders.id, item_id → items.id, quantity, unit_cost

public.deliveries      ← When an order was physically received
    id, order_id → orders.id, received_by → users.id, received_at, notes

public.enquiries       ← A request from one role to another (e.g. manager → warehouse)
    id, project_id, requested_by → users.id, item_id → items.id,
    quantity, delivery_location_id, assigned_role ('warehouse'|'buyer'),
    status ('OPEN'|'IN_PROGRESS'|'RESOLVED'|'REJECTED'), notes, created_at

public.enquiry_status_history  ← Audit log: every status change on an enquiry
    id, enquiry_id → enquiries.id, old_status, new_status,
    changed_by → users.id, changed_at
```

**Entity Relationship Diagram (simplified):**

```
sites ──< site_members >── users
  │                          │
  └──< projects              │
            │                │
            ├──< project_user_roles >── roles
            │
            ├──< locations
            │       │
            │       └──< inventory >── items
            │
            ├──< items
            │       │
            │       └──< stock_movements
            │
            ├──< orders
            │       │
            │       ├──< order_items >── items
            │       └──< deliveries
            │
            └──< enquiries
                    │
                    └──< enquiry_status_history
```

**Key design choices:**
- `inventory` is a **current state** table (how much is there now). The history is in `stock_movements`.
- `items.is_active` is a **soft delete** flag. Items are never deleted; they're just marked inactive. This preserves historical data (past orders and enquiries still reference them).
- `orders.status` starts as `PENDING` and progresses through a lifecycle.
- `enquiries.assigned_role` determines which role is responsible for acting on the request.

### Row Level Security (RLS)

**What is RLS?** Row Level Security is a PostgreSQL feature that automatically filters which rows a database user can see or modify. It's like a WHERE clause that gets applied to every single query automatically.

**Why is this important?** Without RLS, a bug in the application code could expose all data to all users. With RLS, the database itself enforces access rules regardless of what the application does.

**How it works in this project:**

Every table in the `public` schema has RLS enabled. When someone queries the database, PostgreSQL checks the RLS policies before returning data.

Policies are based on helper functions that check the current user's role:

```sql
-- "Am I a member of this project?"
CREATE FUNCTION user_is_project_member(p_project_id uuid) RETURNS boolean AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM project_user_roles pur
            WHERE pur.project_id = p_project_id
              AND pur.user_id = auth.uid()
              AND pur.is_active = true)
    OR EXISTS (SELECT 1 FROM projects p
               WHERE p.id = p_project_id
                 AND user_is_site_owner(p.site_id))
  )
$$ LANGUAGE sql SECURITY DEFINER;
```

These helper functions use `SECURITY DEFINER` which means they run with the privileges of the function *owner* (postgres), not the calling user. This is required to avoid infinite recursion when RLS policies check tables that themselves have RLS.

**Summary of who can do what:**

| Table | Read | Write |
|-------|------|-------|
| `sites` | Site owner only | Site owner only |
| `site_members` | Site owner | Site owner |
| `projects` | Project members + site owner | Site owner |
| `project_user_roles` | Site owner | Site owner |
| `locations` | Project members | admin/warehouse roles or site owner |
| `items` | Project members | admin/buyer/warehouse roles or site owner |
| `inventory` | Project members | admin/warehouse roles or site owner |
| `stock_movements` | Project members | admin/warehouse roles or site owner |
| `orders` | Project members | admin/buyer roles or site owner |
| `order_items` | Project members | admin/buyer roles or site owner |
| `deliveries` | Project members | admin/warehouse roles or site owner |
| `enquiries` | Project members | Any project member |
| `enquiry_status_history` | Project members | (via functions) |

**Anon users (not logged in) are blocked from everything.** This was enforced by revoking all permissions from the `anon` role:

```sql
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
```

### Database Functions (RPCs)

"RPC" stands for Remote Procedure Call. These are stored functions in PostgreSQL that you call like an API endpoint. They run complex logic atomically (all-or-nothing) and enforce permissions themselves.

| Function | Who can call it | What it does |
|----------|----------------|--------------|
| `create_site(site_name, site_location)` | Any authenticated user | Creates a site and adds the creator as owner/member |
| `add_site_member(p_site_id, p_user_id)` | Site owner | Adds a user to a site |
| `assign_project_role(p_project_id, p_user_id, p_role_name)` | Site owner | Gives a user a role in a project |
| `add_stock(p_project_id, p_item_id, p_location_id, p_quantity)` | admin/warehouse | Adds quantity to inventory + logs a stock movement |
| `remove_stock(p_project_id, p_item_id, p_location_id, p_quantity)` | admin/warehouse | Removes quantity from inventory (checks for insufficient stock) + logs movement |
| `transfer_stock(p_project_id, p_item_id, p_from_location, p_to_location, p_quantity)` | admin/warehouse | Moves stock between locations (calls remove + add internally) |
| `create_order(p_project_id, p_supplier_name)` | admin/buyer | Creates a new purchase order |
| `add_order_item(p_order_id, p_item_id, p_quantity, p_unit_cost)` | admin/buyer | Adds a line item to an order |
| `create_enquiry(p_project_id, p_item_id, p_quantity, p_delivery_location_id, p_assigned_role, p_notes)` | Any project member | Creates a new enquiry request |
| `update_enquiry_status(p_enquiry_id, p_status)` | admin or assigned role | Changes enquiry status with validation and audit logging |
| `update_order_status(p_order_id, p_status)` | (to be restricted) | Updates an order's status |

**Why use RPCs instead of direct table INSERT/UPDATE?**
1. **Atomicity** – `transfer_stock` removes from one location and adds to another in a single transaction. If one part fails, the whole thing is rolled back.
2. **Business logic** – `add_stock` automatically creates an `inventory` row if one doesn't exist, or increments the quantity if it does. This logic lives once in the database.
3. **Security** – Each function checks the caller's role before doing anything. Even if RLS is misconfigured, the function will refuse.

**`handle_new_user` trigger:** This is a special database trigger that fires automatically whenever a new user registers via Supabase Auth. It creates a matching row in `public.users` so the app can join auth data with profile data.

---

## 6. Backend – The Express API

The backend is a Node.js server that sits between the frontend and the database.

**File: `backend/src/index.ts`** – The entry point:

```typescript
import express from 'express'
import cors from 'cors'
// ... route imports

const app = express()
app.use(cors())           // Allows the frontend (different port) to call this API
app.use(express.json())   // Parses JSON request bodies

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/sites', sitesRouter)
app.use('/api/projects', projectsRouter)
// ...

app.listen(4000)
```

**CORS (Cross-Origin Resource Sharing):** Browsers block requests from `http://localhost:3000` (frontend) to `http://localhost:4000` (backend) by default because they're different "origins". The `cors()` middleware tells the backend to allow these requests.

**File: `backend/src/lib/supabase.ts`** – The Supabase admin client:

```typescript
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
```

This uses the `SERVICE_ROLE_KEY` which **bypasses all RLS policies**. This is intentional because the backend is a trusted server that enforces its own access control. The `autoRefreshToken: false, persistSession: false` options are important for server-side use (no user sessions to manage here).

**Route pattern (example: `backend/src/routes/sites.ts`):**

```typescript
// GET /api/sites
router.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from('sites')
    .select('id, name, location, created_at')
    .order('created_at', { ascending: false })
  
  if (error) return res.status(500).json({ error: error.message })
  return res.json(data || [])
})

// GET /api/sites/:id
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('sites')
    .select('id, name, location, created_at')
    .eq('id', req.params.id)   // WHERE id = ?
    .single()                   // Expect exactly one row
  
  if (error) {
    if (error.code === 'PGRST116') return res.status(404).json({ error: 'Site not found' })
    return res.status(500).json({ error: error.message })
  }
  return res.json(data)
})
```

**PGRST116** is the Supabase/PostgREST error code for "zero rows returned" when `.single()` is used. It's translated to an HTTP 404 (Not Found).

**Available API Endpoints:**

| Method | URL | Query Params | Description |
|--------|-----|-------------|-------------|
| GET | `/health` | – | Server health check |
| GET | `/api/sites` | – | List all sites |
| GET | `/api/sites/:id` | – | Get one site |
| GET | `/api/projects` | `?site_id=` | List projects (filter by site) |
| GET | `/api/projects/:id` | – | Get one project |
| GET | `/api/items` | `?project_id=` | List items (filter by project) |
| GET | `/api/items/:id` | – | Get one item |
| GET | `/api/inventory` | `?project_id=` | List inventory rows |
| GET | `/api/orders` | `?project_id=` | List orders |
| GET | `/api/orders/:id` | – | Get order with its line items |

---

## 7. Frontend – The Next.js Application

### App Router & Pages

Next.js 13+ uses the **App Router**. Every `page.tsx` file inside the `app/` directory becomes a web page.

**`app/layout.tsx`** is the root layout. It wraps **every** page in the application. This is where the `AuthProvider` and `ProtectedLayout` are set up:

```tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>           {/* Makes auth state available everywhere */}
          <ProtectedLayout>      {/* Handles redirects for unauthenticated users */}
            {children}           {/* The actual page content goes here */}
          </ProtectedLayout>
        </AuthProvider>
      </body>
    </html>
  )
}
```

### Authentication Flow

The auth system is currently **mocked** (simulated locally), with a clear path to replace it with real authentication.

**Current flow:**

```
1. User visits http://localhost:3000
2. ProtectedLayout checks: is user authenticated?
   - No → redirect to /login
   - Yes → show the page + NavBar
3. On /login page:
   - User enters email + password + selects role
   - OR clicks a "Quick Login" button (for testing)
4. login() in AuthContext calls mockLoginUser()
   - mockLoginUser() checks hardcoded MOCK_USERS object
   - Creates a fake session with a random token
   - Session is saved to localStorage
5. User is redirected to /dashboard
6. Dashboard page reads user.role and renders the correct dashboard component
7. On logout: session cleared from localStorage, redirected to /login
```

**Why localStorage?** It persists the session across page refreshes. When the page loads, `AuthContext` reads from localStorage and restores the session if it hasn't expired (24-hour expiry).

**Important:** The current mock auth does NOT connect to Supabase Auth or the backend. The `TODO` comment in `AuthContext.tsx` marks where a real API call should go.

**Key files:**

- **`lib/auth.ts`** – Types (`UserRole`, `User`, `AuthSession`), localStorage helpers (`saveSession`, `getSession`, `clearSession`), the mock login function, and permission-check helper functions.

- **`lib/AuthContext.tsx`** – A React Context. Context is a way to share data across many components without passing it through props at every level. Any component can call `useAuth()` to get the current user, login function, and logout function.

- **`components/ProtectedLayout.tsx`** – A component that guards all pages. It uses `useEffect` to run after the component mounts in the browser (important because localStorage doesn't exist on the server). It redirects unauthenticated users to `/login` and already-authenticated users away from `/login`.

### Role-Based Dashboards

`app/dashboard/page.tsx` is a router: it reads the user's role and renders the appropriate dashboard component:

```tsx
switch (user.role) {
  case 'admin':           return <AdminDashboard />
  case 'warehouse_operator': return <WarehouseOperatorDashboard />
  case 'manager':         return <ManagerDashboard />
  case 'buyer':           return <BuyerDashboard />
}
```

**`AdminDashboard`** is the most complete dashboard so far. It:
1. Fetches all sites from the backend API on mount (`useEffect`)
2. When a site is clicked, fetches projects for that site
3. When a project is clicked, shows placeholder panels for members, locations, stock, orders, and enquiries

The other dashboards (`WarehouseOperatorDashboard`, `ManagerDashboard`, `BuyerDashboard`) show the correct **panels** for each role (with appropriate action buttons), but the buttons don't perform real actions yet.

**`lib/api.ts`** – A tiny helper used to call the Express backend:

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}
```

Note: `AdminDashboard` currently uses `fetch` directly instead of `apiFetch`. The `apiFetch` helper is ready to be used consistently once more features are added.

### Tailwind CSS Styling

The application uses Tailwind v4 utility classes. Key patterns you'll see throughout:

```tsx
// Layout
className="min-h-screen flex items-center justify-center"
// → full height screen, flex box, centred both ways

// Grid
className="grid grid-cols-1 lg:grid-cols-3 gap-6"
// → 1 column on mobile, 3 columns on large screens, with gap

// Card
className="bg-white rounded-lg shadow p-6"
// → white background, rounded corners, drop shadow, padding

// Button states
className="bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
// → indigo background, white text, darker on hover, faded when disabled

// Conditional classes (selected vs unselected state)
className={`w-full text-left p-3 rounded-lg transition ${
  selectedSiteId === site.id
    ? 'bg-indigo-100 border-2 border-indigo-600'
    : 'bg-gray-50 border-2 border-gray-200 hover:border-indigo-300'
}`}
```

---

## 8. How Data Flows End-to-End

### Example: Admin Logs In and Views Sites

```
1. User opens http://localhost:3000
   → RootLayout renders
   → AuthProvider initialises: reads localStorage, no session found
   → ProtectedLayout: not authenticated, redirects to /login

2. User is at /login:
   → Clicks "Admin" quick-login button
   → handleTestLogin('admin') called
   → login('admin@test.local', 'admin123', 'admin') called in AuthContext
   → mockLoginUser() runs:
     - Finds 'admin@test.local' in MOCK_USERS
     - Password matches
     - Role matches
     - Creates AuthSession { user: { id, email, role: 'admin' }, token, expiresAt }
   → saveSession(session) → localStorage
   → router.push('/dashboard')

3. User is at /dashboard:
   → ProtectedLayout: authenticated ✓ → renders NavBar + page content
   → NavBar: shows user email "admin@test.local" with dropdown
   → DashboardPage reads user.role = 'admin' → renders <AdminDashboard />

4. AdminDashboard mounts:
   → useEffect fires → fetchSites() called
   → fetch('http://localhost:4000/api/sites')
   → Express backend receives GET /api/sites
   → supabase.from('sites').select(...) (service role, bypasses RLS)
   → PostgreSQL returns all site rows
   → Backend sends JSON array to frontend
   → setSites(data) → React re-renders with site list

5. User clicks on "Demo Site":
   → handleSiteSelect('demo-site-uuid') called
   → fetch('http://localhost:4000/api/projects?site_id=demo-site-uuid')
   → Backend queries projects WHERE site_id = 'demo-site-uuid'
   → setProjects(data) → projects panel updates

6. User clicks on "Project A":
   → setSelectedProjectId('project-a-uuid')
   → Project Details panel appears with placeholder sections
```

### Example: Warehouse Operator Adds Stock (Database Level)

This happens via Supabase RPC (not through the Express API yet):

```
1. Warehouse operator is authenticated → Supabase JWT contains their user ID

2. Frontend calls: supabase.rpc('add_stock', {
     p_project_id: 'uuid',
     p_item_id: 'uuid',
     p_location_id: 'uuid',
     p_quantity: 10
   })

3. Supabase sends the request to PostgreSQL with the user's JWT

4. add_stock() function executes:
   a. Calls user_has_project_role(p_project_id, ['admin', 'warehouse'])
      → Queries project_user_roles to check if this user has warehouse role
      → Returns true ✓
   b. Validates quantity > 0 ✓
   c. Locks the inventory row (FOR UPDATE prevents race conditions)
   d. If inventory row exists: UPDATE quantity = quantity + 10
      If not: INSERT new row with quantity = 10
   e. INSERT into stock_movements (type='IN', quantity=10, created_by=auth.uid())

5. All steps are in one transaction: all succeed or all fail together

6. Frontend receives success, can refresh the inventory display
```

---

## 9. Environment Variables & Configuration

Environment variables keep secrets out of the source code. Each `.env.example` file shows what variables are needed.

**Root `.env` (for tests and seed script):**
```
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=<from supabase start output>
SUPABASE_SERVICE_ROLE_KEY=<from supabase start output>
```

**`backend/.env`:**
```
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=<from supabase start output>
PORT=4000
```

**`frontend/.env.local` (Next.js uses `.env.local`):**
```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase start output>
NEXT_PUBLIC_API_URL=http://localhost:4000
```

**Important:** Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Never put secrets (like the service role key) in `NEXT_PUBLIC_` variables.

**Getting your Supabase keys:** After running `supabase start`, the CLI prints the API URL, anon key, and service role key. Copy these into your `.env` files.

**TypeScript and `tsconfig.json`:**
The backend `tsconfig.json` targets `ES2020` and compiles to the `dist/` folder. The `strict: true` option enables all strict type checks. `esModuleInterop: true` allows importing CommonJS modules with `import` syntax.

---

## 10. Testing

The project has automated tests that verify the **Row Level Security policies** work correctly.

**File: `tests/rls.test.ts`**

The tests:
1. Sign in as each user type (boss, warehouse, manager, buyer, outsider)
2. Perform actions that should succeed or fail based on role
3. Assert the results are as expected

**Key test cases:**

```typescript
// An outsider (not on the project) gets empty results – not an error,
// just RLS silently filters out all rows
it('cannot read projects', async () => {
  const { data } = await outsider.from('projects').select('id')
  expect(data?.length).toBe(0) // Sees nothing
})

// A manager can read inventory (project member)
it('can read inventory', async () => {
  const { data } = await manager.from('inventory').select('id, quantity')
  expect(data!.length).toBeGreaterThan(0) // Sees data
})

// But a manager CANNOT call add_stock (wrong role)
it('cannot add stock', async () => {
  const { error } = await manager.rpc('add_stock', { ... })
  expect(error).not.toBeNull() // Gets an error
})

// A warehouse operator CAN add stock
it('can add stock', async () => {
  const { error } = await warehouse.rpc('add_stock', { ... })
  expect(error).toBeNull() // Succeeds
})
```

**Running the tests:**
```bash
# First, make sure the database is running and seeded
supabase start
npm run db:reset
npm run seed:local

# Then run the tests
npm test
```

The `beforeAll` setup in the test file calls `seed-local.mjs` output data (it reads the seeded project/location/item IDs) so tests work against real database state.

---

## 11. Scripts & Developer Workflow

All scripts are defined in `package.json` files.

**Root `package.json` scripts:**

| Script | Command | Description |
|--------|---------|-------------|
| `npm run dev` | `concurrently "frontend:dev" "backend:dev"` | Start both servers at once |
| `npm run frontend:dev` | `cd frontend && npm run dev` | Start only the Next.js server (port 3000) |
| `npm run backend:dev` | `cd backend && npm run dev` | Start only the Express server (port 4000) |
| `npm run db:reset` | `supabase db reset` | Drop and recreate the database, re-run all migrations |
| `npm run seed:local` | `node scripts/seed-local.mjs` | Insert test users and data |
| `npm test` | `vitest run` | Run all tests once |
| `npm run local:reset-seed-test` | `db:reset && seed:local && test` | Full reset: migrate + seed + test |

**Typical development session:**

```bash
# 1. Start Supabase (runs Docker containers in the background)
supabase start

# 2. Install dependencies (only needed once)
npm install
cd frontend && npm install && cd ..
cd backend && npm install && cd ..

# 3. Set up .env files (copy examples and fill in keys from `supabase start` output)

# 4. Reset database and load test data
npm run db:reset
npm run seed:local

# 5. Start development servers
npm run dev
# → http://localhost:3000  (frontend)
# → http://localhost:4000  (backend)
# → http://localhost:54323 (Supabase Studio - visual database browser)

# 6. Run tests when you change database policies
npm test
```

**`scripts/seed-local.mjs`** creates the following test data:
- 5 users: boss, warehouse, manager, buyer, outsider
- 1 site: "Demo Site"
- 1 project: "Project A" (under Demo Site)
- 1 location: "Main Store"
- 1 item: "Cement Bag" (SKU: CEM-001)
- Role assignments: boss=admin, warehouse=warehouse, manager=manager, buyer=buyer
- Initial stock: 50 cement bags at Main Store

---

## 12. How the Project Was Built – Step by Step

This section traces the project's evolution through the database migration files (each migration = one step in the build).

### Step 1: Initial Database Schema (`20260226152409_remote_schema.sql`)

The first migration established the complete data model:

- Created all 14 tables: `users`, `sites`, `site_members`, `projects`, `project_user_roles`, `roles`, `locations`, `items`, `inventory`, `stock_movements`, `orders`, `order_items`, `deliveries`, `enquiries`, `enquiry_status_history`
- Added all foreign key relationships and unique constraints
- Created the core database functions: `add_stock`, `remove_stock`, `transfer_stock`, `create_site`, `create_order`, `add_order_item`, `create_enquiry`, `update_enquiry_status`, `update_order_status`, `handle_new_user` (trigger)
- Set up the `handle_new_user` trigger to auto-create `public.users` rows
- Set up `rls_auto_enable` event trigger to automatically enable RLS on new tables
- Created basic RLS policies (simple isolation policies as a starting point)

### Step 2: Schema Refinements (`20260226171555_remote_schema.sql`)

After the initial schema, some issues were found and fixed:

- `order_items.item_name` (a text field) was replaced with `order_items.item_id` (a proper foreign key to `items`). This is a normalisation improvement – instead of storing the item name as free text (which could get out of sync), you store a reference to the actual item.
- `add_order_item` function was updated to include `unit_cost` as a parameter and to validate the caller's role.
- `create_order` function was updated to check the caller has admin/buyer role.

### Step 3: Project-Scoped RLS & Security Lockdown (`20260226175113_rls_project_only_and_lockdown.sql`)

The most important migration. This replaced the basic policies with proper project-scoped ones:

- Replaced all basic RLS policies with policies based on project membership and role
- Created helper functions: `user_is_site_owner`, `user_is_project_member`, `user_is_project_admin`, `user_has_project_role`
- **Security lockdown:** Revoked all permissions from the `anon` (unauthenticated) role

  ```sql
  REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
  ```

  This is critical: before this, any unauthenticated request could potentially read data.

### Step 4: Items Soft Delete & Permission Widening (`20260226182243_items_soft_delete_and_permissions.sql`)

- Added `is_active` boolean column to `items` (soft delete)
- Added a database index on `(project_id, is_active)` for faster queries
- Updated item write policies to allow `warehouse` role to also create/update items (previously only admin/buyer could)
- Removed the hard-delete policy for items (you can only deactivate them, not delete)

### Steps 5-9: Fixing RLS Recursion Bugs

Several migrations were needed to fix subtle bugs in the RLS policies:

**The recursion problem:** When a policy on `projects` calls `user_is_project_member()`, which queries `project_user_roles`, which has its own RLS policy, which calls a helper that queries `projects` again → infinite loop!

These migrations progressively fixed the recursion by:
- Making helper functions `SECURITY DEFINER` (run as postgres, bypass RLS)
- Rewriting policies to use inline subqueries instead of calling helpers that might themselves trigger RLS
- Fixing the `project_user_roles` policy to use direct joins instead of calling functions that query `projects`

**Lesson learned:** RLS policy design is subtle. Circular dependencies between table policies and helper functions require careful structuring using `SECURITY DEFINER` functions.

### Step 10: Order Creation Requires Supplier (`20260226200631_update_create_order_require_supplier.sql`)

- Updated `create_order` to require `p_supplier_name` as a parameter (previously, the supplier could be added later)
- Added validation: `supplier_name` cannot be empty
- Added proper `SECURITY DEFINER` and permission grants to the function

### Frontend & Backend Development

In parallel with the database work, the frontend and backend were built:

1. **Express backend** was scaffolded with TypeScript and all read-only API routes were implemented
2. **Next.js frontend** was set up with the App Router
3. **Authentication** was implemented with a mock system (using localStorage) as a placeholder for real auth
4. **Role-based dashboards** were created for all 4 roles
5. **ProtectedLayout** and **NavBar** were added to handle routing and navigation
6. **AdminDashboard** was connected to the backend API to load real data

---

## 13. What Comes Next – The Roadmap

The project's TODO list from `README.md` with explanations of what each item means:

### High Priority

#### 🔐 Replace mock authentication with real backend API
**What needs to happen:** Currently `mockLoginUser()` checks a hardcoded object. It needs to be replaced with:
1. A `POST /api/auth/login` endpoint on the Express backend
2. The backend calls `supabase.auth.signInWithPassword()`
3. Returns the JWT token to the frontend
4. The frontend stores the real Supabase JWT, not a fake one
5. Future API calls from the frontend include the JWT in the `Authorization` header so the backend can verify who the user is

#### 🏗️ Implement actual inventory operations
**What needs to happen:** The warehouse dashboard buttons (Add Stock, Remove Stock, Transfer) need to call the Supabase RPCs (`add_stock`, `remove_stock`, `transfer_stock`). This requires forms to collect item, location, and quantity inputs.

#### 📋 Build enquiry management UI
**What needs to happen:** A full UI for creating enquiries (selecting item, quantity, location, target role) and viewing/updating their status. The database logic is already complete.

#### 📦 Add order creation and management forms
**What needs to happen:** Forms for the buyer to create orders (supplier name, items, quantities, costs) and update order status. The database functions exist; the UI is missing.

### Medium Priority

#### ⚡ Implement real-time updates
**What needs to happen:** Use Supabase's real-time subscriptions. When one user adds stock, other users' screens update automatically without refreshing. Example:

```typescript
supabase
  .channel('inventory-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, 
    (payload) => setInventory(prev => updateInventory(prev, payload)))
  .subscribe()
```

#### 👤 Add user profile management
**What needs to happen:** A settings page where users can update their name and password.

### Lower Priority / Future

#### 🚀 Deploy to production
**What needs to happen:**
1. Create a Supabase project on [supabase.com](https://supabase.com) (the cloud version)
2. Run migrations against the cloud database: `supabase db push`
3. Deploy the Next.js frontend to Vercel (or similar)
4. Deploy the Express backend to Railway, Render, or similar
5. Update environment variables to point to production URLs

#### 📊 Analytics and reporting
Future feature: dashboards showing stock trends over time, order history charts, enquiry resolution rates.

---

## 14. Glossary – Key Terms Explained

| Term | Explanation |
|------|-------------|
| **API** | Application Programming Interface – a defined way for two programs to communicate. The Express backend exposes an API that the frontend uses. |
| **REST API** | A style of API where resources (sites, projects) are accessed via URLs using HTTP methods (GET, POST, PUT, DELETE). |
| **HTTP** | The protocol (language) used to send data over the web. GET requests fetch data, POST sends data to create something. |
| **JSON** | JavaScript Object Notation – a text format for data. `{ "id": "123", "name": "Demo Site" }`. |
| **TypeScript** | JavaScript with types. Catches bugs before running. |
| **React Component** | A JavaScript function that returns UI (HTML). Reusable building block. |
| **React Hook** | A special function (starts with `use`) that lets you use React features like state (`useState`) and side effects (`useEffect`) inside a component. |
| **Context (React)** | A way to share data across many components without passing it through every level of props. Used here for auth state. |
| **Next.js** | Framework on top of React that adds routing, server-side rendering, and other features. |
| **App Router** | Next.js routing system where the folder structure maps to URLs. |
| **SSR / CSR** | Server-Side Rendering (page built on server) vs Client-Side Rendering (page built in the browser). `'use client'` means CSR. |
| **Tailwind CSS** | CSS utility framework where you style with classes in the HTML instead of separate CSS files. |
| **Node.js** | Runtime that lets you run JavaScript/TypeScript on a server (not just in a browser). |
| **Express.js** | Minimal web framework for Node.js. Used to create the backend API. |
| **PostgreSQL** | A powerful open-source relational database. Data is in tables with rows and columns. |
| **Supabase** | A hosted PostgreSQL service with built-in auth, REST API, real-time subscriptions, and more. |
| **RLS** | Row Level Security – PostgreSQL feature that filters which rows a user can access. The database enforces security, not just the application. |
| **RPC** | Remote Procedure Call – calling a database function from outside. Used here for stock operations and order management. |
| **Migration** | A SQL file that changes the database schema. Migrations run in order and are tracked so the database is always in sync with the code. |
| **Foreign Key** | A column that references another table's primary key. Enforces that referenced data exists. |
| **UUID** | Universally Unique Identifier – a long random ID like `550e8400-e29b-41d4-a716-446655440000`. Used as primary keys. |
| **JWT** | JSON Web Token – a signed token that proves who you are. Supabase uses JWTs for session management. |
| **Environment Variable** | A configuration value stored outside the code. Accessed via `process.env.VARIABLE_NAME`. Used for secrets. |
| **CORS** | Cross-Origin Resource Sharing – a security feature that controls which websites can call your API. The backend uses the `cors` package to allow the frontend. |
| **Seed Data** | Test data inserted into the database so developers can work with realistic content. |
| **Soft Delete** | Instead of actually deleting a record, set a flag (`is_active = false`). Preserves history. Used for `items`. |
| **Transaction** | A group of database operations that all succeed or all fail together. Prevents data inconsistency. |
| **`SECURITY DEFINER`** | A PostgreSQL function option that makes the function run as its owner (postgres) instead of the calling user. Used to avoid RLS recursion. |
| **Vitest** | A JavaScript testing framework. Used to run automated tests. |
| **concurrently** | An npm package that runs multiple commands at the same time in one terminal. |
| **dotenv** | An npm package that loads `.env` files into `process.env`. |
