const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/User');

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
router.put('/personal-info', authMiddleware, async (req, res, next) => {
  try {
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
});

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
