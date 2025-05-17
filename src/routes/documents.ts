import express, { Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import storageService from '../services/storage';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import path from 'path';

const router = express.Router();

// Configure multer for memory storage (files will be stored in memory as Buffer objects)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only certain file types
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and PDF files are allowed.'));
    }
  },
});

/**
 * @route POST /api/documents/upload/:clientId/:documentType
 * @desc Upload a document for a client
 * @access Private
 */
router.post('/upload/:clientId/:documentType', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const { clientId, documentType } = req.params;
    
    if (!clientId || !documentType) {
      return res.status(400).json({ message: 'Client ID and document type are required' });
    }
    
    // Validate document type
    const validDocumentTypes = ['nic_proof', 'dob_proof', 'business_registration', 'svat_proof', 'vat_proof', 
    'coverage_proof', 'sum_insured_proof', 'policy_fee_invoice', 'vat_fee_debit_note', 'payment_receipt_proof'];
    
    if (!validDocumentTypes.includes(documentType)) {
      return res.status(400).json({ message: `Invalid document type. Valid types are: ${validDocumentTypes.join(', ')}` });
    }
    
    const file = req.file;
    const fileExtension = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    
    // Upload to Azure Blob Storage
    const result = await storageService.uploadFile(
      clientId,
      documentType,
      fileName,
      file.buffer,
      file.mimetype
    );
    
    res.json({
      message: 'File uploaded successfully',
      url: result.url,
      fileName: fileName
    });
  } catch (error: any) {
    console.error('Error uploading document:', error);
    res.status(500).json({ message: error.message || 'Failed to upload document' });
  }
});

/**
 * @route GET /api/documents/:clientId/:documentType/url
 * @desc Get a temporary URL for accessing a document
 * @access Private
 */
router.get('/:clientId/:documentType/url', authenticate, async (req: Request, res: Response) => {
  try {
    const { clientId, documentType } = req.params;
    const { blobUrl } = req.query;
    
    if (!blobUrl || typeof blobUrl !== 'string') {
      return res.status(400).json({ message: 'Blob URL is required' });
    }
    
    // Extract filename from the blob URL
    const fileName = blobUrl.split('/').pop()?.split('?')[0];
    
    if (!fileName) {
      return res.status(400).json({ message: 'Invalid blob URL' });
    }
    
    // Generate a secure URL using the new method
    const secureUrl = await storageService.generateSecureUrl(
      clientId,
      documentType,
      fileName
    );
    
    res.json({
      sasUrl: secureUrl,
      expiresIn: '5 minutes',
    });
  } catch (error: any) {
    console.error('Error generating secure URL:', error);
    res.status(500).json({ message: error.message || 'Failed to generate document URL' });
  }
});

/**
 * @route DELETE /api/documents/:clientId/:documentType
 * @desc Delete a document
 * @access Private
 */
router.delete('/:clientId/:documentType', authenticate, async (req: Request, res: Response) => {
  try {
    const { clientId, documentType } = req.params;
    const { blobUrl } = req.query;
    
    if (!blobUrl || typeof blobUrl !== 'string') {
      return res.status(400).json({ message: 'Blob URL is required' });
    }
    
    // Extract filename from the blob URL
    const fileName = blobUrl.split('/').pop()?.split('?')[0];
    
    if (!fileName) {
      return res.status(400).json({ message: 'Invalid blob URL' });
    }
    
    // Delete the document using the new method
    await storageService.deleteFile(clientId, documentType, fileName);
    
    res.json({ message: 'Document deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: error.message || 'Failed to delete document' });
  }
});

// Secure document proxy endpoint - requires authentication
router.get('/secure/:clientId/:documentType/:filename', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, documentType, filename } = req.params;
    
    console.log(`[${new Date().toISOString()}] Secure document request from ${req.ip} for: ${clientId}/${documentType}/${filename}`);
    console.log('User info:', req.user ? { userId: req.user.userId, role: req.user.role } : 'No user info');
    
    // Check if the blob exists before generating a SAS token
    try {
      const containerClient = await storageService.getContainerClient();
      const blobPath = `${clientId}/${documentType}/${filename}`;
      const blobClient = containerClient.getBlobClient(blobPath);
      
      console.log('Checking if blob exists at path:', blobPath);
      const exists = await blobClient.exists();
      
      if (!exists) {
        console.error(`Blob does not exist at path: ${blobPath}`);
        return res.status(404).json({ message: 'Document not found' });
      }
      
      console.log('Blob exists, generating secure URL');
    } catch (checkError) {
      console.error('Error checking if blob exists:', checkError);
      // Continue anyway to generate the URL as the error might be in the check
    }
    
    // Generate a secure URL for backend access (not for direct browser access)
    const url = await storageService.generateSecureUrl(
      clientId,
      documentType,
      filename,
      15 * 60 // 15 minutes in seconds - longer to prevent timing issues
    );
    
    console.log(`Generated secure URL: ${url.substring(0, url.indexOf('?') + 10)}...`);
    
    // IMPORTANT: Since public access is not permitted, we MUST proxy the content
    // instead of redirecting to the Azure URL directly
    try {
      console.log('Proxying blob content through backend');
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`Error fetching document: ${response.status} ${response.statusText}`);
        return res.status(404).json({ message: 'Document not found' });
      }
      
      // Get the file's content type and set it in the response
      const contentType = response.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      
      // Set cache headers to prevent caching issues
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      
      // Stream the response back to the client
      const blob = await response.blob();
      const buffer = Buffer.from(await blob.arrayBuffer());
      return res.send(buffer);
    } catch (fetchError) {
      console.error('Error fetching document from Azure:', fetchError);
      return res.status(500).json({ 
        message: 'Error retrieving document content',
        error: fetchError instanceof Error ? fetchError.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Error serving document:', error);
    return res.status(500).json({ message: 'Error serving document' });
  }
});

// Add a document delete endpoint that uses the same pattern as our secure endpoint
router.delete('/delete/:clientId/:documentType/:filename', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, documentType, filename } = req.params;
    
    // Delete the file
    const success = await storageService.deleteFile(clientId, documentType, filename);
    
    if (success) {
      return res.json({ message: 'File deleted successfully' });
    } else {
      return res.status(404).json({ message: 'File not found or could not be deleted' });
    }
  } catch (error) {
    console.error('Error deleting document:', error);
    return res.status(500).json({ message: 'Error deleting document' });
  }
});

export default router; 