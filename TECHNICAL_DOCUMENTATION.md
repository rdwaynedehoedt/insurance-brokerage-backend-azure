# Insurance Brokerage System - Technical Documentation

## Overview

This document provides technical details about the Insurance Brokerage System, focusing on the backend architecture, technology stack, and implementation details. The system is designed to manage client information, policies, and users for an insurance brokerage firm.

## Technology Stack

### Backend

- **Runtime**: Node.js
- **Framework**: Express.js v4.18.2
- **Programming Language**: TypeScript v5.3.3
- **Database**: Azure SQL Database (migrated from MySQL)
  - **MySQL Client**: mysql2 v3.14.1 (for legacy/migration support)
  - **Azure SQL Client**: mssql v11.0.1
- **Authentication**: JWT (JSON Web Tokens) v9.0.2
- **Security**: bcryptjs v2.4.3
- **API Style**: RESTful API
- **Utilities**: uuid v11.1.0, dotenv v16.4.4
- **Development**: ts-node-dev v2.0.0

### Frontend

- **Framework**: Next.js v15.3.1
- **UI Library**: React v19.0.0, React DOM v19.0.0
- **Programming Language**: TypeScript v5
- **Styling**: Tailwind CSS v3.3.0
- **State Management**: React Context API
- **HTTP Client**: Axios v1.9.0
- **UI Components**: Lucide React v0.507.0, Framer Motion v12.10.0
- **Utilities**: JWT Decode v4.0.0, JS-Cookie v3.0.5
- **PDF Generation**: jspdf v3.0.1, jspdf-autotable v5.0.2
- **Notifications**: React Hot Toast v2.5.2

## Architecture

The backend follows a modular architecture with clear separation of concerns:

1. **Controllers/Routes**: Handle HTTP requests and responses
2. **Models**: Represent data structures and database operations
3. **Middleware**: Handle cross-cutting concerns like authentication, authorization, and error handling
4. **Services**: Implement business logic
5. **Utils**: Provide utility functions

## API Endpoints

### Authentication

- `POST /api/auth/login`: Authenticates a user and returns a JWT token
- `GET /api/auth/me`: Returns the current authenticated user's information
- `POST /api/auth/users`: Creates a new user (admin only)

### Clients

- `GET /api/clients`: Gets all clients
- `GET /api/clients/:id`: Gets a client by ID
- `POST /api/clients`: Creates a new client
- `PUT /api/clients/:id`: Updates an existing client
- `DELETE /api/clients/:id`: Deletes a client
- `POST /api/clients/search`: Searches for clients based on criteria

### Database Testing

- `GET /api/test-db`: Tests database connectivity

## Database Schema

### Users Table

- `id`: INT (Primary Key, Auto Increment)
- `email`: VARCHAR(255)
- `password`: VARCHAR(255) (Hashed)
- `first_name`: VARCHAR(255)
- `last_name`: VARCHAR(255)
- `role`: VARCHAR(50)
- `phone_number`: VARCHAR(50) (Nullable)
- `last_login`: DATETIME (Nullable)
- `status`: NVARCHAR(20) DEFAULT 'active'
- `created_at`: DATETIME DEFAULT CURRENT_TIMESTAMP
- `updated_at`: DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

### Clients Table

- `id`: VARCHAR(36) (Primary Key)
- `introducer_code`: VARCHAR(255) (Nullable)
- `customer_type`: VARCHAR(50)
- `product`: VARCHAR(50)
- `policy_`: VARCHAR(255) (Nullable)
- `insurance_provider`: VARCHAR(100)
- `branch`: VARCHAR(100) (Nullable)
- `client_name`: VARCHAR(255)
- `street1`: VARCHAR(255) (Nullable)
- `street2`: VARCHAR(255) (Nullable)
- `city`: VARCHAR(100) (Nullable)
- `district`: VARCHAR(100) (Nullable)
- `province`: VARCHAR(100) (Nullable)
- `telephone`: VARCHAR(50) (Nullable)
- `mobile_no`: VARCHAR(50)
- `contact_person`: VARCHAR(255) (Nullable)
- `email`: VARCHAR(255) (Nullable)
- `social_media`: VARCHAR(255) (Nullable)
- `nic_proof`: VARCHAR(255) (Nullable)
- `dob_proof`: VARCHAR(255) (Nullable)
- `business_registration`: VARCHAR(255) (Nullable)
- `svat_proof`: VARCHAR(255) (Nullable)
- `vat_proof`: VARCHAR(255) (Nullable)
- `policy_type`: VARCHAR(100) (Nullable)
- `policy_no`: VARCHAR(100)
- `policy_period_from`: DATE
- `policy_period_to`: DATE
- `coverage`: VARCHAR(255) (Nullable)
- `sum_insured`: DECIMAL(18,2) (Nullable)
- `basic_premium`: DECIMAL(18,2) (Nullable)
- `srcc_premium`: DECIMAL(18,2) (Nullable)
- `tc_premium`: DECIMAL(18,2) (Nullable)
- `net_premium`: DECIMAL(18,2) (Nullable)
- `stamp_duty`: DECIMAL(18,2) (Nullable)
- `admin_fees`: DECIMAL(18,2) (Nullable)
- `road_safety_fee`: DECIMAL(18,2) (Nullable)
- `policy_fee`: DECIMAL(18,2) (Nullable)
- `vat_fee`: DECIMAL(18,2) (Nullable)
- `total_invoice`: DECIMAL(18,2) (Nullable)
- `debit_note`: VARCHAR(255) (Nullable)
- `payment_receipt`: VARCHAR(255) (Nullable)
- `commission_type`: VARCHAR(50) (Nullable)
- `commission_basic`: DECIMAL(18,2) (Nullable)
- `commission_srcc`: DECIMAL(18,2) (Nullable)
- `commission_tc`: DECIMAL(18,2) (Nullable)
- `sales_rep_id`: INT (Nullable) - No longer a foreign key
- `created_at`: DATETIME DEFAULT CURRENT_TIMESTAMP
- `updated_at`: DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

## Authentication & Authorization

- **JWT Authentication**: Users are authenticated using JSON Web Tokens
- **Role-Based Authorization**: Different roles (admin, manager, sales, underwriter) have different permissions
- **Token Expiration**: Tokens expire after 24 hours
- **Password Security**: Passwords are hashed using bcrypt

## Database Migration

The system was initially designed to work with a MySQL database (XAMPP), but has been migrated to Azure SQL Database. The migration involved:

1. Creating an Azure SQL Database instance in the cloud
2. Updating the database connection code to use the mssql package instead of mysql2
3. Modifying SQL queries to use T-SQL syntax instead of MySQL syntax
4. Converting database schema and constraints to be compatible with SQL Server
5. Using parameterized queries throughout the application to prevent SQL injection
6. Ensuring proper data type conversion between the application and database

## Key Implementation Details

### Database Connection Pool

The application uses a connection pool to efficiently manage database connections:

```typescript
const config = {
  server: process.env.AZURE_SQL_SERVER || '',
  database: process.env.AZURE_SQL_DATABASE || '',
  user: process.env.AZURE_SQL_USER || '',
  password: process.env.AZURE_SQL_PASSWORD || '',
  port: Number(process.env.AZURE_SQL_PORT) || 1433,
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true
  },
  connectionTimeout: 30000,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Create a global pool that will be reused across requests
const pool = new mssql.ConnectionPool(config);
const sqlPool = pool.connect();
```

### Authentication Flow

The authentication flow includes:

1. User submits credentials
2. Backend validates credentials against the database
3. If valid, backend generates a JWT token with user ID and role
4. Token is returned to the client
5. Client includes token in the Authorization header for subsequent requests
6. Backend validates token and checks user permissions for protected routes

### Error Handling

The application implements consistent error handling across all routes:

- HTTP status codes for different types of errors (400, 401, 403, 404, 500)
- Detailed error messages for debugging
- Error logging to the console (could be extended to a logging service)

## Recent Updates

1. Removed the foreign key constraint on `sales_rep_id` in the clients table to allow clients to be created without requiring a sales representative
2. Added the `status` column to the users table to support account activation/deactivation
3. Updated client-related APIs to handle nullable fields properly
4. Improved error handling and validation in API endpoints

## Deployment

The backend is designed to be deployed to Azure App Service:

1. The application is containerized using Docker
2. Environment variables are used to configure the application
3. Azure infrastructure is defined using Azure Resource Manager templates
4. CI/CD pipelines automatically build and deploy the application

## Security Considerations

1. All passwords are hashed before storing in the database
2. JWT tokens are used for authentication to avoid session management issues
3. CORS is configured to restrict access to known frontend origins
4. Environment variables are used for sensitive configuration
5. Input validation is performed on all API endpoints
6. Parameterized queries are used to prevent SQL injection

## Next Steps and Improvements

1. Implement refresh tokens for better authentication security
2. Add more comprehensive logging using a dedicated logging service
3. Implement rate limiting to prevent abuse
4. Add unit and integration tests for all API endpoints
5. Set up monitoring and alerting for production deployment 