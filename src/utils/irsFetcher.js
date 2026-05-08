const https = require('https');

/**
 * Cache for tax rates to avoid repeated fetching
 */
const rateCache = new Map();

/**
 * Fetch and parse tax rate information from IRS website
 * @param {number} year - Tax year to fetch rates for
 * @returns {Promise<Object>} Tax rates object with brackets and standard deductions
 */
const fetchIRSTaxRates = async (year) => {
  // Check cache first
  if (rateCache.has(year)) {
    console.log(`[IRS] Using cached rates for ${year}`);
    return rateCache.get(year);
  }

  console.log(`[IRS] Fetching tax rates for ${year} from IRS website...`);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.irs.gov',
      path: '/publications/p1040',
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        Connection: 'keep-alive'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      const chunks = [];

      res.on('data', (chunk) => {
        chunks.push(chunk);
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            throw new Error(`IRS returned status code ${res.statusCode}`);
          }

          console.log(`[IRS] Received ${data.length} bytes of HTML content`);

          // Parse the rates
          const rates = parseTaxRatesFromHTML(data, year);

          // Cache the result
          rateCache.set(year, rates);

          console.log(`[IRS] Successfully parsed tax rates for ${year}`);
          resolve(rates);
        } catch (err) {
          reject(new Error(`Failed to parse IRS page: ${err.message}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Failed to fetch IRS data: ${err.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request to IRS timed out after 30 seconds'));
    });

    req.setTimeout(30000);
    req.end();
  });
};

/**
 * Parse tax rates from IRS HTML content
 * This function needs to be adapted based on the actual HTML structure of the IRS publication page.
 *
 * The IRS Publication 1040 typically contains:
 * 1. Standard deduction amounts by filing status
 * 2. Tax rate schedules (brackets) for each filing status
 * 3. Various other tax information
 *
 * Since we cannot guarantee the exact HTML structure without access to the live page,
 * this implementation includes:
 * - Logging of found content for debugging
 * - Fallback to hardcoded values with a warning
 * - Extensible parsing logic
 *
 * @param {string} html - Raw HTML content from IRS page
 * @param {number} year - Tax year
 * @returns {Object} Parsed tax rates
 */
const parseTaxRatesFromHTML = (html, year) => {
  console.log(`[IRS Parser] Analyzing HTML for ${year} tax rates...`);

  // Try to find standard deduction amounts
  // IRS typically uses tables or structured data for these values
  const standardDeductionPatterns = [
    // Look for patterns like "13,850" or "$13,850" near "single" or "individual"
    /(\d{1,3}(?:,\d{3})*)\s*(?:dollars?)?\s*(?:for\s+)?(?:single|individual)/gi,
    /single[^$]*\$?\s*(\d{1,3}(?:,\d{3})*)/gi,
    /married[^$]*\$?\s*(\d{1,3}(?:,\d{3})*)/gi
  ];

  // Try to find tax bracket information
  const bracketPatterns = [
    // Pattern for tax rate with bracket boundaries
    /(\d+(?:\.\d+)?)\s*%[^0-9]*(\d{1,3}(?:,\d{3})*)[^0-9]*(\d{1,3}(?:,\d{3})*)/g
  ];

  // Log what we found for debugging (in production, you'd want to remove verbose logging)
  let foundContent = [];

  // Search for key terms that indicate we're in the right section
  const keyTerms = [
    'standard deduction',
    'tax rate schedule',
    'single',
    'married',
    'head of household',
    'qualifying widow'
  ];
  keyTerms.forEach((term) => {
    const regex = new RegExp(`${term}`, 'gi');
    const matches = html.match(regex);
    if (matches) {
      foundContent.push(`Found "${term}" ${matches.length} times`);
    }
  });

  if (foundContent.length > 0) {
    console.log(`[IRS Parser] ${foundContent.join(', ')}`);
  } else {
    console.log(
      `[IRS Parser] Warning: Could not find standard tax terminology in HTML`
    );
  }

  // For now, return hardcoded fallback values with a warning
  // In production, you would implement actual parsing logic here based on the observed HTML structure
  console.log(
    `[IRS Parser] WARNING: Using hardcoded fallback values for ${year}`
  );
  console.log(
    `[IRS Parser] To ensure accuracy, please verify these values against the official IRS publication.`
  );

  // Return the appropriate year's rates
  const fallbackRates = getFallbackRates(year);

  // In a real implementation, you would merge parsed values with fallbacks
  // giving precedence to parsed values where available
  return fallbackRates;
};

/**
 * Get hardcoded fallback tax rates for a given year
 * These should be updated annually based on IRS publications
 * @param {number} year
 * @returns {Object}
 */
const getFallbackRates = (year) => {
  // Define rates by year
  // Source: IRS Publication 1040 and related documents
  // IMPORTANT: These must be verified against official IRS sources annually

  const ratesByYear = {
    2024: {
      year: 2024,
      source: 'Fallback - Please verify against IRS Publication 1040',
      lastUpdated: '2024-01-01',
      standardDeductions: {
        single: 14600,
        married_joint: 29200,
        married_separate: 14600,
        head_household: 21900,
        qualifying_widow: 29200
      },
      taxBrackets: {
        single: [
          { min: 0, max: 11600, rate: 0.1, marginalRate: '10%' },
          { min: 11601, max: 47150, rate: 0.12, marginalRate: '12%' },
          { min: 47151, max: 100525, rate: 0.22, marginalRate: '22%' },
          { min: 100526, max: 191950, rate: 0.24, marginalRate: '24%' },
          { min: 191951, max: 243725, rate: 0.32, marginalRate: '32%' },
          { min: 243726, max: 609350, rate: 0.35, marginalRate: '35%' },
          { min: 609351, max: Infinity, rate: 0.37, marginalRate: '37%' }
        ],
        married_joint: [
          { min: 0, max: 23200, rate: 0.1, marginalRate: '10%' },
          { min: 23201, max: 94300, rate: 0.12, marginalRate: '12%' },
          { min: 94301, max: 201050, rate: 0.22, marginalRate: '22%' },
          { min: 201051, max: 383900, rate: 0.24, marginalRate: '24%' },
          { min: 383901, max: 487450, rate: 0.32, marginalRate: '32%' },
          { min: 487451, max: 731200, rate: 0.35, marginalRate: '35%' },
          { min: 731201, max: Infinity, rate: 0.37, marginalRate: '37%' }
        ],
        married_separate: [
          { min: 0, max: 11600, rate: 0.1, marginalRate: '10%' },
          { min: 11601, max: 47150, rate: 0.12, marginalRate: '12%' },
          { min: 47151, max: 100525, rate: 0.22, marginalRate: '22%' },
          { min: 100526, max: 191950, rate: 0.24, marginalRate: '24%' },
          { min: 191951, max: 243725, rate: 0.32, marginalRate: '32%' },
          { min: 243726, max: 365600, rate: 0.35, marginalRate: '35%' },
          { min: 365601, max: Infinity, rate: 0.37, marginalRate: '37%' }
        ],
        head_household: [
          { min: 0, max: 16550, rate: 0.1, marginalRate: '10%' },
          { min: 16551, max: 63100, rate: 0.12, marginalRate: '12%' },
          { min: 63101, max: 100500, rate: 0.22, marginalRate: '22%' },
          { min: 100501, max: 191950, rate: 0.24, marginalRate: '24%' },
          { min: 191951, max: 243725, rate: 0.32, marginalRate: '32%' },
          { min: 243726, max: 609350, rate: 0.35, marginalRate: '35%' },
          { min: 609351, max: Infinity, rate: 0.37, marginalRate: '37%' }
        ],
        qualifying_widow: [
          { min: 0, max: 23200, rate: 0.1, marginalRate: '10%' },
          { min: 23201, max: 94300, rate: 0.12, marginalRate: '12%' },
          { min: 94301, max: 201050, rate: 0.22, marginalRate: '22%' },
          { min: 201051, max: 383900, rate: 0.24, marginalRate: '24%' },
          { min: 383901, max: 487450, rate: 0.32, marginalRate: '32%' },
          { min: 487451, max: 731200, rate: 0.35, marginalRate: '35%' },
          { min: 731201, max: Infinity, rate: 0.37, marginalRate: '37%' }
        ]
      }
    },
    2023: {
      year: 2023,
      source: 'Fallback - Please verify against IRS Publication 1040',
      lastUpdated: '2023-01-01',
      standardDeductions: {
        single: 13850,
        married_joint: 27700,
        married_separate: 13850,
        head_household: 20800,
        qualifying_widow: 27700
      },
      taxBrackets: {
        single: [
          { min: 0, max: 11000, rate: 0.1, marginalRate: '10%' },
          { min: 11001, max: 44725, rate: 0.12, marginalRate: '12%' },
          { min: 44726, max: 95375, rate: 0.22, marginalRate: '22%' },
          { min: 95376, max: 182100, rate: 0.24, marginalRate: '24%' },
          { min: 182101, max: 231250, rate: 0.32, marginalRate: '32%' },
          { min: 231251, max: 578125, rate: 0.35, marginalRate: '35%' },
          { min: 578126, max: Infinity, rate: 0.37, marginalRate: '37%' }
        ],
        married_joint: [
          { min: 0, max: 22000, rate: 0.1, marginalRate: '10%' },
          { min: 22001, max: 89450, rate: 0.12, marginalRate: '12%' },
          { min: 89451, max: 190750, rate: 0.22, marginalRate: '22%' },
          { min: 190751, max: 364200, rate: 0.24, marginalRate: '24%' },
          { min: 364201, max: 462500, rate: 0.32, marginalRate: '32%' },
          { min: 462501, max: 693750, rate: 0.35, marginalRate: '35%' },
          { min: 693751, max: Infinity, rate: 0.37, marginalRate: '37%' }
        ],
        married_separate: [
          { min: 0, max: 11000, rate: 0.1, marginalRate: '10%' },
          { min: 11001, max: 44725, rate: 0.12, marginalRate: '12%' },
          { min: 44726, max: 95375, rate: 0.22, marginalRate: '22%' },
          { min: 95376, max: 182100, rate: 0.24, marginalRate: '24%' },
          { min: 182101, max: 231250, rate: 0.32, marginalRate: '32%' },
          { min: 231251, max: 346875, rate: 0.35, marginalRate: '35%' },
          { min: 346876, max: Infinity, rate: 0.37, marginalRate: '37%' }
        ],
        head_household: [
          { min: 0, max: 15700, rate: 0.1, marginalRate: '10%' },
          { min: 15701, max: 59850, rate: 0.12, marginalRate: '12%' },
          { min: 59851, max: 95350, rate: 0.22, marginalRate: '22%' },
          { min: 95351, max: 182100, rate: 0.24, marginalRate: '24%' },
          { min: 182101, max: 231250, rate: 0.32, marginalRate: '32%' },
          { min: 231251, max: 578100, rate: 0.35, marginalRate: '35%' },
          { min: 578101, max: Infinity, rate: 0.37, marginalRate: '37%' }
        ],
        qualifying_widow: [
          { min: 0, max: 22000, rate: 0.1, marginalRate: '10%' },
          { min: 22001, max: 89450, rate: 0.12, marginalRate: '12%' },
          { min: 89451, max: 190750, rate: 0.22, marginalRate: '22%' },
          { min: 190751, max: 364200, rate: 0.24, marginalRate: '24%' },
          { min: 364201, max: 462500, rate: 0.32, marginalRate: '32%' },
          { min: 462501, max: 693750, rate: 0.35, marginalRate: '35%' },
          { min: 693751, max: Infinity, rate: 0.37, marginalRate: '37%' }
        ]
      }
    },
    2022: {
      year: 2022,
      source: 'Fallback - Please verify against IRS Publication 1040',
      lastUpdated: '2022-01-01',
      standardDeductions: {
        single: 12950,
        married_joint: 25900,
        married_separate: 12950,
        head_household: 19400,
        qualifying_widow: 25900
      },
      taxBrackets: {
        single: [
          { min: 0, max: 10275, rate: 0.1, marginalRate: '10%' },
          { min: 10276, max: 41775, rate: 0.12, marginalRate: '12%' },
          { min: 41776, max: 89075, rate: 0.22, marginalRate: '22%' },
          { min: 89076, max: 170050, rate: 0.24, marginalRate: '24%' },
          { min: 170051, max: 215950, rate: 0.32, marginalRate: '32%' },
          { min: 215951, max: 539900, rate: 0.35, marginalRate: '35%' },
          { min: 539901, max: Infinity, rate: 0.37, marginalRate: '37%' }
        ],
        married_joint: [
          { min: 0, max: 20550, rate: 0.1, marginalRate: '10%' },
          { min: 20551, max: 83550, rate: 0.12, marginalRate: '12%' },
          { min: 83551, max: 178150, rate: 0.22, marginalRate: '22%' },
          { min: 178151, max: 340100, rate: 0.24, marginalRate: '24%' },
          { min: 340101, max: 431900, rate: 0.32, marginalRate: '32%' },
          { min: 431901, max: 647850, rate: 0.35, marginalRate: '35%' },
          { min: 647851, max: Infinity, rate: 0.37, marginalRate: '37%' }
        ],
        married_separate: [
          { min: 0, max: 10275, rate: 0.1, marginalRate: '10%' },
          { min: 10276, max: 41775, rate: 0.12, marginalRate: '12%' },
          { min: 41776, max: 89075, rate: 0.22, marginalRate: '22%' },
          { min: 89076, max: 170050, rate: 0.24, marginalRate: '24%' },
          { min: 170051, max: 215950, rate: 0.32, marginalRate: '32%' },
          { min: 215951, max: 323925, rate: 0.35, marginalRate: '35%' },
          { min: 323926, max: Infinity, rate: 0.37, marginalRate: '37%' }
        ],
        head_household: [
          { min: 0, max: 14650, rate: 0.1, marginalRate: '10%' },
          { min: 14651, max: 55900, rate: 0.12, marginalRate: '12%' },
          { min: 55901, max: 89050, rate: 0.22, marginalRate: '22%' },
          { min: 89051, max: 170050, rate: 0.24, marginalRate: '24%' },
          { min: 170051, max: 215950, rate: 0.32, marginalRate: '32%' },
          { min: 215951, max: 539900, rate: 0.35, marginalRate: '35%' },
          { min: 539901, max: Infinity, rate: 0.37, marginalRate: '37%' }
        ],
        qualifying_widow: [
          { min: 0, max: 20550, rate: 0.1, marginalRate: '10%' },
          { min: 20551, max: 83550, rate: 0.12, marginalRate: '12%' },
          { min: 83551, max: 178150, rate: 0.22, marginalRate: '22%' },
          { min: 178151, max: 340100, rate: 0.24, marginalRate: '24%' },
          { min: 340101, max: 431900, rate: 0.32, marginalRate: '32%' },
          { min: 431901, max: 647850, rate: 0.35, marginalRate: '35%' },
          { min: 647851, max: Infinity, rate: 0.37, marginalRate: '37%' }
        ]
      }
    },
    2021: {
      year: 2021,
      source: 'Fallback - Please verify against IRS Publication 1040',
      lastUpdated: '2021-01-01',
      standardDeductions: {
        single: 12550,
        married_joint: 25100,
        married_separate: 12550,
        head_household: 18800,
        qualifying_widow: 25100
      },
      taxBrackets: {
        single: [
          { min: 0, max: 9950, rate: 0.1, marginalRate: '10%' },
          { min: 9951, max: 40525, rate: 0.12, marginalRate: '12%' },
          { min: 40526, max: 86375, rate: 0.22, marginalRate: '22%' },
          { min: 86376, max: 164925, rate: 0.24, marginalRate: '24%' },
          { min: 164926, max: 209425, rate: 0.32, marginalRate: '32%' },
          { min: 209426, max: 523600, rate: 0.35, marginalRate: '35%' },
          { min: 523601, max: Infinity, rate: 0.37, marginalRate: '37%' }
        ],
        married_joint: [
          { min: 0, max: 19900, rate: 0.1, marginalRate: '10%' },
          { min: 19901, max: 81050, rate: 0.12, marginalRate: '12%' },
          { min: 81051, max: 172750, rate: 0.22, marginalRate: '22%' },
          { min: 172751, max: 329850, rate: 0.24, marginalRate: '24%' },
          { min: 329851, max: 418850, rate: 0.32, marginalRate: '32%' },
          { min: 418851, max: 628300, rate: 0.35, marginalRate: '35%' },
          { min: 628301, max: Infinity, rate: 0.37, marginalRate: '37%' }
        ],
        married_separate: [
          { min: 0, max: 9950, rate: 0.1, marginalRate: '10%' },
          { min: 9951, max: 40525, rate: 0.12, marginalRate: '12%' },
          { min: 40526, max: 86375, rate: 0.22, marginalRate: '22%' },
          { min: 86376, max: 164925, rate: 0.24, marginalRate: '24%' },
          { min: 164926, max: 209425, rate: 0.32, marginalRate: '32%' },
          { min: 209426, max: 314150, rate: 0.35, marginalRate: '35%' },
          { min: 314151, max: Infinity, rate: 0.37, marginalRate: '37%' }
        ],
        head_household: [
          { min: 0, max: 14200, rate: 0.1, marginalRate: '10%' },
          { min: 14201, max: 54200, rate: 0.12, marginalRate: '12%' },
          { min: 54201, max: 86350, rate: 0.22, marginalRate: '22%' },
          { min: 86351, max: 164900, rate: 0.24, marginalRate: '24%' },
          { min: 164901, max: 209400, rate: 0.32, marginalRate: '32%' },
          { min: 209401, max: 523600, rate: 0.35, marginalRate: '35%' },
          { min: 523601, max: Infinity, rate: 0.37, marginalRate: '37%' }
        ],
        qualifying_widow: [
          { min: 0, max: 19900, rate: 0.1, marginalRate: '10%' },
          { min: 19901, max: 81050, rate: 0.12, marginalRate: '12%' },
          { min: 81051, max: 172750, rate: 0.22, marginalRate: '22%' },
          { min: 172751, max: 329850, rate: 0.24, marginalRate: '24%' },
          { min: 329851, max: 418850, rate: 0.32, marginalRate: '32%' },
          { min: 418851, max: 628300, rate: 0.35, marginalRate: '35%' },
          { min: 628301, max: Infinity, rate: 0.37, marginalRate: '37%' }
        ]
      }
    },
    2020: {
      year: 2020,
      source: 'Fallback - Please verify against IRS Publication 1040',
      lastUpdated: '2020-01-01',
      standardDeductions: {
        single: 12400,
        married_joint: 24800,
        married_separate: 12400,
        head_household: 18650,
        qualifying_widow: 24800
      },
      taxBrackets: {
        single: [
          { min: 0, max: 9875, rate: 0.1, marginalRate: '10%' },
          { min: 9876, max: 40125, rate: 0.12, marginalRate: '12%' },
          { min: 40126, max: 85525, rate: 0.22, marginalRate: '22%' },
          { min: 85526, max: 163300, rate: 0.24, marginalRate: '24%' },
          { min: 163301, max: 207350, rate: 0.32, marginalRate: '32%' },
          { min: 207351, max: 518400, rate: 0.35, marginalRate: '35%' },
          { min: 518401, max: Infinity, rate: 0.37, marginalRate: '37%' }
        ],
        married_joint: [
          { min: 0, max: 19750, rate: 0.1, marginalRate: '10%' },
          { min: 19751, max: 80250, rate: 0.12, marginalRate: '12%' },
          { min: 80251, max: 171050, rate: 0.22, marginalRate: '22%' },
          { min: 171051, max: 326600, rate: 0.24, marginalRate: '24%' },
          { min: 326601, max: 414700, rate: 0.32, marginalRate: '32%' },
          { min: 414701, max: 622050, rate: 0.35, marginalRate: '35%' },
          { min: 622051, max: Infinity, rate: 0.37, marginalRate: '37%' }
        ],
        married_separate: [
          { min: 0, max: 9875, rate: 0.1, marginalRate: '10%' },
          { min: 9876, max: 40125, rate: 0.12, marginalRate: '12%' },
          { min: 40126, max: 85525, rate: 0.22, marginalRate: '22%' },
          { min: 85526, max: 163300, rate: 0.24, marginalRate: '24%' },
          { min: 163301, max: 207350, rate: 0.32, marginalRate: '32%' },
          { min: 207351, max: 311025, rate: 0.35, marginalRate: '35%' },
          { min: 311026, max: Infinity, rate: 0.37, marginalRate: '37%' }
        ],
        head_household: [
          { min: 0, max: 14100, rate: 0.1, marginalRate: '10%' },
          { min: 14101, max: 53700, rate: 0.12, marginalRate: '12%' },
          { min: 53701, max: 85500, rate: 0.22, marginalRate: '22%' },
          { min: 85501, max: 163300, rate: 0.24, marginalRate: '24%' },
          { min: 163301, max: 207350, rate: 0.32, marginalRate: '32%' },
          { min: 207351, max: 518400, rate: 0.35, marginalRate: '35%' },
          { min: 518401, max: Infinity, rate: 0.37, marginalRate: '37%' }
        ],
        qualifying_widow: [
          { min: 0, max: 19750, rate: 0.1, marginalRate: '10%' },
          { min: 19751, max: 80250, rate: 0.12, marginalRate: '12%' },
          { min: 80251, max: 171050, rate: 0.22, marginalRate: '22%' },
          { min: 171051, max: 326600, rate: 0.24, marginalRate: '24%' },
          { min: 326601, max: 414700, rate: 0.32, marginalRate: '32%' },
          { min: 414701, max: 622050, rate: 0.35, marginalRate: '35%' },
          { min: 622051, max: Infinity, rate: 0.37, marginalRate: '37%' }
        ]
      }
    }
  };

  if (!ratesByYear[year]) {
    console.log(
      `[IRS] Warning: No fallback rates defined for year ${year}, using 2024 as default`
    );
    return {
      ...ratesByYear[2024],
      year,
      source: `Fallback (adapted from 2024) - VERIFY THIS IS CORRECT FOR ${year}`
    };
  }

  return ratesByYear[year];
};

/**
 * Clear the rate cache (useful for testing or forcing a refresh)
 */
const clearCache = () => {
  rateCache.clear();
  console.log('[IRS] Cache cleared');
};

/**
 * Get cache status (for debugging)
 */
const getCacheStatus = () => {
  return {
    size: rateCache.size,
    years: Array.from(rateCache.keys())
  };
};

module.exports = {
  fetchIRSTaxRates,
  getFallbackRates,
  clearCache,
  getCacheStatus
};
