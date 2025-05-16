import fs from 'fs';
import path from 'path';
import mssql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  server: process.env.AZURE_SQL_SERVER || '',
  database: process.env.AZURE_SQL_DATABASE || '',
  user: process.env.AZURE_SQL_USER || '',
  password: process.env.AZURE_SQL_PASSWORD || '',
  port: Number(process.env.AZURE_SQL_PORT) || 1433,
  options: {
    encrypt: true, // For Azure SQL
    trustServerCertificate: false,
    enableArithAbort: true
  }
};

async function updateSchema() {
  console.log('Starting schema update...');
  console.log('Connection config (without password):', {
    server: config.server,
    database: config.database,
    user: config.user,
    port: config.port
  });

  try {
    // Connect to database
    const pool = await mssql.connect(config);
    console.log('Connected to database');

    // Read and execute alter-clients.sql file
    const alterScriptPath = path.join(__dirname, 'alter-clients.sql');
    console.log(`Reading SQL script from: ${alterScriptPath}`);
    
    const alterScript = fs.readFileSync(alterScriptPath, 'utf8');
    const sqlBatches = alterScript.split('GO').filter(batch => batch.trim() !== '');
    
    console.log(`Found ${sqlBatches.length} SQL batches to execute`);
    
    for (let i = 0; i < sqlBatches.length; i++) {
      const batch = sqlBatches[i];
      console.log(`Executing batch ${i + 1}/${sqlBatches.length}...`);
      try {
        await pool.request().query(batch);
        console.log(`Batch ${i + 1} executed successfully`);
      } catch (err) {
        console.error(`Error executing batch ${i + 1}:`, err);
        throw err;
      }
    }
    
    console.log('Database schema updated successfully!');
    pool.close();
  } catch (err) {
    console.error('Error updating schema:', err);
    process.exit(1);
  }
}

// Run the schema update
updateSchema()
  .then(() => {
    console.log('Schema update completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Schema update failed:', err);
    process.exit(1);
  }); 