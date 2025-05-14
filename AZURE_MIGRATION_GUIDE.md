# Azure SQL Database Migration Guide

This guide will help you migrate your Insurance Brokerage application from MySQL to Azure SQL Database.

## Prerequisites

- Azure subscription
- Azure SQL Database server provisioned
- Azure CLI or Azure Portal access
- Node.js and npm installed locally
- Access to your current MySQL database

## Step 1: Set Up Azure SQL Database

1. **Create an Azure SQL Database server**:
   - Go to [Azure Portal](https://portal.azure.com)
   - Search for "SQL databases" and click "Create"
   - Choose subscription, resource group, and database name
   - Create a new server or select an existing one
   - Choose a pricing tier (Basic, Standard, or Premium)
   - Click "Review + create" and then "Create"

2. **Set up Firewall Rules**:
   - In your Azure SQL Database resource, go to "Networking"
   - Add your client IP address to allow connections from your development machine
   - Optionally, add Azure services access by setting "Allow Azure services and resources to access this server" to "Yes"

3. **Get Connection Information**:
   - In your Azure SQL Database resource, go to "Connection strings"
   - Note down the server name, database name, username, and password

## Step 2: Update Environment Variables

1. Create a `.env` file in the project root if it doesn't exist
2. Add the following variables with your Azure SQL Database details:

```
# Azure SQL Database Configuration
AZURE_SQL_SERVER=your-server-name.database.windows.net
AZURE_SQL_DATABASE=your_database_name
AZURE_SQL_USER=your_username
AZURE_SQL_PASSWORD=your_password
AZURE_SQL_PORT=1433
```

## Step 3: Update Database Configuration

The backend code has been updated to use Azure SQL Database. Review the following files:

- `src/config/database.ts`: Updated to connect to Azure SQL
- `src/models/Client.ts`: Updated to use mssql syntax
- `src/database/schema.sql`: Updated to use T-SQL syntax

## Step 4: Migrate Data

### Option 1: Automatic Migration

We've created a script to automatically migrate data from MySQL to Azure SQL:

1. Ensure your MySQL database is running and accessible
2. Add your MySQL connection details to `.env`:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=insurance_brokerage
DB_PORT=3306
```

3. Run the migration script:

```bash
npm run migrate-to-azure
```

### Option 2: Manual Migration

If you prefer to migrate manually:

1. **Export Data from MySQL**:
   ```bash
   mysqldump -u root -p insurance_brokerage > insurance_brokerage_backup.sql
   ```

2. **Create Tables in Azure SQL**:
   - Connect to your Azure SQL Database using Azure Data Studio or SSMS
   - Execute the schema.sql script to create the tables

3. **Import Data**:
   - Modify the MySQL dump file to be compatible with T-SQL syntax
   - Execute the modified script in Azure SQL
   - Alternatively, use Azure Data Migration Service

## Step 5: Test the Connection

1. Run the application in development mode:

```bash
npm run dev
```

2. Test API endpoints to ensure they're working with Azure SQL Database

## Step 6: Deploy to Azure

Once everything is working locally, deploy to Azure:

1. **Azure App Service**:
   - Create an App Service resource
   - Deploy your backend code using Azure DevOps, GitHub Actions, or local deployment
   - Set up environment variables in App Service Configuration

2. **Environment Variables**:
   - Make sure your connection strings and other settings are properly configured in Azure

## Step 7: Verify Production

1. Test the production endpoints to verify connection to Azure SQL
2. Monitor performance and adjust scaling as needed

## Troubleshooting

### Connection Issues

- Verify firewall rules allow your connection
- Check connection string details are correct
- Ensure SQL server and database are running

### Migration Issues

- Check for data type compatibility between MySQL and Azure SQL
- Watch for SQL syntax differences
- For large databases, consider batch migration

### Performance Issues

- Review Azure SQL Query Performance Insight
- Consider indexing strategies for your specific workload
- Monitor DTU/vCore usage and scale as needed

## Additional Resources

- [Azure SQL Documentation](https://docs.microsoft.com/en-us/azure/azure-sql/)
- [Node.js mssql Package Documentation](https://github.com/tediousjs/node-mssql)
- [Azure Data Migration Service](https://azure.microsoft.com/en-us/services/database-migration/)
- [SQL Server Migration Assistant](https://www.microsoft.com/en-us/download/details.aspx?id=54258) 