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
6. [Backend – The Express API (Deprecated)](#6-backend--the-express-api-deprecated)
7. [Frontend – The Next.js Application](#7-frontend--the-nextjs-application)
   - [App Router & Pages](#app-router--pages)
   - [Authentication Flow](#authentication-flow)
   - [Role-Based Dashboards](#role-based-dashboards)
   - [Shared Dashboard Components](#shared-dashboard-components)
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
| **Manager** | Views stock levels; creates enquiries to request items from the warehouse or buyer |
| **Buyer** | Manages purchase orders with suppliers; handles enquiries routed to them |

The project has a **working core**: authentication, role-based dashboards, full inventory operations (add/remove/transfer stock), and a complete enquiry workflow are all functional. Orders are visible but the order-creation UI is a placeholder for the next phase.

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

### 2.5 Express.js (Deprecated / Not in active use)

**What it is:** Express is a minimal web framework for Node.js. You define HTTP routes (e.g. GET `/api/sites`) and what each route returns.

**Current status:** The Express backend exists in the `backend/` folder but is **no longer used by the frontend**. All data operations now go directly from the browser to Supabase via the Supabase JS client. The backend code is kept for reference but can be removed if desired. See Section 6 for details.

### 2.6 Supabase

**What it is:** Supabase is an open-source "Backend-as-a-Service" (BaaS) built on top of **PostgreSQL**. It provides:
- A PostgreSQL database
- Authentication (user accounts, sessions, JWTs)
- Row Level Security enforcement
- An auto-generated REST API
- Real-time subscriptions
- A web-based Studio UI for managing the database
- A CLI for local development

**Why it's used here:** Instead of building a custom auth system and database API from scratch, Supabase provides all of that. You can run it **locally** with `supabase start` (it spins up Docker containers) which is ideal for development.

**One Supabase client in this project:**

The frontend uses the `@supabase/supabase-js` library with the **anon key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`). This gives limited access that is enforced by RLS policies – users can only see and modify data they are authorised to touch.

### 2.7 PostgreSQL (via Supabase)

**What it is:** PostgreSQL (often called "Postgres") is one of the most powerful open-source relational databases. Data is stored in tables with rows and columns. Tables link to each other via **foreign keys**.

**Why it's used here:** The data model (sites → projects → locations → inventory) is inherently relational. PostgreSQL handles complex queries efficiently and supports advanced features like Row Level Security, stored functions, and transactions.

### 2.8 Vitest

**What it is:** Vitest is a fast testing framework for JavaScript/TypeScript (similar to Jest but faster).

**Why it's used here:** The RLS (Row Level Security) policies are tested automatically. The tests sign in as different users and verify that the database correctly allows or blocks their actions.

### 2.9 Node.js & npm

**What it is:** Node.js lets you run JavaScript/TypeScript on your computer (not just in a browser). npm (Node Package Manager) manages all the third-party libraries the project depends on.

**Why it's used here:** The Next.js frontend runs on Node.js. npm scripts (in `package.json`) are used to start the app, run tests, and manage the database.

### 2.10 Concurrently

**What it is:** A small npm package that runs multiple commands at the same time in one terminal.

**Why it's used here:** The project has two dev servers to potentially run (frontend on port 3000, backend on port 4000). `concurrently` starts both with one command: `npm run dev`.

### 2.11 dotenv

**What it is:** A library that reads a `.env` file and loads the values as environment variables accessible via `process.env`.

**Why it's used here:** Secrets (like database keys) should never be hardcoded in source code. They live in `.env` files that are gitignored (not committed to the repository).

---

## 3. Architecture Overview

The project uses a **two-tier architecture**: a Next.js frontend that talks directly to Supabase (PostgreSQL):

```
┌─────────────────────────────────────────────────────────────┐
│                     BROWSER (User)                           │
│                                                             │
│    Next.js Frontend (React + Tailwind)                      │
│    http://localhost:3000                                     │
│    - Login page                                             │
│    - Role-based dashboards                                  │
│    - Calls Supabase JS client directly for all data         │
└───────────────────────────────┬─────────────────────────────┘
                                │ Supabase JS client
                                │ (anon key + user JWT)
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                 Supabase / PostgreSQL                        │
│                 http://localhost:54321                       │
│                                                             │
│  Auth: signInWithPassword, JWT token management             │
│                                                             │
│  Tables: sites, projects, locations, items, inventory,      │
│          orders, order_items, enquiries, roles, users, ...  │
│                                                             │
│  Row Level Security (RLS): enforces who can see/edit what   │
│  Database Functions (RPCs): add_stock, create_order, ...    │
└─────────────────────────────────────────────────────────────┘
```

**Note:** A separate Express backend (`backend/`) exists in the repository but is currently **not used**. It was part of an earlier design where the frontend called the backend and the backend called Supabase using an admin key. The architecture was simplified: the frontend now uses the Supabase JS client directly with the anon key + RLS for security. The backend code remains as a reference but can be deleted if it causes confusion.

**Key architectural decisions:**

1. **Why does the frontend use Supabase directly?** The Supabase anon key has limited permissions enforced by RLS policies. Users can only access rows they are authorised to see. All mutations go through `SECURITY DEFINER` stored functions that validate the caller's role before doing anything. This is safe without a separate backend server.

2. **Why RLS at the database level?** Security at the database level means that even if the application code has a bug, unauthorised data access is blocked by PostgreSQL itself. RLS is the last line of defence.

3. **Why store functions (RPCs) for mutations?** Operations like `add_stock` and `transfer_stock` need to be **atomic** (all-or-nothing) and need to enforce business rules (e.g. you can't transfer more than you have). Putting this logic in the database means it runs in a single transaction and is enforced regardless of which client calls it.

---

## 4. Project Folder Structure

```
stock_system/                          ← Root of the project
│
├── package.json                       ← Root scripts (npm run dev, npm test, etc.)
├── README.md                          ← Quick-start guide
├── DOCUMENTATION.md                   ← This file!
│
├── frontend/                          ← The Next.js web application (active)
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
│   │   ├── page.tsx                   ← Root page "/" – redirects authenticated users to /dashboard
│   │   ├── login/
│   │   │   └── page.tsx               ← Login page (/login) with quick-login buttons for dev
│   │   ├── dashboard/
│   │   │   └── page.tsx               ← Dashboard router – picks correct dashboard by role
│   │   └── _reference/                ← Old placeholder pages (not linked from UI, kept for reference)
│   │       ├── inventory/page.tsx
│   │       ├── items/page.tsx
│   │       ├── orders/page.tsx
│   │       └── projects/page.tsx
│   │
│   ├── components/                    ← Reusable React components
│   │   ├── NavBar.tsx                 ← Top navigation bar (shown on all protected pages)
│   │   ├── ProtectedLayout.tsx        ← Redirects unauthenticated users to /login
│   │   └── dashboards/
│   │       ├── shared/                ← Components shared across multiple dashboards
│   │       │   ├── Modal.tsx          ← Generic overlay modal wrapper
│   │       │   ├── OpStatus.tsx       ← Error / success feedback banner
│   │       │   └── constants.ts       ← Shared display constants (e.g. STATUS_COLOURS)
│   │       ├── AdminDashboard.tsx     ← Dashboard for admin/boss role
│   │       ├── WarehouseOperatorDashboard.tsx
│   │       ├── ManagerDashboard.tsx
│   │       └── BuyerDashboard.tsx
│   │
│   └── lib/                           ← Shared utilities and logic
│       ├── supabase.ts                ← Creates and exports the Supabase browser client singleton
│       ├── auth.ts                    ← Auth types (UserRole, User) and permission-check helpers
│       ├── AuthContext.tsx            ← React Context: shares auth state across all components
│       └── queries.ts                 ← Shared Supabase query field strings (e.g. ENQUIRY_SELECT)
│
├── backend/                           ← Express.js API server (DEPRECATED – not in active use)
│   ├── package.json                   ← Backend dependencies
│   ├── tsconfig.json                  ← TypeScript configuration for backend
│   ├── .env.example                   ← Template for environment variables
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
│   ├── seed-local.mjs                 ← Creates test users and data in the local database
│   └── prepare-frontend-dev.mjs       ← Helper for setting up the frontend dev environment
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
- The database stores role names as `'warehouse'` but the frontend maps this to `'warehouse_operator'` for clarity (see `lib/AuthContext.tsx` → `mapDbRole`).

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
| `get_project_members(p_project_id)` | Site owner / project admin | Returns all members with their roles for a project |

**Why use RPCs instead of direct table INSERT/UPDATE?**
1. **Atomicity** – `transfer_stock` removes from one location and adds to another in a single transaction. If one part fails, the whole thing is rolled back.
2. **Business logic** – `add_stock` automatically creates an `inventory` row if one doesn't exist, or increments the quantity if it does. This logic lives once in the database.
3. **Security** – Each function checks the caller's role before doing anything. Even if RLS is misconfigured, the function will refuse.

**`handle_new_user` trigger:** This is a special database trigger that fires automatically whenever a new user registers via Supabase Auth. It creates a matching row in `public.users` so the app can join auth data with profile data.

---

## 6. Backend – The Express API (Deprecated)

> ⚠️ **This backend is not used by the frontend.** All data access now goes directly from the browser to Supabase. This section describes what the code does, but you can ignore or delete the `backend/` folder if you want.

The backend folder contains a Node.js Express server that was part of an earlier design. At the time, the reasoning was: the browser can't safely store the `SUPABASE_SERVICE_ROLE_KEY`, so a backend server holds that key and exposes a safe API.

This approach was later replaced. The frontend now uses the **anon key** with RLS policies enforcing security, and mutations go through **SECURITY DEFINER stored functions** in the database. There is no longer a need for a separate backend for these operations.

**What the backend code does (for reference):**

`backend/src/index.ts` – Creates an Express app on port 4000 with CORS enabled.

`backend/src/lib/supabase.ts` – Creates a Supabase admin client using the `SERVICE_ROLE_KEY`. This bypasses all RLS.

**Read-only routes (all GET only):**

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/health` | Server health check |
| GET | `/api/sites` | List all sites |
| GET | `/api/sites/:id` | Get one site |
| GET | `/api/projects` | List projects (filter by `?site_id=`) |
| GET | `/api/projects/:id` | Get one project |
| GET | `/api/items` | List items (filter by `?project_id=`) |
| GET | `/api/items/:id` | Get one item |
| GET | `/api/inventory` | List inventory rows |
| GET | `/api/orders` | List orders |
| GET | `/api/orders/:id` | Get order with its line items |

None of these endpoints are called from the current frontend code.

---

## 7. Frontend – The Next.js Application

### App Router & Pages

Next.js 13+ uses the **App Router**. Every `page.tsx` file inside the `app/` directory becomes a web page.

**`app/layout.tsx`** is the root layout. It wraps **every** page in the application. This is where `AuthProvider` and `ProtectedLayout` are set up:

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

**`app/page.tsx`** – The root page (`/`). Logged-in users are redirected to `/dashboard`; unauthenticated users are sent to `/login` by `ProtectedLayout`.

**`app/login/page.tsx`** – The login page. Contains email/password fields and a set of quick-login buttons for development (pre-fills credentials for each test user). The quick-login section is intended for local development only.

**`app/dashboard/page.tsx`** – A role router. Reads `user.role` and renders the correct dashboard component.

**`app/\_reference/`** – Old placeholder pages that are not linked from the main UI. These can be deleted.

### Authentication Flow

Authentication uses real **Supabase Auth** (JWT-based). There is no mock system.

```
1. User visits http://localhost:3000
2. ProtectedLayout checks: is user authenticated?
   - No → redirect to /login
   - Yes → show the page + NavBar

3. On /login page:
   - User enters email + password
   - OR clicks a "Quick Login" button (for local development)
   - login() in AuthContext is called

4. login() calls supabase.auth.signInWithPassword({ email, password })
   - Supabase verifies credentials, returns a JWT
   - onAuthStateChange fires, which:
     a. Gets the Supabase session (contains user ID)
     b. Queries project_user_roles to find the user's highest role
     c. Calls setUser({ id, email, role, created_at })

5. User is redirected to /dashboard

6. Dashboard page reads user.role and renders the correct dashboard component

7. All subsequent Supabase queries use the stored JWT automatically
   (the Supabase JS client handles this transparently)

8. On logout: supabase.auth.signOut() clears the session; ProtectedLayout
   detects unauthenticated state and redirects to /login
```

**Key files:**

- **`lib/supabase.ts`** – A singleton Supabase client. Uses the anon key. Includes logic to resolve the Supabase URL for local network access (so the app works when accessed from a LAN IP).

- **`lib/auth.ts`** – Types (`UserRole`, `User`) and permission-check helper functions (`canViewStock`, `canCreateEnquiries`, etc.). These helpers are available for use in components when fine-grained permission checks are needed.

- **`lib/AuthContext.tsx`** – A React Context that shares auth state across all components. Any component calls `useAuth()` to get `{ user, isLoading, isAuthenticated, login, logout }`. The context handles:
  - Session initialisation on page load (with an 8-second timeout to prevent infinite loading)
  - Listening for auth state changes (token refresh, sign-out in another tab)
  - Fetching the user's role from `project_user_roles` after login

- **`components/ProtectedLayout.tsx`** – Guards all pages. Redirects unauthenticated users to `/login` and authenticated users away from `/login` to `/dashboard`.

### Role-Based Dashboards

`app/dashboard/page.tsx` is a router: it reads the user's role and renders the appropriate dashboard component:

```tsx
switch (user.role) {
  case 'admin':              return <AdminDashboard />
  case 'warehouse_operator': return <WarehouseOperatorDashboard />
  case 'manager':            return <ManagerDashboard />
  case 'buyer':              return <BuyerDashboard />
  default:                   return <div>Unknown role: {user.role}</div>
}
```

**`AdminDashboard`** – Read-only overview of the entire system. Shows:
- All construction sites (fetched on mount)
- Projects within the selected site
- For the selected project: members (via `get_project_members` RPC), stock, and locations

**`WarehouseOperatorDashboard`** – Full inventory management. Features:
- Project selector (auto-selects when there is only one project)
- Live inventory table with item, SKU, location, quantity, and unit
- Modals for: Add Stock, Remove Stock, Transfer Stock, View Locations, View/Update Enquiries, Create Enquiry to Buyer
- All mutations call Supabase RPCs (`add_stock`, `remove_stock`, `transfer_stock`, `create_enquiry`, `update_enquiry_status`)
- After each mutation, inventory/enquiry data is refreshed from the database

**`ManagerDashboard`** – Oversight and coordination. Features:
- Project selector
- Read-only stock and location modals
- View all enquiries for the project
- Create enquiries assigned to either the warehouse or buyer

**`BuyerDashboard`** – Purchasing and order management. Features:
- Project selector
- Read-only stock and location modals
- View enquiries assigned to buyer; update their status
- Create enquiries assigned to the warehouse
- Placeholder UI for purchase order creation (not yet implemented)

**`lib/queries.ts`** – Centralises the Supabase query select string for enquiries so all dashboards use the same field list and don't get out of sync.

### Shared Dashboard Components

To avoid duplicating the same code in every dashboard, three shared components live in `components/dashboards/shared/`:

| File | What it provides |
|------|-----------------|
| `Modal.tsx` | Generic overlay modal with title, close button, and scrollable body. Accepts a `size` prop (`'lg'` or `'2xl'`). |
| `OpStatus.tsx` | Shows a red error banner or green success banner after an operation. |
| `constants.ts` | `STATUS_COLOURS` – Tailwind class strings for enquiry status badges (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `REJECTED`). |

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

### Example: User Logs In and Views Dashboard

```
1. User opens http://localhost:3000
   → RootLayout renders
   → AuthProvider initialises: calls supabase.auth.getSession()
   → No active session found
   → ProtectedLayout: not authenticated → redirects to /login

2. User is at /login:
   → Clicks "Warehouse Op." quick-login button
   → handleTestLogin('warehouse@example.com', 'Passw0rd!warehouse') called
   → login() in AuthContext calls supabase.auth.signInWithPassword()
   → Supabase validates credentials → returns JWT + session

3. onAuthStateChange fires (inside AuthProvider useEffect):
   → session.user.id is available
   → fetchUserRole(userId) queries project_user_roles
   → Finds the user has role 'warehouse' in a project
   → mapDbRole('warehouse') → 'warehouse_operator'
   → setUser({ id, email, role: 'warehouse_operator', created_at })
   → isLoading → false

4. ProtectedLayout detects isAuthenticated = true and pathname = '/login'
   → Redirects to /dashboard

5. User is at /dashboard:
   → ProtectedLayout: authenticated ✓ → renders NavBar + page content
   → NavBar: shows user email with dropdown, role displayed as "warehouse operator"
   → DashboardPage reads user.role = 'warehouse_operator' → renders <WarehouseOperatorDashboard />

6. WarehouseOperatorDashboard mounts:
   → useEffect fetches projects: supabase.from('projects').select(...)
   → RLS automatically filters to only projects this user has access to
   → setProjects(data) → React re-renders with project buttons
```

### Example: Warehouse Operator Adds Stock

```
1. Warehouse operator selects a project → inventory loads automatically

2. Clicks "+ Add Stock" button:
   → openModalWith('add') called
   → Form state reset (item, location, quantity cleared)
   → Add Stock modal opens

3. User selects an item from the dropdown (fetched from 'items' table)
   → Location selector appears
   → User selects a location
   → Quantity input appears

4. User enters quantity and clicks "Add Stock":
   → handleAddStock() called
   → supabase.rpc('add_stock', {
       p_project_id: selectedProject.id,
       p_item_id: formItemId,
       p_location_id: formLocationId,
       p_quantity: Number(formQty),
     })
   → Supabase sends RPC call to PostgreSQL with the user's JWT

5. add_stock() Postgres function executes (in a single transaction):
   a. Calls user_has_project_role(p_project_id, ['admin', 'warehouse'])
      → Checks project_user_roles → user has 'warehouse' role ✓
   b. Validates quantity > 0 ✓
   c. Locks the inventory row (FOR UPDATE prevents concurrent modification)
   d. If inventory row exists: UPDATE quantity = quantity + p_quantity
      If not: INSERT new row with quantity = p_quantity
   e. INSERT into stock_movements (type='IN', quantity=p_quantity, created_by=auth.uid())
   f. Commits the transaction

6. Frontend receives success response:
   → setOpSuccess('Stock added successfully!')
   → refreshInventory() called → inventory table reloads with new quantities
```

### Example: Manager Creates an Enquiry

```
1. Manager selects a project → data loads (items, locations, inventory, enquiries)

2. Manager clicks "Create Enquiry":
   → Create Enquiry modal opens
   → Manager selects:
     - Assign to: "Warehouse" (or "Buyer")
     - Item: from the items list
     - Quantity: a number
     - Delivery location: optional
     - Notes: optional

3. Manager submits the form:
   → handleCreateEnquiry() called
   → supabase.rpc('create_enquiry', {
       p_project_id: selectedProject.id,
       p_item_id: formItemId,
       p_quantity: Number(formQty),
       p_delivery_location_id: formLocationId || null,
       p_assigned_role: formAssignedRole,   // 'warehouse' or 'buyer'
       p_notes: formNotes || null,
     })

4. create_enquiry() Postgres function:
   a. Verifies the caller is a project member
   b. INSERT into enquiries table with status = 'OPEN'
   c. Returns the new enquiry ID

5. Frontend receives success:
   → refreshEnquiries() reloads the enquiries list
   → The assigned role (warehouse operator or buyer) will now see this enquiry
     in their "Enquiries" panel when they next view the project
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

**`frontend/.env.local` (Next.js uses `.env.local`):**
```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase start output>
```

**`backend/.env` (only needed if running the deprecated Express backend):**
```
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=<from supabase start output>
PORT=4000
```

**Important:** Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Never put secrets (like the service role key) in `NEXT_PUBLIC_` variables. The anon key is designed to be public – its permissions are limited by RLS.

**Getting your Supabase keys:** After running `supabase start`, the CLI prints the API URL, anon key, and service role key. Copy these into your `.env` files.

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

---

## 11. Scripts & Developer Workflow

All scripts are defined in `package.json` files.

**Root `package.json` scripts:**

| Script | Command | Description |
|--------|---------|-------------|
| `npm run dev` | `concurrently "frontend:dev" "backend:dev"` | Start both frontend and (deprecated) backend servers |
| `npm run frontend:dev` | `cd frontend && npm run dev` | Start only the Next.js server (port 3000) – this is all you need |
| `npm run backend:dev` | `cd backend && npm run dev` | Start only the Express server (port 4000) – not needed for current functionality |
| `npm run db:reset` | `supabase db reset` | Drop and recreate the database, re-run all migrations |
| `npm run seed:local` | `node scripts/seed-local.mjs` | Insert test users and data |
| `npm test` | `vitest run` | Run all tests once |
| `npm run local:reset-seed-test` | `db:reset && seed:local && test` | Full reset: migrate + seed + test |

**Typical development session:**

```bash
# 1. Start Supabase (runs Docker containers in the background)
supabase start

# 2. Install dependencies (only needed once, or after pulling new code)
npm install
cd frontend && npm install && cd ..

# 3. Set up .env files (copy examples and fill in keys from `supabase start` output)
cp frontend/.env.example frontend/.env.local
# Edit frontend/.env.local with your Supabase URL and anon key

# 4. Reset database and load test data
npm run db:reset
npm run seed:local

# 5. Start the frontend development server
npm run frontend:dev
# → http://localhost:3000  (the app)
# → http://localhost:54323 (Supabase Studio - visual database browser)

# 6. Log in with a test account (see login page for credentials)
#    After running seed:local, these accounts exist:
#    boss@example.com / Passw0rd!boss        (admin)
#    warehouse@example.com / Passw0rd!warehouse (warehouse operator)
#    manager@example.com / Passw0rd!manager  (manager)
#    buyer@example.com / Passw0rd!buyer      (buyer)
```

**`scripts/seed-local.mjs`** creates the following test data:
- 5 users: boss, warehouse, manager, buyer, outsider
- 1 site: "Demo Site"
- 1 project: "Project A" (under Demo Site)
- 1 location: "Main Store"
- 1 item: "Cement Bag" (SKU: CEM-001)
- Role assignments: boss=admin, warehouse=warehouse, manager=manager, buyer=buyer
- Initial stock: 50 cement bags at Main Store

> **Note:** The seed script requires a clean database. Run `npm run db:reset` before `npm run seed:local`. If you run the seed script twice without resetting, it will fail because the user accounts already exist.

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

- Updated `create_order` to require `p_supplier_name` as a parameter
- Added validation: `supplier_name` cannot be empty
- Added proper `SECURITY DEFINER` and permission grants to the function

### Frontend Development

In parallel with the database work:

1. **Next.js frontend** was set up with the App Router
2. **Authentication** was implemented using real Supabase Auth (JWT-based)
3. **Role-based dashboards** were created for all 4 roles
4. **Inventory operations** (add/remove/transfer stock) were fully implemented in the Warehouse Operator dashboard using Supabase RPCs
5. **Enquiry workflow** was fully implemented across all dashboards
6. **Shared components** (Modal, OpStatus, STATUS_COLOURS) were extracted to avoid code duplication between dashboards
7. **ProtectedLayout** and **NavBar** were added to handle routing and navigation

---

## 13. What Comes Next – The Roadmap

### High Priority

#### 📦 Build order creation and management UI
**Status:** Database functions (`create_order`, `add_order_item`, `update_order_status`) are complete. The "View Orders" and "Create New Order" buttons in the Buyer dashboard are present but don't open forms yet.
**What needs to happen:** Add modals/forms for creating orders (supplier name, items, quantities, unit costs), viewing order details, and updating order status.

#### 👤 Add user profile management
**What needs to happen:** A settings page where users can update their name and password. The `users` table already has a `full_name` column.

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

#### 🗺️ Admin: add site/project management
Currently the admin can only **read** data. Admins should be able to create sites, projects, locations, items, and assign users to projects through the UI (the database functions already support all of this).

### Lower Priority / Future

#### 🚀 Deploy to production
**What needs to happen:**
1. Create a Supabase project on [supabase.com](https://supabase.com) (the cloud version)
2. Run migrations against the cloud database: `supabase db push`
3. Deploy the Next.js frontend to Vercel (connect the GitHub repository – Vercel auto-deploys on push)
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables in the Vercel project settings
5. No backend server is needed for the current feature set

#### 🧹 Remove the Express backend
The `backend/` folder is dead code. Once you're confident it's not needed, delete it and remove the `backend:dev` script from `package.json`.

#### 📊 Analytics and reporting
Future feature: dashboards showing stock trends over time, order history charts, enquiry resolution rates.

---

## 14. Glossary – Key Terms Explained

| Term | Explanation |
|------|-------------|
| **API** | Application Programming Interface – a defined way for two programs to communicate. |
| **REST API** | A style of API where resources (sites, projects) are accessed via URLs using HTTP methods (GET, POST, PUT, DELETE). |
| **RPC (Remote Procedure Call)** | Calling a function stored in the database as if it were a regular function call. Used here for operations like `add_stock`. |
| **HTTP** | The protocol (language) used to send data over the web. GET requests fetch data, POST sends data to create something. |
| **JSON** | JavaScript Object Notation – a text format for data. `{ "id": "123", "name": "Demo Site" }`. |
| **TypeScript** | JavaScript with types. Catches bugs before running. |
| **React Component** | A JavaScript function that returns UI (HTML). Reusable building block. |
| **React Hook** | A special function (starts with `use`) that lets you use React features like state (`useState`) and side effects (`useEffect`) inside a component. |
| **React Context** | A way to share data (like the current user) across many components without manually passing it as props through every level. |
| **JWT (JSON Web Token)** | A signed string that proves who you are. Supabase issues a JWT after login. The frontend sends it with every request so the database knows which user is making the request. |
| **RLS (Row Level Security)** | A PostgreSQL feature that filters which database rows each user can see or modify. A WHERE clause applied automatically on every query. |
| **SECURITY DEFINER** | A PostgreSQL function option that makes the function run as its owner (the superuser) instead of the calling user. Used to avoid RLS recursion bugs. |
| **Anon Key** | A Supabase API key that any user (even unauthenticated) can use. Its permissions are strictly limited by RLS. Safe to expose in the browser. |
| **Service Role Key** | A Supabase API key that bypasses all RLS policies (full admin access). Must never be exposed in the browser or committed to source code. |
| **Migration** | A SQL file that makes a specific change to the database schema. Running all migrations in order recreates the database from scratch. |
| **Seed** | Populating the database with test data to make development easier. |
| **Soft Delete** | Marking a record as inactive (`is_active = false`) instead of actually deleting it. Preserves historical references. |
| **Foreign Key** | A column that references the primary key of another table. Enforces that related data exists. E.g. `inventory.item_id` → `items.id`. |
| **Transaction** | A group of database operations that all succeed or all fail together. If one step fails, all changes are rolled back. Used in `transfer_stock` to prevent partial transfers. |
