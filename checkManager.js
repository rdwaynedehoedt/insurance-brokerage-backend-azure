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

async function checkManager() {
  try {
    console.log('Connecting to database...');
    const pool = await sql.connect(config);
    console.log('Connected to database.');
    
    const result = await pool.request()
      .input('email', 'manager@insurance-brokerage.com')
      .query('SELECT id, email, first_name, last_name, role FROM users WHERE email = @email');
    
    if (result.recordset.length > 0) {
      console.log('Manager User Found:');
      console.log(result.recordset[0]);
    } else {
      console.log('Manager user not found.');
    }
    
    await sql.close();
  } catch (err) {
    console.error('Error:', err);
    if (sql) await sql.close();
  }
}

checkManager(); 