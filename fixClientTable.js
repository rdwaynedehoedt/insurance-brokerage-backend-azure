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

async function fixClientTable() {
  try {
    console.log('Connecting to database...');
    const pool = await sql.connect(config);
    console.log('Connected to database.');
    
    // First, check if the constraint exists
    const constraintCheck = await pool.request().query(`
      SELECT name 
      FROM sys.foreign_keys 
      WHERE name = 'FK__clients__sales_r__73BA3083'
    `);
    
    if (constraintCheck.recordset.length > 0) {
      console.log('Found foreign key constraint on sales_rep_id, removing it...');
      
      // Drop the foreign key constraint
      await pool.request().query(`
        ALTER TABLE clients
        DROP CONSTRAINT FK__clients__sales_r__73BA3083
      `);
      
      console.log('Foreign key constraint removed successfully.');
    } else {
      console.log('Foreign key constraint not found. Checking for any constraints on sales_rep_id...');
      
      // Check for any constraints on sales_rep_id
      const allConstraints = await pool.request().query(`
        SELECT fk.name
        FROM sys.foreign_keys AS fk
        JOIN sys.foreign_key_columns AS fkc ON fk.object_id = fkc.constraint_object_id
        JOIN sys.columns AS c ON fkc.parent_column_id = c.column_id AND fkc.parent_object_id = c.object_id
        WHERE c.name = 'sales_rep_id'
      `);
      
      if (allConstraints.recordset.length > 0) {
        console.log(`Found different constraint name: ${allConstraints.recordset[0].name}`);
        
        await pool.request().query(`
          ALTER TABLE clients
          DROP CONSTRAINT ${allConstraints.recordset[0].name}
        `);
        
        console.log('Constraint removed successfully.');
      } else {
        console.log('No foreign key constraints found on sales_rep_id column.');
      }
    }
    
    // Now check if sales_rep_id is nullable
    const columnCheck = await pool.request().query(`
      SELECT is_nullable
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'clients' AND COLUMN_NAME = 'sales_rep_id'
    `);
    
    if (columnCheck.recordset.length > 0 && columnCheck.recordset[0].is_nullable === 'NO') {
      console.log('Modifying sales_rep_id to allow NULL values...');
      
      await pool.request().query(`
        ALTER TABLE clients
        ALTER COLUMN sales_rep_id INT NULL
      `);
      
      console.log('Column modified to allow NULL values.');
    } else if (columnCheck.recordset.length > 0) {
      console.log('sales_rep_id column already allows NULL values.');
    } else {
      console.log('sales_rep_id column not found in clients table.');
    }
    
    console.log('Client table fixed successfully.');
    
    await sql.close();
  } catch (err) {
    console.error('Error:', err);
    if (sql) await sql.close();
  }
}

fixClientTable(); 