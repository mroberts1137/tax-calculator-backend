const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const TaxReturn = require('../models/TaxReturn');

// Create a new tax return
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { year, filingStatus, w2, additionalIncome, deductions, credits } =
      req.body;

    // Check if user already has a tax return for this year
    const existingReturn = await TaxReturn.findOne({
      userId: req.user._id,
      year
    });

    if (existingReturn) {
      return res.status(400).json({
        success: false,
        error: `Tax return for ${year} already exists`
      });
    }

    const taxReturn = new TaxReturn({
      userId: req.user._id,
      year,
      filingStatus,
      w2: w2 || {},
      additionalIncome: additionalIncome || {},
      deductions: deductions || { standardDeduction: true },
      credits: credits || {}
    });

    await taxReturn.save();

    res.status(201).json({
      success: true,
      taxReturn
    });
  } catch (err) {
    next(err);
  }
});

// Get all tax returns for user
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const taxReturns = await TaxReturn.find({ userId: req.user._id })
      .sort({ year: -1 })
      .select('-__v');

    res.json({
      success: true,
      taxReturns
    });
  } catch (err) {
    next(err);
  }
});

// Get specific tax return
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tax return ID'
      });
    }

    const taxReturn = await TaxReturn.findOne({
      _id: id,
      userId: req.user._id
    }).select('-__v');

    if (!taxReturn) {
      return res.status(404).json({
        success: false,
        error: 'Tax return not found'
      });
    }

    res.json({
      success: true,
      taxReturn
    });
  } catch (err) {
    next(err);
  }
});

// Update tax return
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tax return ID'
      });
    }

    const taxReturn = await TaxReturn.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!taxReturn) {
      return res.status(404).json({
        success: false,
        error: 'Tax return not found'
      });
    }

    // Validate incoming data
    const allowedUpdates = [
      'filingStatus',
      'w2',
      'additionalIncome',
      'deductions',
      'credits',
      'status'
    ];
    const updates = {};

    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    Object.assign(taxReturn, updates);
    taxReturn.updatedAt = Date.now();

    await taxReturn.save();

    res.json({
      success: true,
      taxReturn
    });
  } catch (err) {
    next(err);
  }
});

// Calculate tax for a return
router.post('/:id/calculate', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tax return ID'
      });
    }

    const taxReturn = await TaxReturn.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!taxReturn) {
      return res.status(404).json({
        success: false,
        error: 'Tax return not found'
      });
    }

    // Import calculator
    const { calculateTax } = require('../utils/taxCalculator');

    const calculations = calculateTax(taxReturn);

    taxReturn.calculations = calculations;
    taxReturn.status = 'calculated';
    taxReturn.updatedAt = Date.now();

    await taxReturn.save();

    res.json({
      success: true,
      taxReturn,
      calculations
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
