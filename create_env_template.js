const fs = require('fs');

const templateEnvContent = `# Server Configuration
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Azure SQL Database Configuration
AZURE_SQL_SERVER=your-server.database.windows.net
AZURE_SQL_DATABASE=your_database_name
AZURE_SQL_USER=your_username
AZURE_SQL_PASSWORD=your_password
AZURE_SQL_PORT=1433

# Authentication
JWT_SECRET=your_secret_key
JWT_EXPIRATION=7d

# Azure Storage Configuration
# Format: DefaultEndpointsProtocol=https;AccountName=YOUR_ACCOUNT_NAME;AccountKey=YOUR_ACCOUNT_KEY;EndpointSuffix=core.windows.net
AZURE_STORAGE_CONNECTION_STRING=your_connection_string
AZURE_STORAGE_CONTAINER_NAME=customer-documents
`;

fs.writeFileSync('.env.template', templateEnvContent);
console.log('.env.template file created successfully');

console.log('⚠️ IMPORTANT: Never commit your actual .env file with real credentials to version control!');
console.log('Copy this template to .env and fill in your actual credentials for local development.'); 