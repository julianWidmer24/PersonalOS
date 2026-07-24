// Supabase Edge Function: /functions/v1/classify
// Handles AI classification via Claude API.
//
// Deploy: supabase functions deploy classify
// Env vars required (set via: supabase secrets set KEY=value):
//   ANTHROPIC_API_KEY — your Anthropic API key
//   SUPABASE_URL      — auto-injected by Supabase runtime
//   SUPABASE_SERVICE_ROLE_KEY — auto-injected by Supabase runtime

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClassifyRequest {
  type: 'task' | 'meal' | 'journal' | 'meal_plan' | 'area_summary' | 'strategic_query' | 'reprioritize';
  text?: string;
  tasks?: unknown[];
  goals?: unknown[];
  recentJournal?: unknown[];
  area?: string;
  query?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authErr || !user) throw new Error('Unauthorized');

    const body: ClassifyRequest = await req.json();

    let prompt = '';
    let systemPrompt = 'You are a personal AI assistant. Return concise, structured JSON responses.';

    switch (body.type) {
      case 'task':
        systemPrompt = 'You are a task classification assistant.';
        prompt = `Classify this voice/text input and return JSON:
{ "type": "task" | "meal" | "journal", "title": string, "category": string, "priority": 1-5, "detail": string }

Input: "${body.text}"`;
        break;

      case 'meal':
        systemPrompt = 'You are a nutrition estimation assistant.';
        prompt = `Estimate the macros for this meal and return JSON with all four macros:
{ "calories": number, "protein_grams": number, "carbs_grams": number, "fat_grams": number, "confidence": "low" | "medium" | "high" }

Meal description: "${body.text}"`;
        break;

      case 'journal':
        systemPrompt = 'You are a thoughtful journal summarizer.';
        prompt = `Summarize this journal entry in 2-4 sentences, capturing key themes and emotional tone.
Also rate the writer's mood from 1 (very low/restless) to 10 (great/grateful).
Also extract 1-5 short topic tags (single lowercase words or short phrases) describing what the entry is about.

Entry: "${body.text}"

Return JSON: { "summary": string, "mood_score": 1-10, "tags": string[] }`;
        break;

      case 'meal_plan':
        systemPrompt = 'You are a meal planning assistant. Return ONLY valid JSON, no prose.';
        prompt = `Create a one-day meal plan for this request: "${body.text}"

Return JSON exactly in this shape:
{
  "totals": { "kcal": number, "protein": number, "carbs": number, "fat": number },
  "meals": [
    {
      "id": string,
      "slot": "Breakfast" | "Lunch" | "Snack" | "Dinner",
      "name": string,
      "kcal": number,
      "protein": number,
      "ingredients": [{ "name": string, "qty": string }],
      "steps": [string]
    }
  ]
}

Include 3-5 meals covering breakfast, lunch and dinner. Keep steps short (1 sentence each).
Make totals the sum of the meals.`;
        break;

      case 'area_summary':
        systemPrompt = 'You are a strategic advisor reviewing someone\'s life area.';
        prompt = `Review this person's situation in ${body.area}. Tasks: ${JSON.stringify(body.tasks)}.
Query: "${body.query || 'Give a strategic overview.'}".

Summarize the current state, highlight risks or blockers, and recommend the top 1-2 actions.
Return plain text (not JSON).`;
        break;

      case 'strategic_query':
        systemPrompt = 'You are a strategic life advisor with access to someone\'s full context.';
        prompt = `Context:
Tasks: ${JSON.stringify(body.tasks)}
Goals: ${JSON.stringify(body.goals)}
Recent journal summaries: ${JSON.stringify(body.recentJournal)}

Question: "${body.query}"

Provide a thoughtful, actionable response in 3-5 sentences.`;
        break;

      case 'reprioritize':
        systemPrompt = 'You are a task prioritization assistant.';
        prompt = `Re-score the priority (1=lowest, 5=highest) for each task based on urgency, importance, and category.
Tasks: ${JSON.stringify(body.tasks)}

Return JSON array: [{ "id": string, "priority_score": 1-5 }]`;
        break;

      default:
        throw new Error(`Unknown type: ${(body as { type: string }).type}`);
    }

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: body.type === 'meal_plan' ? 4096 : 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      throw new Error(`Claude API error: ${err}`);
    }

    const claudeData = await claudeRes.json();
    const content = claudeData.content[0].text;

    // Extract JSON even when Claude wraps it in markdown fences or preamble
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/[{[][\s\S]*[}\]]/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch { parsed = { text: content }; }
      } else {
        parsed = { text: content };
      }
    }

    return new Response(JSON.stringify({ ok: true, result: parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
