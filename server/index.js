require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const checkRoutes = require('./routes/check');
const uploadRoutes = require('./routes/upload');
const { initializeDatabase } = require('./db/database');

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

async function startServer() {
  const db = await initializeDatabase();
  const app = express();

  app.locals.db = db;

  app.use(
    cors({
      origin: [CLIENT_URL, 'http://localhost:5173'],
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

  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'), (err) => {
      if (err) next();
    });
  });

  app.listen(PORT, () => {
    console.log(`Resume Checker API running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
