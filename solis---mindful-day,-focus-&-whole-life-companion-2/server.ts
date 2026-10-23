import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

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
    const { activities, preferences, selectedDate } = req.body;

    if (!ai) {
      return res.status(200).json({
        available: false,
        reason: 'Local intelligent engine active (no Gemini API key configured).',
      });
    }

    const activitySummaryText = (activities || [])
      .map((a: any) => `- [${a.category}] "${a.title}": ${a.durationMinutes} mins (${a.notes || 'no notes'})`)
      .join('\n');

    const prompt = `You are Solis, a gentle, privacy-minded life companion.
Analyze the following recorded activities for ${selectedDate}:
${activitySummaryText || 'No activities recorded yet for today.'}

Guiding principles:
1. NEVER shame, guilt-trip, or judge the user.
2. Value sleep, meals, outdoor walks, and offline time equally to screen-based focus.
3. Observe only real facts.
4. Tone: ${preferences?.encouragementTone || 'gentle'}.

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
