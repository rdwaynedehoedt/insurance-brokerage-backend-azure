# Insurance Brokerage Backend Deployment Configuration

This document outlines the necessary deployment configuration for the Insurance Brokerage backend application.

## Endpoint Details

- **Port**: 5000
- **API Type**: REST
- **Base Path**: /api

## Environment Variables

### Database Configuration
| Variable Name | Description | Example Value | Secret |
|---------------|-------------|--------------|--------|
| `AZURE_SQL_SERVER` | Azure SQL Server hostname | yourdatabase.database.windows.net | Yes |
| `AZURE_SQL_DATABASE` | Database name | insurance_brokerage_db | Yes |
| `AZURE_SQL_USER` | Database username | admin_user | Yes |
| `AZURE_SQL_PASSWORD` | Database password | YourStrongPassword123! | Yes |
| `AZURE_SQL_PORT` | Database port (default 1433) | 1433 | No |

### Authentication
| Variable Name | Description | Example Value | Secret |
|---------------|-------------|--------------|--------|
| `JWT_SECRET` | Secret key for JWT token signing | YourRandomSecretKey123456 | Yes |
| `JWT_EXPIRATION` | JWT token expiration time in seconds | 86400 (24 hours) | No |

### Application Settings
| Variable Name | Description | Example Value | Secret |
|---------------|-------------|--------------|--------|
| `PORT` | Application port (default 5000) | 5000 | No |
| `NODE_ENV` | Environment (development/production) | production | No |
| `CORS_ORIGIN` | Allowed origins for CORS | https://your-frontend-domain.com | No |

## Deployment Checklist

Before deploying the application, ensure that:

1. All required environment variables are configured
2. The Azure SQL Database is accessible from the deployment environment
3. Proper network security groups and firewall rules are configured
4. TLS/SSL is configured if the API will be publicly accessible
5. JWT_SECRET is sufficiently complex and secure

## File Mounts (if needed)

If your application requires file mounts (for certificates, configuration files, etc.), specify them here:

| Source Path | Destination Path | Description |
|-------------|------------------|-------------|
| `/path/to/ssl/cert.pem` | `/app/certs/cert.pem` | SSL Certificate |
| `/path/to/ssl/key.pem` | `/app/certs/key.pem` | SSL Key |

## Container Configuration

- **Node Version**: 20 LTS
- **Base Image**: node:20-alpine
- **Working Directory**: /app
- **Start Command**: `npm start`

## Health Check

Configure a health check endpoint to monitor the application's status:

- **Endpoint**: GET /api
- **Success Status**: 200
- **Interval**: 30s
- **Timeout**: 5s
- **Initial Delay**: 10s

## Resource Requirements

Minimum recommended resources for the application:

- **CPU**: 0.5 vCPU
- **Memory**: 512 MB
- **Disk**: 1 GB 