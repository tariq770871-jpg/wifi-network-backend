const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
require('dotenv').config();

const errorHandler = require('./shared/middleware/errorHandler');

// Routes
const { authRoutes } = require('./modules/auth');
const { usersRoutes } = require('./modules/users');
const { ticketsRoutes } = require('./modules/tickets');
const { trackingRoutes } = require('./modules/tracking');
const { mapPointsRoutes } = require('./modules/map-points');
const { reportsRoutes } = require('./modules/reports');
const { signalRoutes } = require('./modules/signal');
const { networksRoutes } = require('./modules/networks');
const { devicesRoutes } = require('./modules/devices');

const app = express();

// CORS - allow all origins for development, restrict in production
const allowedOrigins = process.env.ALLOWED_ORIGINS;
if (allowedOrigins && allowedOrigins.trim() !== '') {
  const origins = allowedOrigins.split(',').map(o => o.trim()).filter(Boolean);
  app.use(cors({ origin: origins, credentials: true }));
} else {
  app.use(cors({ origin: true, credentials: true }));
}

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined'));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/map-points', mapPointsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/signal', signalRoutes);
app.use('/api/networks', networksRoutes);
app.use('/api/devices', devicesRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'المسار غير موجود' });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
