const MIN_RESUME_LENGTH = 200;
const AI_TIMEOUT_MS = 45000;
const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';

const LOCAL_SUGGESTIONS = {
  contact: {
    title: 'Make recruiters stalkable (professionally)',
    detail:
      'Drop a clean email and phone number at the top. Recruiters should not need Sherlock Holmes to find you — unless your resume is the mystery.',
  },
  experience: {
    title: 'Show the receipts, not just the job title',
    detail:
      'Add a Work Experience section with bullet points that prove impact. "Software Engineer" tells them what you were called; "Cut deploy time 40%" tells them why they should care.',
  },
  education: {
    title: 'Flex the brain credentials',
    detail:
      'List your degree, school, or certifications. Even if you are self-taught, mention relevant courses or bootcamps — otherwise it reads like you learned everything from YouTube at 2 AM (relatable, but not resume-friendly).',
  },
  skills: {
    title: 'Keyword buffet for the ATS gods',
    detail:
      'Add a Skills section with tools and technologies you actually know. ATS scanners are picky eaters — feed them the keywords from the job posting or your resume might never meet human eyes.',
  },
  actionVerbs: {
    title: 'Swap weak verbs for main-character energy',
    detail:
      'Start bullets with power verbs like Led, Built, Shipped, or Optimized. "Responsible for" is the resume equivalent of "fine" — technically acceptable, emotionally devastating.',
  },
  detail: {
    title: 'More substance, less skeleton',
    detail:
      'Expand with metrics, scope, and outcomes. A resume with only job titles is like a movie trailer with no plot — intriguing for three seconds, then forgotten forever.',
  },
};

const ROAST_POOL = {
  high: [
    'Not bad at all — your resume would survive a recruiter skim without triggering the delete reflex. A few spicy tweaks and you are interview-ready.',
    'Solid work. This resume does not need a funeral — just a glow-up montage with sharper bullets and tighter formatting.',
    'You are in the "please call them back" zone. Recruiters might actually read past line three, which is basically a standing ovation in 2026.',
  ],
  mid: [
    'Your resume is giving "potential" — like a draft essay with good ideas and questionable paragraph breaks. Fixable, and honestly kind of charming.',
    'Not a disaster, not a masterpiece — classic "hire with coaching" energy. A recruiter would keep reading… but probably while raising one eyebrow.',
    'This reads like someone competent who forgot to brag. The bones are there; now add the sizzle before an ATS eats it for lunch.',
  ],
  low: [
    'Bold of you to submit this without a contact section. Recruiters love a mystery, but usually in thriller novels, not applicant tracking systems.',
    'Your resume currently reads like a rough draft written during a commercial break. The good news: rough drafts are fixable. The bad news: so far it is mostly title cards.',
    'If this resume were a pizza, it would be plain dough — edible in theory, but nobody is posting about it on Instagram. Time to add toppings (metrics, skills, structure).',
  ],
};

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function normalizeFeedback(raw, source) {
  const score = Math.min(100, Math.max(0, Number(raw.score) || 0));
  const suggestions = Array.isArray(raw.suggestions)
    ? raw.suggestions
        .filter((item) => item && (item.title || item.detail))
        .map((item) => ({
          title: String(item.title || 'Level-up tip').trim(),
          detail: String(item.detail || item.title || '').trim(),
        }))
        .slice(0, 6)
    : [];

  return {
    score,
    summary: String(raw.summary || 'Analysis complete.').trim(),
    roast: String(raw.roast || pickRoast(score)).trim(),
    strengths: Array.isArray(raw.strengths) ? raw.strengths.map(String).filter(Boolean) : [],
    improvements: Array.isArray(raw.improvements) ? raw.improvements.map(String).filter(Boolean) : [],
    suggestions,
    checks: Array.isArray(raw.checks)
      ? raw.checks.map((check) => ({
          label: String(check.label || 'Check').trim(),
          passed: Boolean(check.passed),
          tip: String(check.tip || '').trim(),
        }))
      : [],
    wordCount: raw.wordCount,
    source,
  };
}

function pickRoast(score) {
  if (score >= 80) return pickRandom(ROAST_POOL.high);
  if (score >= 50) return pickRandom(ROAST_POOL.mid);
  return pickRandom(ROAST_POOL.low);
}

function buildLocalSuggestions(flags) {
  const suggestions = [];
  if (!flags.hasContact) suggestions.push(LOCAL_SUGGESTIONS.contact);
  if (!flags.hasExperience) suggestions.push(LOCAL_SUGGESTIONS.experience);
  if (!flags.hasEducation) suggestions.push(LOCAL_SUGGESTIONS.education);
  if (!flags.hasSkills) suggestions.push(LOCAL_SUGGESTIONS.skills);
  if (!flags.hasActionVerbs) suggestions.push(LOCAL_SUGGESTIONS.actionVerbs);
  if (!flags.needsMoreDetail) suggestions.push(LOCAL_SUGGESTIONS.detail);

  if (suggestions.length === 0) {
    suggestions.push({
      title: 'Tailor it like a cover letter in disguise',
      detail:
        'Mirror keywords from each job posting in your summary and top bullets. Generic resumes get generic silence — customized ones get callbacks.',
    });
    suggestions.push({
      title: 'Quantify everything that moved',
      detail:
        'Add numbers wherever you can: team size, revenue, users, time saved, error rates. Recruiters trust math more than adjectives.',
    });
  }

  return suggestions.slice(0, 5);
}

function analyzeLocally(resumeText) {
  const words = resumeText.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const flags = {
    hasContact: /\S+@\S+\.\S+/.test(resumeText) || /(\+?\d[\d\s\-().]{7,}\d)/.test(resumeText),
    hasExperience: /experience|work history|employment/i.test(resumeText),
    hasEducation: /education|degree|university|college|bachelor|master/i.test(resumeText),
    hasSkills: /skills|technologies|proficient|expertise/i.test(resumeText),
    hasActionVerbs:
      /(led|managed|built|created|developed|designed|implemented|improved|achieved|shipped|delivered|optimized)/i.test(
        resumeText
      ),
    needsMoreDetail: wordCount < 150,
  };

  const checks = [
    {
      label: 'Contact information',
      passed: flags.hasContact,
      tip: LOCAL_SUGGESTIONS.contact.detail,
    },
    {
      label: 'Work experience',
      passed: flags.hasExperience,
      tip: LOCAL_SUGGESTIONS.experience.detail,
    },
    {
      label: 'Education',
      passed: flags.hasEducation,
      tip: LOCAL_SUGGESTIONS.education.detail,
    },
    {
      label: 'Skills section',
      passed: flags.hasSkills,
      tip: LOCAL_SUGGESTIONS.skills.detail,
    },
    {
      label: 'Action-oriented language',
      passed: flags.hasActionVerbs,
      tip: LOCAL_SUGGESTIONS.actionVerbs.detail,
    },
    {
      label: 'Sufficient detail',
      passed: !flags.needsMoreDetail,
      tip: LOCAL_SUGGESTIONS.detail.detail,
    },
  ];

  const passedCount = checks.filter((check) => check.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);

  const strengths = checks.filter((check) => check.passed).map((check) => check.label);
  const improvements = checks.filter((check) => !check.passed).map((check) => check.tip);

  const summary =
    score >= 80
      ? 'Strong foundation — polish formatting and tailor each application.'
      : score >= 60
        ? 'Decent start with clear room to boost clarity and impact.'
        : 'Needs more structure and proof of results before it will stand out.';

  return normalizeFeedback(
    {
      score,
      summary,
      roast: pickRoast(score),
      strengths,
      improvements,
      suggestions: buildLocalSuggestions(flags),
      checks,
      wordCount,
    },
    'local'
  );
}

function buildAIPrompt(resumeText) {
  return `You are a witty but supportive career coach reviewing a resume. Be fun and descriptive — like a friendly roast that still helps.

Respond ONLY with valid JSON (no markdown fences) in this exact shape:
{
  "score": <number 0-100>,
  "summary": "<one professional sentence overview>",
  "roast": "<2-3 sentences: playful, memorable roast of the resume — sharp humor but never cruel or personal>",
  "strengths": ["<specific strength>", ...],
  "improvements": ["<short actionable fix>", ...],
  "suggestions": [
    {
      "title": "<catchy 3-8 word headline>",
      "detail": "<2-3 fun, descriptive sentences with concrete advice on how to improve the resume>"
    }
  ],
  "checks": [
    { "label": "<category>", "passed": <boolean>, "tip": "<short tip if failed>" }
  ]
}

Rules:
- Include 3-5 suggestions with vivid, encouraging language
- Roast should feel like a clever friend, not a bully
- Be specific to THIS resume content, not generic platitudes
- checks should cover: contact info, experience, education, skills, action verbs, measurable impact

Resume:
${resumeText}`;
}

async function analyzeWithAI(resumeText, apiKey) {
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        temperature: 0.7,
        messages: [{ role: 'user', content: buildAIPrompt(resumeText) }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`Anthropic API ${response.status}: ${errorBody.slice(0, 200)}`);
    }

    const payload = await response.json();
    const textBlock = payload.content?.find((block) => block.type === 'text');
    const raw = textBlock?.text?.trim() || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('AI response did not contain JSON');
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error('AI returned invalid JSON');
    }

    const feedback = normalizeFeedback(parsed, 'ai');

    if (feedback.suggestions.length === 0 && feedback.improvements.length > 0) {
      feedback.suggestions = feedback.improvements.slice(0, 5).map((tip, index) => ({
        title: `Fix #${index + 1}`,
        detail: tip,
      }));
    }

    if (!feedback.roast) {
      feedback.roast = pickRoast(feedback.score);
    }

    return feedback;
  } finally {
    clearTimeout(timeout);
  }
}

async function analyzeResume(resumeText) {
  const trimmed = resumeText.trim();

  if (trimmed.length < MIN_RESUME_LENGTH) {
    const error = new Error(`Resume must be at least ${MIN_RESUME_LENGTH} characters.`);
    error.status = 400;
    throw error;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();

  if (apiKey) {
    try {
      return await analyzeWithAI(trimmed, apiKey);
    } catch (error) {
      console.warn('AI analysis failed, using local fallback:', error.message);
      const local = analyzeLocally(trimmed);
      local.aiFallback = true;
      local.summary = `${local.summary} (AI unavailable — showing rule-based roast.)`;
      return local;
    }
  }

  return analyzeLocally(trimmed);
}

module.exports = {
  MIN_RESUME_LENGTH,
  analyzeResume,
};
