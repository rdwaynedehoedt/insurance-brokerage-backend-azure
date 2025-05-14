const sql = require('mssql');
require('dotenv').config();

async function testConnection() {
  console.log('Testing connection to Azure SQL Database...');
  console.log('Connection details (without password):');
  console.log({
    server: process.env.AZURE_SQL_SERVER,
    database: process.env.AZURE_SQL_DATABASE,
    user: process.env.AZURE_SQL_USER,
    port: process.env.AZURE_SQL_PORT
  });
  
  const config = {
    server: process.env.AZURE_SQL_SERVER,
    database: process.env.AZURE_SQL_DATABASE,
    user: process.env.AZURE_SQL_USER,
    password: process.env.AZURE_SQL_PASSWORD,
    port: Number(process.env.AZURE_SQL_PORT) || 1433,
    options: {
      encrypt: true,
      trustServerCertificate: false,
      enableArithAbort: true
    },
    connectionTimeout: 15000, // 15 seconds
    requestTimeout: 15000,
  };

  try {
    console.log('Attempting to connect...');
    const pool = await sql.connect(config);
    console.log('Connection successful!');
    
    console.log('Testing query...');
    const result = await pool.request().query('SELECT 1 as number');
    console.log('Query result:', result.recordset);
    
    await pool.close();
    console.log('Connection closed');
    
    return true;
  } catch (err) {
    console.error('Connection failed with error:');
    console.error(err);
    return false;
  }
}

testConnection()
  .then(success => {
    if (success) {
      console.log('Test completed successfully');
    } else {
      console.log('Test failed');
    }
  })
  .catch(err => {
    console.error('Unhandled error in test:', err);
  }); 