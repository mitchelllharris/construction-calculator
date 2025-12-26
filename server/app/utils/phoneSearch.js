/**
 * Normalizes a phone number by removing all non-digit characters
 * @param {string} phone - Phone number string
 * @returns {string} - Normalized phone number (digits only)
 */
function normalizePhone(phone) {
    if (!phone) return '';
    return phone.replace(/\D/g, ''); // Remove all non-digit characters
}

/**
 * Generates search patterns for phone number matching
 * Handles country code variations (e.g., +61 vs 0) and local formats
 * @param {string} searchTerm - The search term (may contain +, spaces, etc.)
 * @returns {Array<string>} - Array of normalized search patterns
 */
function generatePhoneSearchPatterns(searchTerm) {
    if (!searchTerm) return [];
    
    // Normalize the search term (remove +, spaces, dashes, etc.)
    const normalized = normalizePhone(searchTerm);
    if (!normalized) return [];
    
    const patterns = [normalized];
    
    // Common country codes to handle (Australia: 61, US: 1, UK: 44, etc.)
    const countryCodes = {
        '61': '0',  // Australia: +61 becomes 0
        '1': '0',   // US/Canada: +1 becomes 0 (though less common)
        '44': '0',  // UK: +44 becomes 0
        '64': '0',  // New Zealand: +64 becomes 0
    };
    
    // If search starts with a country code, create local format pattern
    for (const [code, localPrefix] of Object.entries(countryCodes)) {
        if (normalized.startsWith(code)) {
            // If search is exactly the country code (e.g., "61"), also add local prefix
            // so it matches all numbers from that country (e.g., numbers starting with "0")
            if (normalized === code) {
                patterns.push(localPrefix);
            } else {
                // Replace country code with local prefix
                const localFormat = localPrefix + normalized.substring(code.length);
                patterns.push(localFormat);
                
                // Also add pattern without country code
                const withoutCode = normalized.substring(code.length);
                if (withoutCode) {
                    patterns.push(withoutCode);
                }
            }
        }
        
        // If search starts with local prefix, create country code pattern
        if (normalized.startsWith(localPrefix) && normalized.length > 1) {
            const withCountryCode = code + normalized.substring(localPrefix.length);
            patterns.push(withCountryCode);
            
            // Also add pattern without local prefix (for matching numbers stored without country code)
            const withoutLocalPrefix = normalized.substring(localPrefix.length);
            if (withoutLocalPrefix) {
                patterns.push(withoutLocalPrefix);
            }
        }
        
        // If search is exactly the local prefix (e.g., "0"), also add country code
        // so it matches all numbers from that country (e.g., numbers starting with "61")
        if (normalized === localPrefix) {
            patterns.push(code);
        }
    }
    
    // Remove duplicates and empty strings
    return [...new Set(patterns.filter(p => p.length > 0))];
}

/**
 * Creates MongoDB regex patterns for phone number search
 * Matches digit sequences from the start while ignoring non-digit characters (+, spaces, dashes, etc.)
 * @param {string} searchTerm - The search term
 * @returns {Array} - Array of regex objects for $or query
 */
function createPhoneSearchRegex(searchTerm) {
    const patterns = generatePhoneSearchPatterns(searchTerm);
    if (patterns.length === 0) return [];
    
    // Create regex patterns that match the digit sequence from the start
    // The regex allows optional non-digit characters at the start (for +) and between digits
    // Example: pattern "61423" matches "+61 423" or "061423" from the start
    return patterns.map(pattern => {
        // Build regex that matches the pattern from the start of the phone number
        // Allow optional + and non-digits at the very beginning, then match the digit sequence
        // Anchor to start: ^ allows optional + and non-digits, then requires the pattern
        const regexPattern = '^\\D*' + pattern.split('').map((digit) => {
            // Each digit can have optional non-digits before it
            return '\\D*' + digit;
        }).join('') + '\\D*';
        
        return {
            phone: new RegExp(regexPattern, 'i')
        };
    });
}

module.exports = {
    normalizePhone,
    generatePhoneSearchPatterns,
    createPhoneSearchRegex
};

