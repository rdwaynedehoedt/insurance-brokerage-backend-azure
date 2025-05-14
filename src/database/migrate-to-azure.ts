import mysql from 'mysql2/promise';
import * as mssql from 'mssql';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

dotenv.config();

// MySQL connection config
const mysqlConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'insurance_brokerage',
  port: Number(process.env.DB_PORT) || 3306,
};

// Azure SQL connection config
const azureSqlConfig = {
  server: process.env.AZURE_SQL_SERVER || '',
  database: process.env.AZURE_SQL_DATABASE || '',
  user: process.env.AZURE_SQL_USER || '',
  password: process.env.AZURE_SQL_PASSWORD || '',
  port: Number(process.env.AZURE_SQL_PORT) || 1433,
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true
  }
};

// Function to create the schema in Azure SQL
async function createAzureSqlSchema() {
  console.log('Creating schema in Azure SQL...');
  
  try {
    // Read the schema file
    const schemaFile = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaFile, 'utf8');
    
    // Split by GO statements (T-SQL batch separator)
    const batches = schemaSql.split(/\r?\nGO\r?\n/);
    
    // Connect to Azure SQL
    const pool = await mssql.connect(azureSqlConfig);
    
    // Execute each batch
    for (const batch of batches) {
      if (batch.trim()) {
        console.log(`Executing batch: ${batch.substring(0, 100)}...`);
        await pool.request().query(batch);
      }
    }
    
    console.log('Schema created successfully');
    return pool;
  } catch (error) {
    console.error('Error creating Azure SQL schema:', error);
    throw error;
  }
}

// Function to migrate users from MySQL to Azure SQL
async function migrateUsers(mysqlPool: mysql.Pool, azurePool: mssql.ConnectionPool) {
  console.log('Migrating users...');
  
  try {
    // Get users from MySQL
    const [users]: any = await mysqlPool.query('SELECT * FROM users');
    console.log(`Found ${users.length} users to migrate`);
    
    // Insert each user into Azure SQL
    for (const user of users) {
      const request = azurePool.request();
      
      // Map MySQL boolean to SQL Server bit (0/1)
      const isActive = user.is_active ? 1 : 0;
      
      // Handle datetime fields
      const lastLogin = user.last_login ? new Date(user.last_login) : null;
      const createdAt = user.created_at ? new Date(user.created_at) : new Date();
      const updatedAt = user.updated_at ? new Date(user.updated_at) : new Date();
      
      // Add parameters
      request.input('id', mssql.Int, user.id);
      request.input('email', mssql.VarChar(255), user.email);
      request.input('password', mssql.VarChar(255), user.password);
      request.input('first_name', mssql.VarChar(100), user.first_name);
      request.input('last_name', mssql.VarChar(100), user.last_name);
      request.input('role', mssql.VarChar(20), user.role);
      request.input('phone_number', mssql.VarChar(20), user.phone_number);
      request.input('is_active', mssql.Bit, isActive);
      request.input('last_login', mssql.DateTime, lastLogin);
      request.input('created_at', mssql.DateTime, createdAt);
      request.input('updated_at', mssql.DateTime, updatedAt);
      
      // Use SET IDENTITY_INSERT to preserve IDs
      await request.query('SET IDENTITY_INSERT users ON');
      
      // Insert the user
      const query = `
        INSERT INTO users (
          id, email, password, first_name, last_name, role, 
          phone_number, is_active, last_login, created_at, updated_at
        )
        VALUES (
          @id, @email, @password, @first_name, @last_name, @role,
          @phone_number, @is_active, @last_login, @created_at, @updated_at
        )
      `;
      
      await request.query(query);
      
      // Turn off IDENTITY_INSERT
      await azurePool.request().query('SET IDENTITY_INSERT users OFF');
      
      console.log(`Migrated user: ${user.email}`);
    }
    
    console.log('Users migration completed');
  } catch (error) {
    console.error('Error migrating users:', error);
    throw error;
  }
}

// Function to migrate clients from MySQL to Azure SQL
async function migrateClients(mysqlPool: mysql.Pool, azurePool: mssql.ConnectionPool) {
  console.log('Migrating clients...');
  
  try {
    // Get clients from MySQL
    const [clients]: any = await mysqlPool.query('SELECT * FROM clients');
    console.log(`Found ${clients.length} clients to migrate`);
    
    // Insert each client into Azure SQL
    for (const client of clients) {
      const request = azurePool.request();
      
      // Convert dates
      const createdAt = client.created_at ? new Date(client.created_at) : new Date();
      const updatedAt = client.updated_at ? new Date(client.updated_at) : new Date();
      
      // Add all client fields as parameters
      Object.entries(client).forEach(([key, value]) => {
        // Skip NULL values for optional fields
        if (value !== null) {
          request.input(key, value);
        }
      });
      
      // Override date fields with proper Date objects
      request.input('created_at', mssql.DateTime, createdAt);
      request.input('updated_at', mssql.DateTime, updatedAt);
      
      // Generate column names and parameter names for the query
      const columnNames = Object.keys(client).filter(key => client[key] !== null).join(', ');
      const paramNames = Object.keys(client).filter(key => client[key] !== null).map(key => `@${key}`).join(', ');
      
      // Insert the client
      const query = `INSERT INTO clients (${columnNames}) VALUES (${paramNames})`;
      await request.query(query);
      
      console.log(`Migrated client: ${client.id} - ${client.client_name}`);
    }
    
    console.log('Clients migration completed');
  } catch (error) {
    console.error('Error migrating clients:', error);
    throw error;
  }
}

// Main migration function
async function migrateDatabase() {
  console.log('Starting database migration to Azure SQL...');
  
  let mysqlPool: mysql.Pool | null = null;
  let azurePool: mssql.ConnectionPool | null = null;
  
  try {
    // Create connections
    mysqlPool = mysql.createPool(mysqlConfig);
    console.log('Connected to MySQL source database');
    
    // Create schema in Azure SQL
    azurePool = await createAzureSqlSchema();
    console.log('Connected to Azure SQL destination database');
    
    // Migrate data
    await migrateUsers(mysqlPool, azurePool);
    await migrateClients(mysqlPool, azurePool);
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // Close connections
    if (mysqlPool) {
      await mysqlPool.end();
      console.log('MySQL connection closed');
    }
    
    if (azurePool) {
      await azurePool.close();
      console.log('Azure SQL connection closed');
    }
  }
}

// Execute the migration
migrateDatabase().catch(err => {
  console.error('Unhandled error during migration:', err);
  process.exit(1);
}); 