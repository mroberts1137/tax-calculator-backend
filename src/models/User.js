const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { encryptData } = require('../utils/encryption');

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 50
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 50
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    password: {
      type: String,
      required: true,
      minlength: 8
    },
    // Optional personal information for auto-filling 1040
    personalInfo: {
      ssn: {
        type: String,
        select: false // Never return SSN in queries by default
      },
      dateOfBirth: Date,
      address: {
        street: String,
        city: String,
        state: String,
        zip: String
      },
      phoneNumber: String,
      occupation: String
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

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Encrypt sensitive personal info (SSN) before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('personalInfo.ssn') || !this.personalInfo?.ssn)
    return next();

  try {
    this.personalInfo.ssn = encryptData(this.personalInfo.ssn);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get decrypted SSN (for authorized access only)
userSchema.methods.getDecryptedSSN = function () {
  const { decryptData } = require('../utils/encryption');
  if (!this.personalInfo?.ssn) return null;
  return decryptData(this.personalInfo.ssn);
};

module.exports = mongoose.model('User', userSchema);
