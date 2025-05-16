# Environment Variables Security Guide

## Secure Handling of Environment Variables

This project uses environment variables for configuration. To keep your deployment secure, follow these guidelines:

### Local Development

1. Create a `.env` file in the root directory (it's already in `.gitignore` to prevent accidental commits)
2. Fill in your environment-specific values
3. **NEVER commit the actual `.env` file with real credentials to version control**

### For Local Setup

Run the following to set up your local environment:

```bash
# First time setup - creates a template .env file
node update_env.js

# Then manually edit .env to add your secret keys
```

### Production Deployment

For Azure deployment:
- Use Azure App Service's built-in environment variable configuration
- Set variables in the Azure Portal under Configuration → Application settings
- Never include production secrets in your codebase

### Required Environment Variables

```
# Server Configuration
PORT=5000
NODE_ENV=development/production
CORS_ORIGIN=your_frontend_url

# Azure SQL Database
AZURE_SQL_SERVER=your_server_url
AZURE_SQL_DATABASE=your_database_name
AZURE_SQL_USER=your_username
AZURE_SQL_PASSWORD=your_password
AZURE_SQL_PORT=1433

# Authentication
JWT_SECRET=your_secure_random_string
JWT_EXPIRATION=7d

# Azure Storage
AZURE_STORAGE_CONNECTION_STRING=your_connection_string
AZURE_STORAGE_CONTAINER_NAME=customer-documents
```

## Security Best Practices

1. Use different credentials for development and production
2. Rotate keys regularly
3. Use specific permissions for each service account
4. Monitor for exposed secrets using GitHub's secret scanning
5. If a secret is exposed, regenerate it immediately

## What to Do if a Secret is Exposed

If you accidentally commit a secret:
1. Immediately regenerate the exposed credentials
2. The old credentials should be considered compromised
3. Update all environments with the new credentials
4. For Azure Storage keys, regenerate them in the Azure Portal 