import { BlobServiceClient, ContainerClient, BlockBlobClient, PublicAccessType, BlobSASPermissions, StorageSharedKeyCredential, generateBlobSASQueryParameters } from '@azure/storage-blob';
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

export class BlobStorageService {
  private blobServiceClient: BlobServiceClient;
  private containerName: string = 'customer-documents';
  private accountName: string = process.env.AZURE_STORAGE_ACCOUNT_NAME || '';
  private accountKey: string = process.env.AZURE_STORAGE_ACCOUNT_KEY || '';

  constructor() {
    // Create shared key credential
    const sharedKeyCredential = new StorageSharedKeyCredential(
      this.accountName,
      this.accountKey
    );

    // Create the BlobServiceClient
    this.blobServiceClient = new BlobServiceClient(
      `https://${this.accountName}.blob.core.windows.net`,
      sharedKeyCredential
    );
  }

  /**
   * Upload a file to Azure Blob Storage with improved security
   */
  async uploadFile(
    clientId: string,
    documentType: string,
    fileName: string,
    fileContent: Buffer,
    contentType: string
  ): Promise<{ url: string, path: string }> {
    try {
      // Ensure container exists
      await this.ensureContainer();

      // Get a container client
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      
      // Create a path for the blob: clientId/documentType/filename
      const blobPath = `${clientId}/${documentType}/${fileName}`;
      
      // Get a block blob client
      const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
      
      // Upload the file
      await blockBlobClient.upload(fileContent, fileContent.length, {
        blobHTTPHeaders: {
          blobContentType: contentType
        }
      });
      
      // Return the blob URL and path (without generating SAS - we'll generate that on demand)
      return {
        url: blockBlobClient.url,
        path: blobPath
      };
    } catch (error) {
      console.error('Error uploading to Azure Blob Storage:', error);
      throw new Error('Failed to upload file to storage');
    }
  }

  /**
   * Generate a secure URL with a short-lived SAS token for a specific blob
   */
  async generateSecureUrl(
    clientId: string,
    documentType: string,
    fileName: string,
    expirySeconds: number = 300 // Default 5 minutes
  ): Promise<string> {
    try {
      // Get a container client
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      
      // Create the blob path
      const blobPath = `${clientId}/${documentType}/${fileName}`;
      
      // Get a blob client
      const blobClient = containerClient.getBlobClient(blobPath);
      
      // Create a SAS token with specified expiry and read-only permissions
      const expiryTime = new Date();
      expiryTime.setSeconds(expiryTime.getSeconds() + expirySeconds);
      
      const sharedKeyCredential = new StorageSharedKeyCredential(
        this.accountName,
        this.accountKey
      );
      
      const sasOptions = {
        containerName: this.containerName,
        blobName: blobPath,
        permissions: BlobSASPermissions.parse("r"), // Read-only permission
        expiresOn: expiryTime,
      };
      
      const sasToken = generateBlobSASQueryParameters(
        sasOptions,
        sharedKeyCredential
      ).toString();
      
      // Return the blob URL with SAS token
      return `${blobClient.url}?${sasToken}`;
    } catch (error) {
      console.error('Error generating secure URL:', error);
      throw new Error('Failed to generate secure access URL');
    }
  }

  /**
   * Delete a document from storage
   */
  async deleteFile(clientId: string, documentType: string, fileName: string): Promise<boolean> {
    try {
      // Get a container client
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      
      // Create the blob path
      const blobPath = `${clientId}/${documentType}/${fileName}`;
      
      // Get a blob client
      const blobClient = containerClient.getBlobClient(blobPath);
      
      // Delete the blob
      await blobClient.delete();
      
      return true;
    } catch (error) {
      console.error('Error deleting blob:', error);
      throw new Error('Failed to delete file from storage');
    }
  }

  /**
   * Ensure the container exists, create it if it doesn't
   */
  async ensureContainer(): Promise<void> {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      await containerClient.createIfNotExists();
    } catch (error) {
      console.error('Error ensuring container exists:', error);
      throw new Error('Failed to ensure storage container exists');
    }
  }

  /**
   * Legacy method for backward compatibility 
   */
  async uploadDocument(
    file: { buffer: Buffer; originalname: string; mimetype: string },
    customerId: string,
    documentType: string
  ): Promise<string> {
    const fileName = `${uuidv4()}${this.getFileExtension(file.originalname)}`;
    const result = await this.uploadFile(
      customerId,
      documentType,
      fileName,
      file.buffer,
      file.mimetype
    );
    return result.url;
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 1);
  }
}

const storageService = new BlobStorageService();
export default storageService; 