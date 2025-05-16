-- Add new document fields to clients table if they don't exist
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'clients' AND COLUMN_NAME = 'coverage_proof')
BEGIN
    ALTER TABLE clients ADD coverage_proof VARCHAR(255);
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'clients' AND COLUMN_NAME = 'sum_insured_proof')
BEGIN
    ALTER TABLE clients ADD sum_insured_proof VARCHAR(255);
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'clients' AND COLUMN_NAME = 'policy_fee_invoice')
BEGIN
    ALTER TABLE clients ADD policy_fee_invoice VARCHAR(255);
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'clients' AND COLUMN_NAME = 'vat_fee_debit_note')
BEGIN
    ALTER TABLE clients ADD vat_fee_debit_note VARCHAR(255);
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'clients' AND COLUMN_NAME = 'payment_receipt_proof')
BEGIN
    ALTER TABLE clients ADD payment_receipt_proof VARCHAR(255);
END
GO

PRINT 'Database schema updated with new document fields';
GO 