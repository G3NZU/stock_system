# Stock System - Construction Site Inventory Management

Role-based inventory management system for construction sites with projects, locations, stock tracking, orders, and enquiries.

## Architecture

- **Frontend**: Next.js 16 (React 19, TypeScript, Tailwind CSS)
- **Backend**: Express.js API with TypeScript
- **Database**: Supabase (PostgreSQL with RLS)
- **Auth**: Session-based with role management

## Project Structure

```
Stock_System/
├── frontend/          # Next.js application
│   ├── app/          # Pages (login, dashboard, etc.)
│   ├── components/   # React components
│   └── lib/          # Auth, API, utilities
├── backend/          # Express API server
│   └── src/
│       ├── routes/   # API routes (sites, projects, items, etc.)
│       └── lib/      # Supabase client
├── supabase/         # Database migrations
└── tests/            # RLS policy tests
```

## Features

### Role-Based Access Control

#### Admin
- View all construction sites and projects
- See project members, locations, stock, orders, and enquiries
- View-only access (no manipulation)

#### Warehouse Operator
- Manage main inventory (add, remove, transfer)
- View location inventories
- Create and manage enquiries
- View orders (read-only)

#### Manager
- View stock, locations, and orders (read-only)
- Create enquiries to warehouse or buyer

#### Buyer
- Full order management (create, modify, delete)
- View stock and locations (read-only)
- Manage enquiries

## Setup

### Prerequisites
- Node.js 20+
- Supabase CLI
- Git

### Installation

1. **Clone repository**
   ```bash
   git clone <repo-url>
   cd Stock_System
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd frontend && npm install
   cd ../backend && npm install
   ```

3. **Start Supabase locally**
   ```bash
   supabase start
   ```

4. **Configure environment**
   - Copy `.env.example` to `.env` in root, frontend, and backend
   - Update with your Supabase local credentials

5. **Run migrations**
   ```bash
   npm run db:reset
   npm run seed:local
   ```

6. **Start development servers**
   ```bash
   npm run dev
   ```
   - Frontend: http://localhost:3000
   - Backend: http://localhost:4000
   - Supabase Studio: http://localhost:54323

## Test Credentials

For development/testing only (created by `npm run seed:local`):

- **Admin (Boss)**: `boss@example.com` / `Passw0rd!boss`
- **Warehouse Operator**: `warehouse@example.com` / `Passw0rd!warehouse`
- **Manager**: `manager@example.com` / `Passw0rd!manager`
- **Buyer**: `buyer@example.com` / `Passw0rd!buyer`

## Database Schema

- **users** - User accounts
- **sites** - Construction sites
- **projects** - Projects within sites
- **locations** - Physical locations (buildings, floors)
- **items** - Inventory items
- **inventory** - Stock levels per item/location
- **orders** - Purchase orders
- **order_items** - Line items in orders
- **enquiries** - Request/enquiry tracking
- **roles** - User roles
- **project_user_roles** - Role assignments

## API Endpoints

- `GET /api/sites` - List construction sites
- `GET /api/projects?site_id={id}` - List projects (filter by site)
- `GET /api/items?project_id={id}` - List items
- `GET /api/inventory?project_id={id}` - List inventory
- `GET /api/orders?project_id={id}` - List orders
- `GET /api/orders/:id` - Get order with items

## Scripts

- `npm run dev` - Start both frontend and backend
- `npm run frontend:dev` - Start frontend only
- `npm run backend:dev` - Start backend only
- `npm run db:reset` - Reset database
- `npm run seed:local` - Seed test data
- `npm test` - Run RLS tests
- `npm run local:reset-seed-test` - Full reset + seed + test

## Security

- Row Level Security (RLS) enabled on all tables
- Role-based permissions enforced at database level
- Session management with localStorage
- Environment variables for secrets (never commit `.env` files)
- CORS configured for API

### Rotating Supabase Credentials

If your Supabase project reference (`project-ref`) or connection details have ever been committed to git history, rotate all credentials as a precaution before making the repository public:

1. **Log in** to [supabase.com/dashboard](https://supabase.com/dashboard) and open your project.

2. **Regenerate the JWT Secret** (this also regenerates the `anon` and `service_role` API keys):
   - Go to **Project Settings → API**
   - Under "JWT Settings", click **Generate a new JWT Secret**
   - Confirm the action — all existing sessions will be invalidated

3. **Reset the Database Password**:
   - Go to **Project Settings → Database**
   - Scroll to "Database password" and click **Reset database password**
   - Save the new password securely (e.g. in a password manager)

4. **Update your local environment file** (`frontend/.env.local`) with the new values:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<new-anon-key>
   ```
   The new `anon` key is shown in **Project Settings → API** after the JWT Secret is regenerated.

5. **Update any deployed environment** (e.g. Vercel environment variables) with the same new values.

> **Note on git history**: Rotating credentials is the security fix. Rewriting git history (e.g. with `git filter-repo`) prevents casual discovery but is not a substitute for rotation, since the old values may already be cached by GitHub or other services.

## TODO

- [x] Replace mock authentication with real Supabase auth (roles enforced via RLS)
- [x] Implement actual inventory operations (add/remove/transfer) in Warehouse Operator dashboard
- [x] Build enquiry management UI
- [ ] Add order creation and management forms
- [ ] Implement real-time updates
- [ ] Add user profile management
- [ ] Deploy to production

## License

ISC
