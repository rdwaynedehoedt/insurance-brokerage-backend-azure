import { BlobServiceClient, ContainerClient, BlockBlobClient, PublicAccessType, BlobSASPermissions } from '@azure/storage-blob';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

dotenv.config();

// Connection string and container name from environment variables
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || '';
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'customer-documents';
const localStoragePath = './uploads';

// Check if we're in mock mode (no connection string)
const isLocalStorage = !connectionString || connectionString.trim() === '';

// Create local storage directory if needed
if (isLocalStorage && !fs.existsSync(localStoragePath)) {
  fs.mkdirSync(localStoragePath, { recursive: true });
  console.log(`Created local storage directory at ${localStoragePath}`);
}

// Initialize the BlobServiceClient only if we have a connection string
let blobServiceClient: BlobServiceClient | null = null;
let containerClient: ContainerClient | null = null;

if (!isLocalStorage) {
  try {
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    containerClient = blobServiceClient.getContainerClient(containerName);
    console.log('Azure Blob Storage client initialized');
  } catch (error) {
    console.error('Failed to initialize Azure Blob Storage client:', error);
    console.log('Falling back to local storage');
  }
}

/**
 * Ensure the container exists before any operation
 */
export async function ensureContainer() {
  if (isLocalStorage) {
    return; // No need to create container for local storage
  }
  
  try {
    if (containerClient) {
      await containerClient.createIfNotExists();
      console.log(`Container '${containerName}' created or already exists.`);
    }
  } catch (error) {
    console.error(`Error creating container '${containerName}':`, error);
    throw error;
  }
}

/**
 * Upload a file to Azure Blob Storage or local storage
 * @param file The file buffer and metadata
 * @param customerId The customer ID to associate with the file
 * @param documentType The type of document (e.g., 'nic', 'dob_proof', etc.)
 * @returns The URL or path of the uploaded file
 */
export async function uploadDocument(
  file: { buffer: Buffer; originalname: string; mimetype: string },
  customerId: string,
  documentType: string
): Promise<string> {
  try {
    // Generate a unique name for the file
    const extension = path.extname(file.originalname);
    const fileName = `${uuidv4()}${extension}`;
    const filePath = `${customerId}/${documentType}/${fileName}`;
    
    if (isLocalStorage) {
      // Store locally
      const dirPath = path.join(localStoragePath, customerId, documentType);
      
      // Create directories if they don't exist
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      const fullPath = path.join(dirPath, fileName);
      fs.writeFileSync(fullPath, file.buffer);
      
      console.log(`File saved locally: ${fullPath}`);
      return fullPath;
    } else {
      // Use Azure Blob Storage
      await ensureContainer();
      
      if (!containerClient) {
        throw new Error('Container client is not initialized');
      }
      
      // Get a block blob client
      const blockBlobClient = containerClient.getBlockBlobClient(filePath);
      
      // Upload the file
      await blockBlobClient.upload(file.buffer, file.buffer.length, {
        blobHTTPHeaders: {
          blobContentType: file.mimetype,
        },
      });
      
      console.log(`File uploaded successfully to Azure: ${filePath}`);
      
      // Return the URL of the blob
      return blockBlobClient.url;
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

/**
 * Get a URL or file path for accessing a document
 * @param blobUrl The URL or path of the file
 * @param expiryMinutes How many minutes the URL should be valid (only for Azure)
 * @returns A URL or file path for accessing the file
 */
export async function generateSasUrl(blobUrl: string, expiryMinutes = 60): Promise<string> {
  try {
    if (isLocalStorage) {
      // For local storage, just return the path
      return blobUrl;
    } else {
      if (!containerClient) {
        throw new Error('Container client is not initialized');
      }
      
      // Extract the blob name from the URL
      const url = new URL(blobUrl);
      const blobPath = url.pathname.substring(url.pathname.indexOf(containerName) + containerName.length + 1);
      
      // Get a block blob client
      const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
      
      // Generate SAS token
      const sasOptions = {
        expiresOn: new Date(new Date().valueOf() + expiryMinutes * 60 * 1000),
        permissions: BlobSASPermissions.parse('r'), // Read permission
      };
      
      const sasToken = await blockBlobClient.generateSasUrl(sasOptions);
      return sasToken;
    }
  } catch (error) {
    console.error('Error generating access URL:', error);
    throw error;
  }
}

/**
 * Delete a document
 * @param blobUrl The URL or path of the file to delete
 */
export async function deleteDocument(blobUrl: string): Promise<void> {
  try {
    if (isLocalStorage) {
      // Delete the local file
      if (fs.existsSync(blobUrl)) {
        fs.unlinkSync(blobUrl);
        console.log(`Local file deleted: ${blobUrl}`);
      }
    } else {
      if (!containerClient) {
        throw new Error('Container client is not initialized');
      }
      
      // Extract the blob name from the URL
      const url = new URL(blobUrl);
      const blobPath = url.pathname.substring(url.pathname.indexOf(containerName) + containerName.length + 1);
      
      // Get a block blob client
      const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
      
      // Delete the blob
      await blockBlobClient.delete();
      console.log(`Blob deleted from Azure: ${blobPath}`);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

export default {
  uploadDocument,
  generateSasUrl,
  deleteDocument,
  ensureContainer,
}; 