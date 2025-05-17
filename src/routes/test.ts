import { Router, Request, Response } from 'express';
import sqlPool from '../config/database';
import storageService from '../services/storage';

const router = Router();

router.get('/test-db', async (req: Request, res: Response) => {
  try {
    // Get connection from pool
    const pool = await sqlPool;
    
    // Test basic connection
    const connectionTest = await pool.request().query('SELECT 1 + 1 AS result');
    
    // Test users table
    const users = await pool.request().query('SELECT COUNT(*) as userCount FROM users');
    
    res.json({ 
      message: 'Database connection successful',
      connectionTest: connectionTest.recordset,
      users: users.recordset,
      databaseInfo: {
        server: process.env.AZURE_SQL_SERVER,
        database: process.env.AZURE_SQL_DATABASE,
        port: process.env.AZURE_SQL_PORT
      }
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ 
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/test-document/:clientId/:documentType/:filename', async (req: Request, res: Response) => {
  try {
    const { clientId, documentType, filename } = req.params;
    
    console.log(`Test document request for: ${clientId}/${documentType}/${filename}`);
    
    // Generate a secure URL
    const url = await storageService.generateSecureUrl(
      clientId,
      documentType,
      filename,
      30 * 60 // 30 minutes in seconds
    );
    
    console.log(`Generated secure URL: ${url.substring(0, url.indexOf('?') + 10)}...`);
    
    // Return HTML page with the image embedded
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Document Test</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
            img { max-width: 100%; border: 1px solid #ddd; }
            .container { max-width: 800px; margin: 0 auto; }
            .error { color: red; }
            .success { color: green; }
            pre { background: #f4f4f4; padding: 10px; overflow: auto; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Document Viewer Test</h1>
            <p>Testing document: <strong>${clientId}/${documentType}/${filename}</strong></p>
            
            <h2>Direct URL Image Test</h2>
            <p>The image below is loaded directly from Azure using a SAS token:</p>
            <img 
              src="${url}" 
              alt="Document" 
              onerror="document.getElementById('direct-error').style.display='block'"
            />
            <div id="direct-error" class="error" style="display:none">
              <p>Error loading the image directly from Azure.</p>
            </div>
            
            <h2>URL Information</h2>
            <p>URL: <code>${url.substring(0, url.indexOf('?') + 10)}...</code></p>
            
            <h2>Troubleshooting</h2>
            <p>If the image doesn't load:</p>
            <ol>
              <li>Check if the file exists in Azure Blob Storage</li>
              <li>Check for CORS issues (open browser console)</li>
              <li>Check if SAS token is valid</li>
              <li>Try accessing the image URL directly</li>
            </ol>
            
            <script>
              // Log information to console
              console.log('Testing document URL: ${url}');
              
              // Test image loading
              const img = new Image();
              img.onload = function() {
                console.log('Image loaded successfully');
                document.getElementById('js-result').textContent = 'Image loaded successfully via JavaScript';
                document.getElementById('js-result').className = 'success';
              };
              img.onerror = function() {
                console.error('Error loading image via JavaScript');
                document.getElementById('js-result').textContent = 'Error loading image via JavaScript';
                document.getElementById('js-result').className = 'error';
              };
              img.src = "${url}";
              
              // Test direct fetch
              fetch('${url}')
                .then(response => {
                  console.log('Fetch response:', response.status, response.statusText);
                  document.getElementById('fetch-result').textContent = 
                    'Fetch response: ' + response.status + ' ' + response.statusText;
                  document.getElementById('fetch-result').className = 
                    response.ok ? 'success' : 'error';
                })
                .catch(error => {
                  console.error('Fetch error:', error);
                  document.getElementById('fetch-result').textContent = 'Fetch error: ' + error.message;
                  document.getElementById('fetch-result').className = 'error';
                });
            </script>
            
            <h2>Test Results</h2>
            <p id="js-result">Testing...</p>
            <p id="fetch-result">Testing...</p>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error in test document endpoint:', error);
    res.status(500).json({ message: 'Error testing document' });
  }
});

export default router; 