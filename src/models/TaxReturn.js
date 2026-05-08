const mongoose = require('mongoose');

const taxReturnSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    year: {
      type: Number,
      required: true,
      min: 2020,
      max: 2030
    },
    filingStatus: {
      type: String,
      enum: [
        'single',
        'married_joint',
        'married_separate',
        'head_household',
        'qualifying_widow'
      ],
      required: true
    },
    // W-2 Information (manual entry for now)
    w2: {
      employerName: String,
      employerEIN: String,
      wages: Number,
      federalTaxWithheld: Number,
      socialSecurityWages: Number,
      socialSecurityTaxWithheld: Number,
      medicareWages: Number,
      medicareTaxWithheld: Number
    },
    // Additional income sources
    additionalIncome: {
      interestIncome: { type: Number, default: 0 },
      dividendIncome: { type: Number, default: 0 },
      businessIncome: { type: Number, default: 0 },
      rentalIncome: { type: Number, default: 0 },
      capitalGains: { type: Number, default: 0 },
      unemploymentIncome: { type: Number, default: 0 },
      otherIncome: { type: Number, default: 0 }
    },
    // Deductions
    deductions: {
      standardDeduction: { type: Boolean, default: true },
      itemizedDeductions: {
        medicalExpenses: { type: Number, default: 0 },
        stateTaxes: { type: Number, default: 0 },
        propertyTaxes: { type: Number, default: 0 },
        mortgageInterest: { type: Number, default: 0 },
        charitableDonations: { type: Number, default: 0 },
        otherItemized: { type: Number, default: 0 }
      }
    },
    // Credits
    credits: {
      childTaxCredit: { type: Number, default: 0 },
      earnedIncomeCredit: { type: Number, default: 0 },
      otherCredits: { type: Number, default: 0 }
    },
    // Calculated values
    calculations: {
      grossIncome: { type: Number, default: 0 },
      adjustedGrossIncome: { type: Number, default: 0 },
      taxableIncome: { type: Number, default: 0 },
      incomeTax: { type: Number, default: 0 },
      totalTaxCredits: { type: Number, default: 0 },
      netTax: { type: Number, default: 0 },
      refundOrOwed: { type: Number, default: 0 }
    },
    status: {
      type: String,
      enum: ['draft', 'calculated', 'ready_for_pdf', 'completed'],
      default: 'draft'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('TaxReturn', taxReturnSchema);
