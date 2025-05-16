/**
 * Use this script to set environment variables for local testing
 * Run with: node -r ./set_env_vars.js your_script.js
 */

// Server configuration
process.env.PORT = '5000';
process.env.NODE_ENV = 'development';
process.env.CORS_ORIGIN = 'http://localhost:3000';

// Azure SQL Database Configuration
process.env.AZURE_SQL_SERVER = 'insurance-brokerage-sqlserver.database.windows.net';
process.env.AZURE_SQL_DATABASE = 'insurance_brokerage_db';
process.env.AZURE_SQL_USER = 'adminuser';
process.env.AZURE_SQL_PASSWORD = 'Admin123';
process.env.AZURE_SQL_PORT = '1433';

// Authentication
process.env.JWT_SECRET = 'Dwayne123';
process.env.JWT_EXPIRATION = '7d';

// Azure Storage Configuration
// NOTE: This key should be regenerated in Azure Portal since it was exposed
process.env.AZURE_STORAGE_CONNECTION_STRING = 'DefaultEndpointsProtocol=https;AccountName=insurancedocuments;AccountKey=YOUR_NEW_KEY_HERE;EndpointSuffix=core.windows.net';
process.env.AZURE_STORAGE_CONTAINER_NAME = 'customer-documents';

console.log('Environment variables have been set for local development');

// Export module if needed
module.exports = {}; 