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
    
    // Get user role from auth middleware
    const userRole = req.user?.role;
    
    // Check if user has permission to access this client's documents
    // In a real app, you would check if the user is allowed to access the client's data
    // For example, sales reps might only access their own clients
    // For now, we'll allow all authenticated users
    
    // Generate a short-lived URL (5 minutes)
    const url = await storageService.generateSecureUrl(
      clientId,
      documentType,
      filename,
      5 * 60 // 5 minutes in seconds
    );
    
    // Option 1: Redirect to the temporary URL (still shows URL in browser)
    // return res.redirect(url);
    
    // Option 2: Proxy the content through backend (better security)
    const response = await fetch(url);
    
    if (!response.ok) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Get the file's content type and set it in the response
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    
    // Stream the response back to the client
    const blob = await response.blob();
    const buffer = Buffer.from(await blob.arrayBuffer());
    return res.send(buffer);
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