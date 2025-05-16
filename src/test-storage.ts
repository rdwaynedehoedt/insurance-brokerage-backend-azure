import dotenv from 'dotenv';
import storageService from './services/storage';

// Load environment variables
dotenv.config();

async function testStorage() {
  try {
    console.log('Testing Azure Storage Connection...');
    
    // Check if we're in local storage mode
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || '';
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'customer-documents';
    
    console.log('Azure Storage Connection String:', connectionString ? 'Connected' : 'Not provided');
    console.log('Container Name:', containerName);
    
    if (!connectionString || connectionString.trim() === '') {
      console.log('Using local storage mode');
    } else {
      console.log('Using Azure Storage mode');
    }
    
    // Ensure container exists
    try {
      await storageService.ensureContainer();
      console.log('Container creation successful');
    } catch (error) {
      console.error('Error creating container:', error);
    }
    
    // Test uploading a small text file
    try {
      const testBuffer = Buffer.from('This is a test file');
      const documentUrl = await storageService.uploadDocument(
        {
          buffer: testBuffer,
          originalname: 'test.txt',
          mimetype: 'text/plain'
        },
        'test-client',
        'test-document'
      );
      
      console.log('Test file uploaded successfully');
      console.log('Document URL:', documentUrl);
      
      // Generate SAS URL for the uploaded file
      const sasUrl = await storageService.generateSasUrl(documentUrl);
      console.log('SAS URL generated successfully');
      console.log('SAS URL:', sasUrl);
      
      // Delete the test file
      await storageService.deleteDocument(documentUrl);
      console.log('Test file deleted successfully');
      
    } catch (error) {
      console.error('Error during test operations:', error);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testStorage()
  .then(() => console.log('Storage test completed'))
  .catch((error) => console.error('Storage test failed:', error)); 