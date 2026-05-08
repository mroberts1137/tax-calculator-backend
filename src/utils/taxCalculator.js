const { fetchIRSTaxRates, getFallbackRates } = require('./irsFetcher');

/**
 * Calculate federal income tax for a tax return
 * @param {Object} taxReturn - The tax return document
 * @returns {Object} Calculated values
 */
const calculateTax = (taxReturn) => {
  try {
    // Get tax rates for the year (using cached/default for now)
    const rates = getTaxRates(taxReturn.year);

    // Step 1: Calculate Gross Income
    const grossIncome = calculateGrossIncome(taxReturn);

    // Step 2: Calculate Adjusted Gross Income (AGI)
    // For now, AGI = Gross Income (no adjustments implemented yet)
    const adjustedGrossIncome = grossIncome;

    // Step 3: Calculate Taxable Income
    const { taxableIncome, deductionUsed } = calculateTaxableIncome(
      adjustedGrossIncome,
      taxReturn.filingStatus,
      taxReturn.deductions,
      rates
    );

    // Step 4: Calculate Income Tax
    const incomeTax = calculateIncomeTax(
      taxableIncome,
      taxReturn.filingStatus,
      rates
    );

    // Step 5: Calculate Total Credits
    const totalTaxCredits = calculateCredits(taxReturn.credits);

    // Step 6: Calculate Net Tax
    const netTax = Math.max(0, incomeTax - totalTaxCredits);

    // Step 7: Calculate Refund or Amount Owed
    const totalWithheld = taxReturn.w2?.federalTaxWithheld || 0;
    const refundOrOwed = totalWithheld - netTax;

    return {
      grossIncome: roundToNearest(grossIncome),
      adjustedGrossIncome: roundToNearest(adjustedGrossIncome),
      taxableIncome: roundToNearest(taxableIncome),
      incomeTax: roundToNearest(incomeTax),
      totalTaxCredits: roundToNearest(totalTaxCredits),
      netTax: roundToNearest(netTax),
      refundOrOwed: roundToNearest(refundOrOwed),
      deductionUsed,
      filingStatus: taxReturn.filingStatus,
      year: taxReturn.year
    };
  } catch (err) {
    throw new Error(`Tax calculation failed: ${err.message}`);
  }
};

/**
 * Calculate Gross Income from all sources
 */
const calculateGrossIncome = (taxReturn) => {
  let income = 0;

  // W-2 Wages
  income += taxReturn.w2?.wages || 0;

  // Additional income sources
  const additionalIncome = taxReturn.additionalIncome || {};
  income += additionalIncome.interestIncome || 0;
  income += additionalIncome.dividendIncome || 0;
  income += additionalIncome.businessIncome || 0;
  income += additionalIncome.rentalIncome || 0;
  income += additionalIncome.capitalGains || 0;
  income += additionalIncome.unemploymentIncome || 0;
  income += additionalIncome.otherIncome || 0;

  return income;
};

/**
 * Calculate Taxable Income after deductions
 */
const calculateTaxableIncome = (agi, filingStatus, deductions, rates) => {
  let deductionAmount = 0;
  let deductionUsed = 'standard';

  if (deductions?.standardDeduction !== false) {
    // Use standard deduction
    deductionAmount = rates.standardDeductions[filingStatus] || 0;
  } else if (deductions?.itemizedDeductions) {
    // Calculate itemized deductions
    const itemized = deductions.itemizedDeductions;
    const totalItemized =
      (itemized.medicalExpenses || 0) +
      (itemized.stateTaxes || 0) +
      (itemized.propertyTaxes || 0) +
      (itemized.mortgageInterest || 0) +
      (itemized.charitableDonations || 0) +
      (itemized.otherItemized || 0);

    // Use itemized if greater than standard
    const standardDed = rates.standardDeductions[filingStatus] || 0;
    if (totalItemized > standardDed) {
      deductionAmount = totalItemized;
      deductionUsed = 'itemized';
    } else {
      deductionAmount = standardDed;
      deductionUsed = 'standard';
    }
  }

  const taxableIncome = Math.max(0, agi - deductionAmount);

  return { taxableIncome, deductionUsed, deductionAmount };
};

/**
 * Calculate income tax using progressive tax brackets
 */
const calculateIncomeTax = (taxableIncome, filingStatus, rates) => {
  const brackets = rates.taxBrackets[filingStatus] || [];

  if (brackets.length === 0) {
    throw new Error(
      `No tax brackets defined for filing status: ${filingStatus}`
    );
  }

  let tax = 0;
  let remainingIncome = taxableIncome;

  for (const bracket of brackets) {
    if (remainingIncome <= 0) break;

    const bracketWidth = bracket.max - bracket.min;
    const taxableInBracket = Math.min(remainingIncome, bracketWidth);

    tax += taxableInBracket * bracket.rate;
    remainingIncome -= taxableInBracket;
  }

  return tax;
};

/**
 * Calculate total tax credits
 */
const calculateCredits = (credits) => {
  if (!credits) return 0;

  let totalCredits = 0;
  totalCredits += credits.childTaxCredit || 0;
  totalCredits += credits.earnedIncomeCredit || 0;
  totalCredits += credits.otherCredits || 0;

  return totalCredits;
};

/**
 * Get tax rates for a specific year
 * This uses cached/fallback rates. In production, you'd want to:
 * 1. Attempt to fetch from IRS first
 * 2. Fall back to cached values if fetch fails
 * 3. Cache the fetched values for future use
 */
const getTaxRates = (year) => {
  // For production, you would implement:
  // try {
  //   const rates = await fetchIRSTaxRates(year);
  //   return rates;
  // } catch (err) {
  //   console.error(`Failed to fetch IRS rates for ${year}, using fallback:`, err.message);
  //   return getFallbackRates(year);
  // }

  // For now, use fallback rates
  // The fetching infrastructure is in place - just need the actual HTML structure
  return getFallbackRates(year);
};

/**
 * Round to nearest cent
 */
const roundToNearest = (value) => {
  return Math.round(value * 100) / 100;
};

module.exports = { calculateTax, getTaxRates };
