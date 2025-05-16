const { BlobServiceClient } = require('@azure/storage-blob');
require('dotenv').config();

async function createContainer() {
  try {
    console.log('Creating container in Azure Storage...');
    
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'customer-documents';
    
    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING not found in environment variables');
    }
    
    // Initialize the BlobServiceClient
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    
    // Get a reference to the container
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // Create the container without specifying access level (will use account defaults)
    const createResult = await containerClient.createIfNotExists();
    
    if (createResult.succeeded) {
      console.log(`Container "${containerName}" created successfully.`);
    } else {
      console.log(`Container "${containerName}" already exists.`);
    }
    
    // List containers in this storage account
    console.log('Containers in this storage account:');
    let i = 1;
    for await (const container of blobServiceClient.listContainers()) {
      console.log(`${i++}. ${container.name}`);
    }
    
    console.log('\nSetup Complete!');
    console.log('Note: To set up CORS for your storage account, you need to use the Azure Portal or Azure CLI.');
    console.log('Please follow the instructions in AZURE_STORAGE_SETUP.md for CORS configuration.');
    
  } catch (error) {
    console.error('Error creating container:', error.message);
    if (error.details) {
      console.error('Error details:', error.details);
    }
  }
}

createContainer().catch(console.error); 