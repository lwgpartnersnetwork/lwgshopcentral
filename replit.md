# MarketPlace Pro

## Overview

MarketPlace Pro is a full-stack e-commerce marketplace application built with React and Express. The platform connects customers with vendors, offering a comprehensive shopping experience with product discovery, cart management, order processing, and separate dashboards for vendors and administrators. The application features role-based authentication, real-time shopping cart functionality, and a modern responsive design using shadcn/ui components.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: Zustand for authentication and cart state with persistence
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Data Fetching**: TanStack Query (React Query) for server state management
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules for modern JavaScript features
- **API Design**: RESTful endpoints with consistent error handling
- **Middleware**: Custom logging middleware for API request tracking
- **Development**: Hot module replacement with Vite integration for seamless development

### Database & ORM
- **Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema**: Shared schema definitions between client and server
- **Migrations**: Drizzle Kit for database schema management
- **Connection**: Connection pooling with @neondatabase/serverless

### Authentication & Authorization
- **Password Hashing**: bcrypt for secure password storage
- **Role-Based Access**: Three-tier system (customer, vendor, admin)
- **State Persistence**: Client-side authentication state with Zustand persistence
- **Protected Routes**: AuthGuard component for role-based route protection

### Data Models
- **Users**: Core user accounts with role-based permissions
- **Vendors**: Business profiles linked to user accounts with approval workflow
- **Products**: Vendor-owned inventory with categories and stock management
- **Orders**: Transaction records with order items and status tracking
- **Categories**: Product organization system
- **Cart**: Session-based shopping cart with persistent storage

## External Dependencies

### UI Components & Styling
- **Radix UI**: Accessible component primitives for complex UI elements
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Lucide React**: Icon library for consistent iconography
- **shadcn/ui**: Pre-built component library for rapid development

### Development & Build Tools
- **TypeScript**: Static type checking across the entire application
- **Vite**: Modern build tool with hot module replacement
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Tailwind integration

### Database & Backend Services
- **Neon Database**: Serverless PostgreSQL hosting
- **Drizzle ORM**: Type-safe database toolkit
- **bcrypt**: Password hashing and security
- **Zod**: Runtime type validation and schema parsing

### State Management & Data Fetching
- **TanStack Query**: Server state management with caching
- **Zustand**: Lightweight state management for client state
- **React Hook Form**: Performant form handling with minimal re-renders

### Development Environment
- **Replit Integration**: Development environment with live preview
- **Hot Reload**: Instant feedback during development
- **TypeScript Compilation**: Build-time type checking and validation