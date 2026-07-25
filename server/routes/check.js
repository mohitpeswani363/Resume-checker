const express = require('express');
const { analyzeResume, MIN_RESUME_LENGTH } = require('../services/resumeAnalyzer');
const { saveCheck, getRecentChecks } = require('../db.js');
const { optionalAuth, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/', optionalAuth, async (req, res) => {
  const { resumeText, sourceType = 'text' } = req.body;

  if (!resumeText || typeof resumeText !== 'string') {
    return res.status(400).json({ error: 'resumeText is required.' });
  }

  try {
    const feedback = await analyzeResume(resumeText);
    const db = req.app.locals.db;
    const userId = req.user?.id || null;
    const saved = await saveCheck(
      db,
      resumeText.trim(),
      feedback.score,
      feedback,
      userId,
      sourceType
    );

    return res.json({
      id: saved.id,
      score: saved.score,
      feedback: saved.feedback,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      error: error.message || 'Unable to analyze resume.',
      minLength: MIN_RESUME_LENGTH,
    });
  }
});

router.get('/history', requireAuth, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const history = await getRecentChecks(db, 10, req.user.id);
    return res.json({ history });
  } catch {
    return res.status(500).json({ error: 'Unable to load history.' });
  }
});

module.exports = router;
