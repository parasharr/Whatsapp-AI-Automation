require('dotenv').config();
const express = require('express');
const cors = require('cors');
const healthRouter = require('./routes/health.route');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', healthRouter);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Grox WhatsApp AI Server is active.',
    healthCheck: '/api/health'
  });
});

module.exports = app;
