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

async function createTestClient() {
  try {
    console.log('Connecting to database...');
    const pool = await sql.connect(config);
    console.log('Connected to database.');
    
    // First, check the table structure to see the actual column names
    console.log('Checking table structure...');
    const columnsResult = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'clients'
    `);
    
    console.log('Available columns in clients table:');
    const columns = columnsResult.recordset.map(col => col.COLUMN_NAME);
    console.log(columns);
    
    // Generate a unique client ID
    const clientId = `C${Date.now().toString().substring(6)}`;
    
    // Create test client data with valid column names
    const client = {
      id: clientId,
      customer_type: 'Individual',
      product: 'Motor Insurance',
      insurance_provider: 'ABC Insurance',
      client_name: 'John Doe',
      mobile_no: '1234567890',
      email: 'john.doe@example.com',
      policy_no: 'POL12345',
      policy_period_from: '2023-01-01',
      policy_period_to: '2024-01-01',
      sum_insured: 100000,
      basic_premium: 5000  // Using basic_premium instead of premium
    };
    
    // Build the query dynamically
    const fields = Object.keys(client).join(', ');
    const paramNames = Object.keys(client).map((_, i) => `@p${i+1}`).join(', ');
    
    const request = pool.request();
    
    // Add parameters
    Object.entries(client).forEach(([key, value], i) => {
      request.input(`p${i+1}`, value);
    });
    
    // Insert client
    const query = `
      INSERT INTO clients (${fields})
      VALUES (${paramNames})
    `;
    
    console.log('Executing query:', query);
    
    const result = await request.query(query);
    
    console.log('Client created successfully:', result);
    console.log('Client ID:', clientId);
    
    await sql.close();
  } catch (err) {
    console.error('Error creating test client:', err);
    if (sql) await sql.close();
  }
}

createTestClient(); 