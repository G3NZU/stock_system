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

For development/testing only:

- **Admin**: `admin@test.local` / `admin123`
- **Warehouse Operator**: `warehouse_operator@test.local` / `warehouse123`
- **Manager**: `manager@test.local` / `manager123`
- **Buyer**: `buyer@test.local` / `buyer123`

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
- Environment variables for secrets
- CORS configured for API

## TODO

- [ ] Replace mock authentication with real backend API
- [ ] Implement actual inventory operations (add/remove/transfer)
- [ ] Build enquiry management UI
- [ ] Add order creation and management forms
- [ ] Implement real-time updates
- [ ] Add user profile management
- [ ] Deploy to production

## License

ISC
