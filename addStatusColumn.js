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

async function addStatusColumn() {
  try {
    console.log('Connecting to database...');
    const pool = await sql.connect(config);
    console.log('Connected to database.');
    
    // Check if status column exists
    const columnCheck = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'status'
    `);
    
    if (columnCheck.recordset.length === 0) {
      console.log('Adding status column to users table...');
      
      // Add status column
      await pool.request().query(`
        ALTER TABLE users
        ADD status NVARCHAR(20) NOT NULL DEFAULT 'active'
      `);
      
      console.log('Status column added successfully.');
    } else {
      console.log('Status column already exists.');
    }
    
    // Update all existing users to have 'active' status
    console.log('Updating existing users to have active status...');
    await pool.request().query(`
      UPDATE users 
      SET status = 'active'
      WHERE status IS NULL OR status = ''
    `);
    
    console.log('Users updated successfully.');
    
    // Get users and their status
    const users = await pool.request().query(`
      SELECT id, email, first_name, last_name, role, status
      FROM users
    `);
    
    console.log('Users in database:');
    users.recordset.forEach(user => {
      console.log(`ID: ${user.id}, Email: ${user.email}, Name: ${user.first_name} ${user.last_name}, Role: ${user.role}, Status: ${user.status}`);
    });
    
    await sql.close();
  } catch (err) {
    console.error('Error:', err);
    if (sql) await sql.close();
  }
}

addStatusColumn(); 