const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { rateLimiterMiddleware } = require('./middleware/rateLimiter');

dotenv.config();

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  })
);
app.use(express.json());
app.use(rateLimiterMiddleware);

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const taxRoutes = require('./routes/tax');

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/tax', taxRoutes);

// Error handling middleware
const { errorHandler } = require('./middleware/errorHandler');
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/taxcalc', {
    // useNewUrlParser: true,
    // useUnifiedTopology: true
  })
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
