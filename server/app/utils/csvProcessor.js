const logger = require('./logger');

/**
 * Generate CSV string from contacts array
 * @param {Array} contacts - Array of contact objects
 * @returns {string} CSV string
 */
exports.generateCSV = (contacts) => {
    try {
        // CSV headers
        const headers = [
            'firstName',
            'lastName',
            'email',
            'phone',
            'type',
            'address',
            'city',
            'state',
            'zip',
            'country',
            'notes',
            'tags'
        ];

        // Create CSV rows
        const rows = contacts.map(contact => {
            return [
                escapeCSV(contact.firstName || ''),
                escapeCSV(contact.lastName || ''),
                escapeCSV(contact.email || ''),
                escapeCSV(contact.phone || ''),
                escapeCSV(contact.type || ''),
                escapeCSV(contact.address || ''),
                escapeCSV(contact.city || ''),
                escapeCSV(contact.state || ''),
                escapeCSV(contact.zip || ''),
                escapeCSV(contact.country || ''),
                escapeCSV(contact.notes || ''),
                escapeCSV((contact.tags || []).join(';'))
            ];
        });

        // Combine headers and rows
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        return csvContent;
    } catch (error) {
        logger.error('Error generating CSV:', error);
        throw error;
    }
};

/**
 * Escape CSV field value
 * @param {string} value - Value to escape
 * @returns {string} Escaped value
 */
function escapeCSV(value) {
    if (value === null || value === undefined) {
        return '';
    }
    
    const stringValue = String(value);
    
    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
}

/**
 * Parse CSV file content
 * @param {string} csvContent - CSV file content as string
 * @returns {Array} Array of parsed contact objects
 */
exports.parseCSVFile = (csvContent) => {
    try {
        // Handle different line endings (Windows \r\n, Unix \n, old Mac \r)
        const normalizedContent = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const lines = normalizedContent.split('\n');
        
        // Filter out completely empty lines but keep lines with just whitespace for now
        const nonEmptyLines = lines.filter((line, index) => {
            // Always keep the first line (header)
            if (index === 0) return true;
            // Keep non-empty lines
            return line.trim().length > 0;
        });
        
        if (nonEmptyLines.length < 2) {
            throw new Error('CSV file must have at least a header row and one data row');
        }

        // Parse header row
        const headers = parseCSVLine(nonEmptyLines[0]);
        
        // Expected headers (case-insensitive)
        const expectedHeaders = [
            'firstName', 'lastName', 'email', 'phone', 'type',
            'address', 'city', 'state', 'zip', 'country', 'notes', 'tags'
        ];

        // Validate headers
        const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
        const missingHeaders = expectedHeaders.filter(h => !normalizedHeaders.includes(h.toLowerCase()));
        
        if (missingHeaders.length > 0) {
            throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
        }

        // Create header map (case-insensitive)
        const headerMap = {};
        const normalizedExpectedHeaders = expectedHeaders.map(h => h.toLowerCase());
        headers.forEach((header, index) => {
            const normalized = header.toLowerCase().trim();
            // Check if this normalized header matches any expected header (case-insensitive)
            if (normalizedExpectedHeaders.includes(normalized)) {
                // Use the normalized key for lookup
                headerMap[normalized] = index;
            }
        });
        
        // Verify all required headers are mapped
        const requiredHeaders = ['firstname', 'lastname', 'email'];
        const missingMappedHeaders = requiredHeaders.filter(h => headerMap[h] === undefined);
        if (missingMappedHeaders.length > 0) {
            throw new Error(`Could not map required headers to columns: ${missingMappedHeaders.join(', ')}. Found headers: ${headers.join(', ')}`);
        }

        // Store the original header row for comparison
        const originalHeaderRow = normalizedHeaders.join(',');

        // Parse data rows (skip header row at index 0)
        const contacts = [];
        for (let i = 1; i < nonEmptyLines.length; i++) {
            const line = nonEmptyLines[i].trim();
            // Skip empty lines (shouldn't happen due to filter, but double-check)
            if (!line) {
                continue;
            }
            
            const values = parseCSVLine(nonEmptyLines[i]);
            
            // Skip if this row exactly matches the header row (case-insensitive)
            const normalizedValues = values.map(v => v.toLowerCase().trim());
            const currentRowString = normalizedValues.join(',');
            
            if (currentRowString === originalHeaderRow) {
                // This is a duplicate header row, skip it
                continue;
            }
            
            // Skip rows that are completely empty (all empty strings)
            const hasAnyData = values.some(val => val.trim().length > 0);
            if (!hasAnyData) {
                continue;
            }
            
            // Extract values using header map
            const getValue = (key) => {
                const index = headerMap[key.toLowerCase()];
                if (index !== undefined && index !== null && values[index] !== undefined) {
                    return values[index].trim();
                }
                return '';
            };
            
            const contact = {
                firstName: getValue('firstname'),
                lastName: getValue('lastname'),
                email: getValue('email'),
                phone: getValue('phone'),
                type: getValue('type') || 'client',
                address: getValue('address'),
                city: getValue('city'),
                state: getValue('state'),
                zip: getValue('zip'),
                country: getValue('country'),
                notes: getValue('notes'),
                tags: getValue('tags') ? getValue('tags').split(';').map(t => t.trim()).filter(Boolean) : [],
                _csvRowNumber: i + 1 // Store actual CSV row number (1-based, including header)
            };
            contacts.push(contact);
        }

        return contacts;
    } catch (error) {
        logger.error('Error parsing CSV:', error);
        throw error;
    }
};

/**
 * Parse a single CSV line handling quoted values
 * @param {string} line - CSV line
 * @returns {Array} Array of field values
 */
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote
                current += '"';
                i++; // Skip next quote
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // End of field
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    // Add last field
    values.push(current);

    return values;
}

/**
 * Validate a contact object from CSV row
 * @param {Object} contact - Contact object to validate
 * @param {number} rowIndex - 0-based index (for backward compatibility)
 * @returns {Object} { valid: boolean, errors: Array }
 */
exports.validateCSVRow = (contact, rowIndex) => {
    const errors = [];
    // Use stored CSV row number if available, otherwise calculate from index
    const rowNumber = contact._csvRowNumber || (rowIndex + 1);

    if (!contact.firstName || !contact.firstName.trim()) {
        errors.push(`Row ${rowNumber}: First name is required`);
    }
    if (!contact.lastName || !contact.lastName.trim()) {
        errors.push(`Row ${rowNumber}: Last name is required`);
    }
    if (!contact.email || !contact.email.trim()) {
        errors.push(`Row ${rowNumber}: Email is required`);
    } else {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{3,}$/;
        if (!emailRegex.test(contact.email.trim())) {
            errors.push(`Row ${rowNumber}: Invalid email format`);
        }
    }
    if (contact.type && !['client', 'business', 'supplier', 'contractor'].includes(contact.type)) {
        errors.push(`Row ${rowNumber}: Type must be one of: client, business, supplier, contractor`);
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

