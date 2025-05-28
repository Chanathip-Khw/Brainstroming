# Backend API with NextAuth Integration

This is the backend API for the application, designed to work with NextAuth in the frontend.

## Project Structure

```
backend/
├── src/
│   ├── config/             # Configuration files
│   │   ├── database.ts     # Database configuration
│   │   └── server.ts       # Server configuration
│   ├── controllers/        # Route controllers
│   │   ├── authController.ts
│   │   ├── healthController.ts
│   │   └── workspaceController.ts
│   ├── middleware/         # Middleware functions
│   │   └── auth.ts         # Authentication middleware
│   ├── routes/             # API routes
│   │   ├── api/            # API route groups
│   │   │   ├── auth.ts     # Authentication routes
│   │   │   ├── health.ts   # Health check routes
│   │   │   └── workspaces.ts # Workspace routes
│   │   └── index.ts        # Route registration
│   ├── services/           # Business logic
│   │   └── authService.ts  # Authentication service
│   ├── types/              # Type definitions
│   │   └── index.ts        # Shared types
│   └── server.ts           # Main entry point
├── prisma/                 # Prisma ORM files
│   └── schema.prisma       # Database schema
├── package.json
└── README.md
```

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file with the following variables:
   ```
   DATABASE_URL="your-database-url"
   JWT_SECRET="your-jwt-secret"
   FRONTEND_URL="http://localhost:3000"
   PORT=3001
   HOST="0.0.0.0"
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   ```

3. Generate Prisma client:
   ```
   npx prisma generate
   ```

4. Run the development server:
   ```
   npm run dev
   ```

## Authentication

This backend is designed to work with NextAuth in the frontend. It provides:

1. User synchronization endpoint (`/api/auth/sync`) for NextAuth to keep user data in sync
2. Token verification for both backend JWT tokens and NextAuth tokens
3. Protected routes that require authentication

## API Endpoints

### Authentication
- `GET /api/auth/me` - Get current user info (protected)
- `POST /api/auth/logout` - Logout user (protected)
- `POST /api/auth/sync` - Sync user from NextAuth
- `GET /api/test-auth` - Test authentication (protected)

### Workspaces
- `GET /api/workspaces` - Get user's workspaces (protected)
- `POST /api/workspaces` - Create a new workspace (protected)

### Health
- `GET /health` - Basic health check
- `GET /api/health` - Detailed health check with database status 