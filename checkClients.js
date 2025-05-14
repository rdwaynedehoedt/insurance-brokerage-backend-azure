const sql = require('mssql');

const config = {
  server: 'insurance-brokerage-sqlserver.database.windows.net',
  user: 'adminuser',
  password: 'Admin123',
  database: 'insurance_brokerage_db',
  options: {
    encrypt: true
  }
};

async function checkClientsTable() {
  try {
    console.log('Connecting to database...');
    const pool = await sql.connect(config);
    console.log('Connected to database.');
    
    // Get count of records in clients table
    const countResult = await pool.request().query('SELECT COUNT(*) as clientCount FROM clients');
    const clientCount = countResult.recordset[0].clientCount;
    
    console.log(`Clients table has ${clientCount} records.`);
    
    if (clientCount > 0) {
      // Get first 5 clients to show some data
      const clientsResult = await pool.request().query('SELECT TOP 5 * FROM clients');
      console.log('Sample client records:');
      clientsResult.recordset.forEach((client, index) => {
        console.log(`Client ${index + 1}:`);
        console.log(client);
        console.log('-------------------');
      });
    } else {
      console.log('The clients table is empty.');
    }
    
    await sql.close();
  } catch (err) {
    console.error('Error:', err);
    if (sql) await sql.close();
  }
}

checkClientsTable(); 