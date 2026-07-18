const MIN_RESUME_LENGTH = 200;

function analyzeLocally(resumeText) {
  const words = resumeText.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const hasEmail = /\S+@\S+\.\S+/.test(resumeText);
  const hasPhone = /(\+?\d[\d\s\-().]{7,}\d)/.test(resumeText);
  const hasExperience = /experience|work history|employment/i.test(resumeText);
  const hasEducation = /education|degree|university|college|bachelor|master/i.test(resumeText);
  const hasSkills = /skills|technologies|proficient|expertise/i.test(resumeText);
  const hasActionVerbs = /(led|managed|built|created|developed|designed|implemented|improved|achieved)/i.test(
    resumeText
  );

  const checks = [
    { label: 'Contact information', passed: hasEmail || hasPhone, tip: 'Include a professional email and phone number.' },
    { label: 'Work experience', passed: hasExperience, tip: 'Add a clear Experience or Work History section.' },
    { label: 'Education', passed: hasEducation, tip: 'List your degrees, certifications, or relevant coursework.' },
    { label: 'Skills section', passed: hasSkills, tip: 'Highlight technical and soft skills recruiters scan for.' },
    { label: 'Action-oriented language', passed: hasActionVerbs, tip: 'Start bullet points with strong action verbs like "Led" or "Built".' },
    { label: 'Sufficient detail', passed: wordCount >= 150, tip: 'Aim for enough detail to show impact, not just job titles.' },
  ];

  const passedCount = checks.filter((check) => check.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);

  const strengths = checks.filter((check) => check.passed).map((check) => check.label);
  const improvements = checks.filter((check) => !check.passed).map((check) => check.tip);

  const summary =
    score >= 80
      ? 'Strong resume foundation. Polish formatting and tailor it to each role.'
      : score >= 60
        ? 'Solid start with room to improve clarity, impact, and structure.'
        : 'Needs more structure and detail before it will stand out to recruiters.';

  return {
    score,
    summary,
    strengths,
    improvements,
    checks,
    wordCount,
    source: 'local',
  };
}

async function analyzeWithAI(resumeText, apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are a professional resume reviewer. Analyze this resume and respond ONLY with valid JSON in this exact shape:
{
  "score": <number 0-100>,
  "summary": "<one sentence overview>",
  "strengths": ["<strength>", ...],
  "improvements": ["<actionable tip>", ...],
  "checks": [
    { "label": "<category>", "passed": <boolean>, "tip": "<short tip>" }
  ]
}

Resume:
${resumeText}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI provider returned ${response.status}`);
  }

  const payload = await response.json();
  const textBlock = payload.content?.find((block) => block.type === 'text');
  const raw = textBlock?.text || '';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error('AI response did not contain JSON');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    score: Number(parsed.score) || 0,
    summary: parsed.summary || '',
    strengths: parsed.strengths || [],
    improvements: parsed.improvements || [],
    checks: parsed.checks || [],
    source: 'ai',
  };
}

async function analyzeResume(resumeText) {
  const trimmed = resumeText.trim();

  if (trimmed.length < MIN_RESUME_LENGTH) {
    const error = new Error(`Resume must be at least ${MIN_RESUME_LENGTH} characters.`);
    error.status = 400;
    throw error;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey) {
    try {
      return await analyzeWithAI(trimmed, apiKey);
    } catch {
      return analyzeLocally(trimmed);
    }
  }

  return analyzeLocally(trimmed);
}

module.exports = {
  MIN_RESUME_LENGTH,
  analyzeResume,
};
