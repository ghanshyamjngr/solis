import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

app.use('/api', (req, res, next) => {
  if (req.get('Origin') !== 'https://localhost') {
    return next();
  }

  res.setHeader('Access-Control-Allow-Origin', 'https://localhost');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

// Initialize Gemini client with telemetry header
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Server-side Gemini AI Insights route
app.post('/api/ai-insights', async (req, res) => {
  try {
    const { activities, tasks, deviceUsageSummary, suggestionFeedback, preferences, selectedDate } = req.body;

    if (!ai) {
      return res.status(200).json({
        available: false,
        reason: 'Local intelligent engine active (no Gemini API key configured).',
      });
    }

    const activitySummaryText = (activities || [])
      .map((a: any) => `- ${a.date || selectedDate} [${a.category}] ${a.durationMinutes} mins`)
      .join('\n');

    const taskSummaryText = (tasks || [])
      .map((task: any) => `- ${task.date}: "${task.title}" (${task.repeat || 'one-time'}; ${task.completed ? 'completed' : 'not marked complete'})`)
      .join('\n');
    const safeUsageSummary = Array.isArray(deviceUsageSummary)
      ? deviceUsageSummary.slice(-4).filter((day: any) => day
        && /^\d{4}-\d{2}-\d{2}$/.test(day.date)
        && Number.isFinite(day.screenOnMinutes)
        && Number.isFinite(day.foregroundAppMinutes))
        .map((day: any) => ({
          date: day.date,
          screenOnMinutes: Math.max(0, Math.min(1440, Math.round(day.screenOnMinutes))),
          foregroundAppMinutes: Math.max(0, Math.min(1440, Math.round(day.foregroundAppMinutes))),
        }))
      : [];
    const deviceUsageSummaryText = safeUsageSummary
      .map((day: any) => `- ${day.date}: ${day.screenOnMinutes} screen-on minutes; ${day.foregroundAppMinutes} foreground-app minutes`)
      .join('\n');
    const safeSuggestionFeedback = Array.isArray(suggestionFeedback)
      ? suggestionFeedback.slice(-3).filter((item: any) => item
        && /^\d{4}-\d{2}-\d{2}$/.test(item.date)
        && ['accepted', 'dismissed', 'not-useful', 'edited'].includes(item.action))
        .map((item: any) => `- ${item.date}: user marked a previous suggestion as ${item.action}`)
        .join('\n')
      : '';

    const prompt = `You are Awake, a gentle, privacy-minded life companion. This is a personalized suggestion based on a short recent history, not model training.
Analyze the user's recent four-day activity and task follow-through through ${selectedDate}:
${activitySummaryText || 'No activities recorded yet for today.'}

Minimized device-usage summary, only if the user separately enabled sharing:
${deviceUsageSummaryText || 'No device-usage summary was shared.'}

Planned tasks and explicit completion check-ins:
${taskSummaryText || 'No planned tasks were provided.'}

Recent suggestion feedback, if separately enabled activity/task personalization includes it:
${safeSuggestionFeedback || 'No prior suggestion feedback was shared.'}

Guiding principles:
1. NEVER shame, guilt-trip, or judge the user.
2. Value sleep, meals, outdoor walks, and offline time equally to screen-based focus.
3. Observe only real facts.
4. Device-usage totals show time only. Never infer studying, touch interaction, task completion, websites visited, or what happened inside an app from usage totals.
5. Notice realistic patterns across days and suggest one specific next action, but do not invent facts or pressure the user.
6. Tone: ${preferences?.encouragementTone || 'gentle'}.
7. Use shared accept/edit/dismiss feedback to adjust future suggestions, without treating dismissal as a negative judgment of the user.

Provide a JSON object response with:
- summary: A 1-2 sentence warm, realistic overview of how the day was woven.
- encouragement: A supportive, uplifting reflection based strictly on observed efforts.
- observedFacts: An array of 2-4 factual statements (e.g. "Dedicated 50m to focus", "Walked outdoors for 35m").
- gentleNudge: An optional gentle suggestion for rest or water if they've worked long, or celebration of rest if they took breaks.
- harmonyScore: An integer between 50 and 100 representing life balance.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            encouragement: { type: Type.STRING },
            observedFacts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            gentleNudge: { type: Type.STRING },
            harmonyScore: { type: Type.INTEGER },
          },
          required: ['summary', 'encouragement', 'observedFacts', 'harmonyScore'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      available: true,
      insight: {
        ...parsed,
        source: 'gemini',
        generatedAt: Date.now(),
      },
    });
  } catch (error: any) {
    console.error('Gemini insights generation error:', error);
    return res.status(200).json({
      available: false,
      error: error.message || 'Error communicating with AI service. Falling back to local intelligence.',
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

async function startServer() {
  // Mount Vite middlewares in development
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
