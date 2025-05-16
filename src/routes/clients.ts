import { Request, Response, Router } from 'express';
import { Client, ClientData } from '../models/Client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all clients - accessible to managers and sales reps
router.get('/', authenticate, authorize(['admin', 'manager', 'sales']), async (req: AuthRequest, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    
    const clients = await Client.getAll(limit, offset);
    
    res.status(200).json({ success: true, data: clients });
  } catch (error) {
    console.error('Error getting clients:', error);
    res.status(500).json({ success: false, message: 'Failed to get clients' });
  }
});

// Get client by ID
router.get('/:id', authenticate, authorize(['admin', 'manager', 'sales']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const client = await Client.getById(id);
    
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    
    res.status(200).json({ success: true, data: client });
  } catch (error) {
    console.error('Error getting client by ID:', error);
    res.status(500).json({ success: false, message: 'Failed to get client' });
  }
});

// Create a new client
router.post('/', authenticate, authorize(['admin', 'manager', 'sales']), async (req: AuthRequest, res: Response) => {
  try {
    const clientData: ClientData = req.body;
    
    console.log('Received client data:', JSON.stringify(clientData, null, 2));
    
    // Remove sales_rep_id if it exists - no longer needed
    if (clientData.sales_rep_id) {
      delete clientData.sales_rep_id;
    }
    
    // Validate required fields
    const requiredFields = ['customer_type', 'product', 'insurance_provider', 'client_name', 'mobile_no'];
    const missingFields = requiredFields.filter(field => !clientData[field as keyof ClientData]);
    
    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields);
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }
    
    const clientId = await Client.create(clientData);
    console.log('Client created with ID:', clientId);
    
    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      data: { id: clientId }
    });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ success: false, message: 'Failed to create client' });
  }
});

// Update a client
router.put('/:id', authenticate, authorize(['admin', 'manager', 'sales']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const clientData: Partial<ClientData> = req.body;
    
    // Log the incoming data for debugging
    console.log(`Updating client ${id}:`, JSON.stringify(clientData, null, 2));
    
    // Check if client exists
    const existingClient = await Client.getById(id);
    if (!existingClient) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    
    // Remove sales_rep_id field if it's included in the update request
    if (clientData.sales_rep_id) {
      delete clientData.sales_rep_id;
    }
    
    // Sanitize numeric fields
    const sanitizedData: Partial<ClientData> = { ...clientData };
    const numericFields = [
      'sum_insured', 'basic_premium', 'srcc_premium', 'tc_premium', 
      'net_premium', 'stamp_duty', 'admin_fees', 'road_safety_fee', 
      'policy_fee', 'vat_fee', 'total_invoice', 'commission_basic',
      'commission_srcc', 'commission_tc', 'policies'
    ];
    
    numericFields.forEach(field => {
      if (field in sanitizedData) {
        const value = sanitizedData[field as keyof ClientData];
        if (value !== undefined && value !== null) {
          try {
            // Convert string values to numbers if needed
            if (typeof value === 'string') {
              const numValue = parseFloat(value);
              if (!isNaN(numValue)) {
                (sanitizedData as any)[field] = numValue;
              } else {
                console.warn(`Invalid numeric value for ${field}: ${value}`);
                (sanitizedData as any)[field] = 0;
              }
            }
          } catch (err) {
            console.error(`Error processing field ${field}:`, err);
            (sanitizedData as any)[field] = 0;
          }
        }
      }
    });
    
    // Try the update with sanitized data
    try {
      const updated = await Client.update(id, sanitizedData);
      
      if (!updated) {
        return res.status(500).json({
          success: false,
          message: 'Failed to update client - no rows affected'
        });
      }
      
      console.log(`Client ${id} successfully updated`);
      
      res.status(200).json({
        success: true,
        message: 'Client updated successfully'
      });
    } catch (updateError) {
      console.error('Database error updating client:', updateError);
      
      // Provide more specific error messages based on the error
      let errorMessage = 'Failed to update client due to database error';
      if (updateError instanceof Error) {
        errorMessage = `Database error: ${updateError.message}`;
      }
      
      return res.status(500).json({
        success: false,
        message: errorMessage,
        error: updateError instanceof Error ? updateError.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Error in client update route:', error);
    
    // Return detailed error for debugging
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update client',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete a client
router.delete('/:id', authenticate, authorize(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if client exists
    const existingClient = await Client.getById(id);
    if (!existingClient) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    
    const deleted = await Client.delete(id);
    
    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete client'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Client deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ success: false, message: 'Failed to delete client' });
  }
});

// Search clients
router.post('/search', authenticate, authorize(['admin', 'manager', 'sales']), async (req: AuthRequest, res: Response) => {
  try {
    const searchCriteria: Partial<ClientData> = req.body;
    
    // Remove sales_rep_id filtering - all users can search all clients
    if (searchCriteria.sales_rep_id) {
      delete searchCriteria.sales_rep_id;
    }
    
    const clients = await Client.search(searchCriteria);
    
    res.status(200).json({ success: true, data: clients });
  } catch (error) {
    console.error('Error searching clients:', error);
    res.status(500).json({ success: false, message: 'Failed to search clients' });
  }
});

export default router; 