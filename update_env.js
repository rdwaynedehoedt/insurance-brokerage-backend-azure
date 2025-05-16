const fs = require('fs');

const envContent = `# Server Configuration
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Azure SQL Database Configuration
AZURE_SQL_SERVER=insurance-brokerage-sqlserver.database.windows.net
AZURE_SQL_DATABASE=insurance_brokerage_db
AZURE_SQL_USER=adminuser
AZURE_SQL_PASSWORD=Admin123
AZURE_SQL_PORT=1433

# Authentication
JWT_SECRET=Dwayne123
JWT_EXPIRATION=7d

# Azure Storage Configuration
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=insurancedocuments;AccountKey=zlOWwjnwcxv1sBEpFQ70bEdDpOXBAiMy6sh4Stw7OLxCe2A8qD3FiQbgmiS/qvYfGRRS1kbh8Nr3+ASt9C4N+A==;EndpointSuffix=core.windows.net
AZURE_STORAGE_CONTAINER_NAME=customer-documents
`;

fs.writeFileSync('.env', envContent);
console.log('.env file updated successfully'); 