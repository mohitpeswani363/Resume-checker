require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const checkRoutes = require('./routes/check');
const uploadRoutes = require('./routes/upload');
const { initializeDatabase } = require('./db.js');

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

async function startServer() {
  const db = await initializeDatabase();
  const app = express();

  app.locals.db = db;

  const clientUrls = (process.env.CLIENT_URL || '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);
  const allowedOrigins = Array.from(
    new Set([...clientUrls, 'http://localhost:5173', 'http://localhost:3000'])
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (
          !origin ||
          allowedOrigins.includes(origin) ||
          origin.endsWith('.vercel.app')
        ) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'resume-checker-api' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/check', checkRoutes);
  app.use('/api/upload', uploadRoutes);

  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API route not found.' });
    }
    next();
  });

  const clientDistCandidates = [
    path.join(__dirname, 'client', 'dist'),
    path.join(__dirname, '..', 'client', 'dist'),
  ];
  const clientDist =
    clientDistCandidates.find((dir) => fs.existsSync(path.join(dir, 'index.html'))) ||
    clientDistCandidates[1];

  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'), (err) => {
      if (err) next();
    });
  });

  app.use((err, _req, res, _next) => {
    if (err.message === 'Not allowed by CORS') {
      return res.status(403).json({ error: 'Origin not allowed.' });
    }
    console.error('Unhandled error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Resume Checker API running on port ${PORT}`);
    if (fs.existsSync(path.join(clientDist, 'index.html'))) {
      console.log(`Serving client from ${clientDist}`);
    } else {
      console.warn(`Client build not found at ${clientDist} — API only mode`);
    }
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
