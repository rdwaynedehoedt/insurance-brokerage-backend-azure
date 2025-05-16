import dotenv from 'dotenv';
import { BlobServiceClient } from '@azure/storage-blob';

dotenv.config();

async function listBlobs() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || '';
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'customer-documents';
  
  console.log('Azure Storage Connection String:', connectionString ? 'Connected' : 'Not provided');
  console.log('Container Name:', containerName);
  
  if (!connectionString) {
    console.error('No connection string provided');
    return;
  }
  
  try {
    // Create the BlobServiceClient
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    console.log(`Listing blobs in container "${containerName}"...`);
    
    // List all blobs in the container
    let i = 1;
    const blobs = containerClient.listBlobsFlat();
    
    console.log('Blobs found:');
    for await (const blob of blobs) {
      console.log(`${i++}. Blob name: ${blob.name}`);
      console.log(`   Type: ${blob.properties.blobType}`);
      console.log(`   Size: ${blob.properties.contentLength} bytes`);
      console.log(`   Created: ${blob.properties.createdOn}`);
      console.log(`   URL: ${containerClient.getBlockBlobClient(blob.name).url}`);
      console.log('-----------------------------------');
    }
    
    if (i === 1) {
      console.log('No blobs found in container');
    }
    
  } catch (error) {
    console.error('Error listing blobs:', error);
  }
}

// Run the function
listBlobs()
  .then(() => console.log('Blob listing complete'))
  .catch(error => console.error('Error:', error)); 