# CryptoBroker Tracker

## Overview

CryptoBroker Tracker is a cryptocurrency and investment portfolio management application. It allows users to connect their crypto exchanges and brokerage accounts, monitor portfolio performance, track transactions, and generate tax reports automatically. The application follows a modern financial dashboard design inspired by Robinhood, Coinbase, and Personal Capital.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens for light/dark themes
- **Charts**: Recharts for portfolio and allocation visualizations
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Pattern**: RESTful API endpoints under `/api/*`
- **Build System**: Vite for frontend, esbuild for server bundling

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Managed via `drizzle-kit push`

### Authentication
- **Provider**: Replit Auth (OpenID Connect)
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple
- **Session Management**: Express-session with encrypted cookies

### Key Data Models
- **Users**: Managed through Replit Auth integration
- **API Credentials**: Encrypted storage for exchange API keys (Binance, Coinbase, etc.)
- **Accounts**: Linked exchange/brokerage accounts
- **Transactions**: Buy/sell records with quantity, price, and date
- **Positions**: Aggregated holdings with cost basis tracking
- **Tax Lots & Gain Events**: For FIFO/LIFO tax calculations
- **Assets**: Cryptocurrency/stock metadata with price tracking

### Application Pages
- Dashboard: Portfolio overview with metrics, charts, and recent transactions
- Transactions: Full transaction history with manual entry support
- Portfolio: Detailed position breakdown with allocation visualization
- Tax Reports: Capital gains calculations with FIFO/LIFO support
- Integrations: Exchange API key management
- Settings: User preferences and tax method configuration

## External Dependencies

### Database
- PostgreSQL (required, configured via `DATABASE_URL` environment variable)

### Authentication
- Replit Auth (OpenID Connect provider)
- Requires `ISSUER_URL`, `REPL_ID`, and `SESSION_SECRET` environment variables

### Frontend Libraries
- @tanstack/react-query for data fetching
- Radix UI primitives for accessible components
- Recharts for data visualization
- date-fns for date formatting
- react-icons for exchange logos (Binance, Coinbase)

### Backend Libraries
- Drizzle ORM for database operations
- Passport.js with OpenID Connect strategy
- crypto module for API key encryption/decryption

### Development Tools
- Vite with HMR for frontend development
- Replit-specific plugins for development experience
- TypeScript for type safety across the stack