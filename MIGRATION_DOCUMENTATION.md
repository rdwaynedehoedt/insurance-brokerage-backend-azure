# Insurance Brokerage Application - MySQL to Azure SQL Migration Documentation

## Overview

This document outlines the migration of the Insurance Brokerage application's database from XAMPP (MySQL) to Azure SQL Database. The migration includes updating the codebase to work with the new database system.

## Azure SQL Database Setup

- **Database Server**: insurance-brokerage-sqlserver.database.windows.net
- **Database Name**: insurance_brokerage_db
- **Admin Username**: adminuser
- **Admin Password**: Admin123

## Migration Steps Completed

### 1. Environment Configuration

Created a `.env` file with the necessary Azure SQL connection details:

```
AZURE_SQL_SERVER=insurance-brokerage-sqlserver.database.windows.net
AZURE_SQL_DATABASE=insurance_brokerage_db
AZURE_SQL_USER=adminuser
AZURE_SQL_PASSWORD=Admin123
AZURE_SQL_PORT=1433
JWT_SECRET=your-jwt-secret-key
```

### 2. Database Configuration

Updated the database configuration file (`src/config/database.ts`) to:
- Replace MySQL with MSSQL
- Configure connection pool for Azure SQL
- Set up proper encryption and other Azure SQL specific options

### 3. Database Initialization

Modified `src/database/init.ts` to:
- Create database tables using T-SQL syntax
- Adapt column types for compatibility with SQL Server
- Update query syntax for Azure SQL

### 4. Test Data Seeding

Updated `src/database/seed.ts` to:
- Use parameterized queries with the MSSQL format
- Insert initial test users and sample data

### 5. API Routes Update

Updated the following route files to use MSSQL query syntax:
- `src/routes/auth.ts`: Updated login, user management, and authentication endpoints
- `src/routes/test.ts`: Updated database test endpoints
- `src/routes/clients.ts`: Uses the updated Client model

### 6. Models Update

Updated the Client model (`src/models/Client.ts`) to use MSSQL:
- Modified all database queries to use parameterized queries
- Updated pagination queries (OFFSET-FETCH instead of LIMIT-OFFSET)
- Adjusted result handling to use `recordset` instead of array destructuring

### 7. Schema Updates

Added a status column to the users table to ensure the authentication system works correctly:
- Default value set to 'active'
- Used for checking if an account is enabled during login

## Current Status

The migration is now complete. The database schema and test data have been created in Azure SQL, and all the code has been updated to use MSSQL syntax instead of MySQL.

### Database Tables

The following tables have been successfully created in the Azure SQL database:
- `users`: Stores user account information (includes email, password, first_name, last_name, role, and status)
- `clients`: Stores client information for the insurance brokerage

### Test Users

The following test users have been created in the database:

1. **Admin User**
   - Email: admin@insurance-brokerage.com
   - Password: Admin@123
   - Role: admin
   - Status: active

2. **Manager User**
   - Email: manager@insurance-brokerage.com
   - Password: Manager@123
   - Role: manager
   - Status: active

## Running the Application

To start the backend server:
```
npm run dev
```

The API is accessible at `http://localhost:5000` with the following endpoints:
- `GET /api/test-db`: Tests the database connection
- `POST /api/auth/login`: User login
- `GET /api/auth/me`: Get current user information
- `POST /api/auth/users`: Create a new user (admin only)
- Various client management endpoints under `/api/clients`

## Account Status Management

The application includes account status management:
- New accounts are created with status = 'active' by default
- During login, the application checks if the account status is 'active'
- If the status is not 'active', the user will receive an error message: "Account is not active. Please contact administrator."
- Admin users can change the status of accounts (active/inactive) to control access 