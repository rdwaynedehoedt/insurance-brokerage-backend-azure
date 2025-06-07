import { Router, Request, Response } from 'express';
import sqlPool from '../config/database';
import storageService from '../services/storage';
import fs from 'fs';
import path from 'path';

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

// Endpoint to check storage configuration and status
router.get('/storage-info', async (req: Request, res: Response) => {
  try {
    // Check if we're using Azure or local storage
    const storageConfig = {
      storageType: process.env.AZURE_STORAGE_CONNECTION_STRING ? 'Azure Blob Storage' : 'Local Storage',
      accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME || 'Not configured',
      containerName: process.env.AZURE_STORAGE_CONTAINER_NAME || 'customer-documents',
      localStoragePath: './uploads',
      hasConnectionString: !!process.env.AZURE_STORAGE_CONNECTION_STRING,
      hasAccountKey: !!process.env.AZURE_STORAGE_ACCOUNT_KEY
    };
    
    // Check local storage directory
    let localStorageInfo = {};
    if (fs.existsSync('./uploads')) {
      const stats = fs.statSync('./uploads');
      localStorageInfo = {
        exists: true,
        isDirectory: stats.isDirectory(),
        size: formatBytes(getFolderSize('./uploads')),
        created: stats.birthtime,
        modified: stats.mtime
      };
    } else {
      localStorageInfo = { exists: false };
    }
    
    // Count files in local storage
    let localFiles = [];
    if (fs.existsSync('./uploads')) {
      localFiles = await getLocalFilesCount('./uploads');
    }
    
    res.json({
      message: 'Storage information',
      config: storageConfig,
      localStorage: localStorageInfo,
      localFiles,
      routes: {
        uploadDocument: '/api/documents/upload/:clientId/:documentType',
        getSecureUrl: '/api/documents/secure/:clientId/:documentType/:filename',
        deleteDocument: '/api/documents/delete/:clientId/:documentType/:filename',
        testDocument: '/api/test/test-document/:clientId/:documentType/:filename',
        testDeleteDocument: '/api/test/test-delete/:clientId/:documentType/:filename'
      }
    });
  } catch (error) {
    console.error('Error getting storage info:', error);
    res.status(500).json({
      message: 'Error getting storage information',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test endpoint to delete a document
router.get('/test-delete/:clientId/:documentType/:filename', async (req: Request, res: Response) => {
  try {
    const { clientId, documentType, filename } = req.params;
    
    console.log(`Test delete request for: ${clientId}/${documentType}/${filename}`);
    
    // Try to delete the file
    try {
      const success = await storageService.deleteFile(clientId, documentType, filename);
      
      if (success) {
        res.json({
          message: 'Document deleted successfully',
          path: `${clientId}/${documentType}/${filename}`
        });
      } else {
        res.status(404).json({
          message: 'Document not found or could not be deleted',
          path: `${clientId}/${documentType}/${filename}`
        });
      }
    } catch (deleteError) {
      console.error('Error deleting document:', deleteError);
      res.status(500).json({
        message: 'Error deleting document',
        error: deleteError instanceof Error ? deleteError.message : 'Unknown error',
        path: `${clientId}/${documentType}/${filename}`
      });
    }
  } catch (error) {
    console.error('Error in test delete endpoint:', error);
    res.status(500).json({ message: 'Error testing document deletion' });
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
    
    console.log(`Generated secure URL: ${url.substring(0, url.indexOf('?') + 10 || url.length)}...`);
    
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
            .button { 
              display: inline-block;
              background: #ff3030;
              color: white;
              padding: 8px 16px;
              border-radius: 4px;
              text-decoration: none;
              margin-top: 20px;
            }
            .button:hover { background: #ff0000; }
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
            <p>URL: <code>${url.substring(0, url.indexOf('?') + 10 || url.length)}...</code></p>
            
            <h2>Troubleshooting</h2>
            <p>If the image doesn't load:</p>
            <ol>
              <li>Check if the file exists in Azure Blob Storage</li>
              <li>Check for CORS issues (open browser console)</li>
              <li>Check if SAS token is valid</li>
              <li>Try accessing the image URL directly</li>
            </ol>
            
            <h2>Actions</h2>
            <a href="/api/test/test-delete/${clientId}/${documentType}/${filename}" class="button" onclick="return confirm('Are you sure you want to delete this document?')">Delete This Document</a>
            
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

// Helper function to format bytes
function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Helper function to get folder size
function getFolderSize(folderPath: string): number {
  let totalSize = 0;
  
  if (!fs.existsSync(folderPath)) {
    return 0;
  }
  
  const items = fs.readdirSync(folderPath);
  
  for (const item of items) {
    const itemPath = path.join(folderPath, item);
    const stats = fs.statSync(itemPath);
    
    if (stats.isFile()) {
      totalSize += stats.size;
    } else if (stats.isDirectory()) {
      totalSize += getFolderSize(itemPath);
    }
  }
  
  return totalSize;
}

// Helper function to count files in local storage
async function getLocalFilesCount(dirPath: string): Promise<any[]> {
  const result = [];
  
  if (!fs.existsSync(dirPath)) {
    return result;
  }
  
  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const item of items) {
    if (item.isDirectory()) {
      const clientId = item.name;
      const clientPath = path.join(dirPath, clientId);
      
      const docTypes = fs.readdirSync(clientPath, { withFileTypes: true })
        .filter(entry => entry.isDirectory());
      
      let totalClientFiles = 0;
      const docTypesInfo = [];
      
      for (const docType of docTypes) {
        const docTypeName = docType.name;
        const docTypePath = path.join(clientPath, docTypeName);
        
        const files = fs.readdirSync(docTypePath, { withFileTypes: true })
          .filter(entry => entry.isFile());
        
        totalClientFiles += files.length;
        
        docTypesInfo.push({
          docType: docTypeName,
          fileCount: files.length,
          fileNames: files.map(f => f.name)
        });
      }
      
      result.push({
        clientId,
        totalFiles: totalClientFiles,
        documentTypes: docTypesInfo
      });
    }
  }
  
  return result;
}

export default router; 