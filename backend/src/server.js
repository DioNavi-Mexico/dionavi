// src/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:5173'];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

const requireStaffAuth = require('./middleware/staffAuth');

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/staff', require('./routes/staffAuth'));
app.use('/api/cases', require('./routes/cases'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Staff-protected routes
app.use('/api/validation', requireStaffAuth(['validation', 'admin']), require('./routes/validation'));
app.use('/api/planning',   requireStaffAuth(['planner',    'admin']), require('./routes/planning'));
app.use('/api/quotation',  requireStaffAuth(['quotation',  'admin']), require('./routes/quotation'));
app.use('/api/lab',        requireStaffAuth(['lab',        'admin']), require('./routes/lab'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message,
      status: err.status || 500
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 DIONavi Lab Backend running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
