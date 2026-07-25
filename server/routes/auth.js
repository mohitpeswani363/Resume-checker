const express = require('express');
const bcrypt = require('bcryptjs');
const { createUser, findUserByEmail, findUserById } = require('../db.js');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body || {};

  if (typeof email !== 'string' || typeof password !== 'string' || typeof name !== 'string' || !email.trim() || !password || !name.trim()) {
    return res.status(400).json({ error: 'email, password, and name are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const db = req.app.locals.db;

  try {
    const existing = await findUserByEmail(db, email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser(db, email.toLowerCase().trim(), passwordHash, name.trim());
    const token = signToken(user);

    return res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch {
    return res.status(500).json({ error: 'Unable to create account.' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return res.status(400).json({ error: 'email and password are required.' });
  }

  const db = req.app.locals.db;

  try {
    const user = await findUserByEmail(db, email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(user);

    return res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch {
    return res.status(500).json({ error: 'Unable to log in.' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  const db = req.app.locals.db;

  try {
    const user = await findUserById(db, req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({ user });
  } catch {
    return res.status(500).json({ error: 'Unable to load profile.' });
  }
});

module.exports = router;
