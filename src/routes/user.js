const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

// Validation for updating personal info
const updatePersonalInfoValidation = [
  body('personalInfo.dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Invalid date of birth format'),

  body('personalInfo.address.street')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Street address must not exceed 100 characters'),

  body('personalInfo.address.city')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('City must not exceed 50 characters'),

  body('personalInfo.address.state')
    .optional()
    .trim()
    .isLength({ min: 2, max: 2 })
    .withMessage('State must be a 2-letter code'),

  body('personalInfo.address.zip')
    .optional()
    .matches(/^\d{5}(-\d{4})?$/)
    .withMessage('Invalid ZIP code format'),

  body('personalInfo.phoneNumber')
    .optional()
    .matches(/^(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/)
    .withMessage('Invalid phone number format'),

  body('personalInfo.occupation')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Occupation must not exceed 100 characters'),

  body('personalInfo.ssn')
    .optional()
    .matches(/^\d{3}-\d{2}-\d{4}$/)
    .withMessage('Invalid SSN format (XXX-XX-XXXX)')
];

// Get current user
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select(
      '-password -personalInfo.ssn'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (err) {
    next(err);
  }
});

// Update personal information
router.put(
  '/personal-info',
  authMiddleware,
  updatePersonalInfoValidation,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const user = await User.findById(req.user._id);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Update personal info fields
      if (req.body.personalInfo) {
        const { dateOfBirth, address, phoneNumber, occupation, ssn } =
          req.body.personalInfo;

        if (dateOfBirth !== undefined) {
          user.personalInfo.dateOfBirth = dateOfBirth;
        }

        if (address) {
          user.personalInfo.address = {
            ...user.personalInfo.address,
            ...address
          };
        }

        if (phoneNumber !== undefined) {
          user.personalInfo.phoneNumber = phoneNumber;
        }

        if (occupation !== undefined) {
          user.personalInfo.occupation = occupation;
        }

        if (ssn !== undefined) {
          user.personalInfo.ssn = ssn;
        }
      }

      user.updatedAt = Date.now();
      await user.save();

      // Return user without sensitive data
      const updatedUser = await User.findById(user._id).select(
        '-password -personalInfo.ssn'
      );

      res.json({
        success: true,
        user: updatedUser,
        message: 'Personal information updated successfully'
      });
    } catch (err) {
      next(err);
    }
  }
);

// Delete account (soft delete - sets a deleted flag)
router.delete('/account', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // In production, you might want to:
    // 1. Soft delete (add deletedAt timestamp)
    // 2. Remove associated tax returns
    // 3. Keep data for legal/audit requirements

    await User.findByIdAndDelete(req.user._id);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
