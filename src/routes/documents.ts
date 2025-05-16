import express, { Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import storageService from '../services/storage';
import { authenticate } from '../middleware/auth';

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
router.post('/upload/:clientId/:documentType', authenticate, upload.single('file'), async (req: Request, res: Response) => {
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
    
    // Upload to Azure Blob Storage
    const blobUrl = await storageService.uploadDocument(
      {
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
      },
      clientId,
      documentType
    );
    
    // Return the blob URL
    res.status(201).json({
      message: 'Document uploaded successfully',
      documentUrl: blobUrl,
      documentType,
      clientId,
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
    
    // Generate a SAS URL for temporary access
    const sasUrl = await storageService.generateSasUrl(blobUrl);
    
    res.json({
      sasUrl,
      expiresIn: '60 minutes',
    });
  } catch (error: any) {
    console.error('Error generating SAS URL:', error);
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
    const { blobUrl } = req.query;
    
    if (!blobUrl || typeof blobUrl !== 'string') {
      return res.status(400).json({ message: 'Blob URL is required' });
    }
    
    // Delete the document
    await storageService.deleteDocument(blobUrl);
    
    res.json({ message: 'Document deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: error.message || 'Failed to delete document' });
  }
});

export default router; 