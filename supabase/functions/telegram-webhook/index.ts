// Supabase Edge Function: /functions/v1/telegram-webhook
// Receives Telegram bot webhook POSTs. Queues events immediately (responds 200
// within 5s), then processes async to avoid Telegram retry storms.
//
// Deploy: supabase functions deploy telegram-webhook
// Register webhook: https://api.telegram.org/bot<TOKEN>/setWebhook?url=<FUNCTION_URL>
//
// Env vars required (set via: supabase secrets set KEY=value):
//   TELEGRAM_BOT_TOKEN    — from BotFather
//   TELEGRAM_ALLOWED_CHAT — your personal chat ID (security gate)
//   GROQ_API_KEY          — for Whisper transcription (free at console.groq.com)
//   ANTHROPIC_API_KEY     — for Claude classification
//   SUPABASE_URL          — auto-injected
//   SUPABASE_SERVICE_ROLE_KEY — auto-injected

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Supabase/Deno edge runtime global: keeps the isolate alive until the given
// promise settles, even after the HTTP response has been returned.
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

const corsHeaders = { 'Access-Control-Allow-Origin': '*' };

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    text?: string;
    voice?: { file_id: string };
    photo?: Array<{ file_id: string }>;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Always respond 200 immediately to prevent Telegram retries
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    const update: TelegramUpdate = await req.json();
    const msg = update.message;
    if (!msg) return new Response('ok');

    const allowedChat = Deno.env.get('TELEGRAM_ALLOWED_CHAT');
    if (allowedChat && String(msg.chat.id) !== allowedChat) {
      return new Response('ok'); // silently ignore unauthorized chats
    }

    // Queue the event immediately
    const { data: event } = await supabase.from('telegram_events').insert({
      telegram_chat_id: msg.chat.id,
      message_text:     msg.text ?? null,
      audio_file_id:    msg.voice?.file_id ?? null,
      photo_file_id:    msg.photo?.at(-1)?.file_id ?? null,
      processed:        false,
    }).select().single();

    // Process async in the background. EdgeRuntime.waitUntil keeps the isolate
    // alive until processEvent finishes — without it the runtime tears the
    // function down the instant we return 200, killing the transcription /
    // classification / insert before the task ever lands in the DB.
    if (event) {
      EdgeRuntime.waitUntil(processEvent(supabase, event.id, msg).catch(console.error));
    }

  } catch (err) {
    console.error('Webhook error:', err);
  }

  return new Response('ok', { headers: corsHeaders });
});

const VALID_CATEGORIES = ['academic','internship','health','finance','personal','content','networking'];
const CATEGORY_MAP: Record<string, string> = {
  school: 'academic', course: 'academic', study: 'academic', class: 'academic', homework: 'academic',
  work: 'internship', job: 'internship', career: 'internship', professional: 'internship',
  fitness: 'health', gym: 'health', medical: 'health', wellness: 'health',
  money: 'finance', budget: 'finance', bank: 'finance', expense: 'finance',
  social: 'networking', meeting: 'networking', connect: 'networking',
  chore: 'personal', home: 'personal', errand: 'personal', family: 'personal',
  creative: 'content', media: 'content', writing: 'content', video: 'content',
};

function normalizeCategory(raw: string): string {
  const lower = (raw ?? '').toLowerCase();
  if (VALID_CATEGORIES.includes(lower)) return lower;
  for (const [key, val] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) return val;
  }
  return 'personal';
}

async function processEvent(
  supabase: ReturnType<typeof createClient>,
  eventId: string,
  msg: NonNullable<TelegramUpdate['message']>,
) {
  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const groqKey = Deno.env.get('GROQ_API_KEY');
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    const userId = Deno.env.get('PERSONAL_USER_ID');
    console.log('env check:', {
      hasBotToken: !!botToken,
      hasGroqKey: !!groqKey,
      hasAnthropicKey: !!anthropicKey,
      hasUserId: !!userId,
    });
    if (!botToken || !groqKey || !anthropicKey || !userId) throw new Error('Missing env vars');

    let text = msg.text ?? '';

    // ── Step 1: Transcribe audio via Whisper ─────────────────
    if (msg.voice?.file_id) {
      const fileRes = await fetch(
        `https://api.telegram.org/bot${botToken}/getFile?file_id=${msg.voice.file_id}`,
      );
      const { result } = await fileRes.json();
      const audioRes = await fetch(
        `https://api.telegram.org/file/bot${botToken}/${result.file_path}`,
      );
      const audioBlob = await audioRes.blob();

      const form = new FormData();
      form.append('file', audioBlob, 'voice.ogg');
      form.append('model', 'whisper-large-v3');
      // Groq offers free Whisper transcription — same API shape as OpenAI
      const whisperRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqKey}` },
        body: form,
      });
      const whisperData = await whisperRes.json();
      text = whisperData.text ?? '';
    }

    if (!text && !msg.photo) return;

    // ── Step 2: Classify via Claude ───────────────────────────
    // Single call: classify the input AND, in the same response, return the
    // type-specific fields (meal macros / journal summary+mood+tags) so we
    // never need a second round-trip to Claude.
    let classifyPrompt = `Classify this voice/text input and return JSON.
Always include: "type" ("task" | "meal" | "journal"), "title", "detail".
- If type is "task": also include "category" (string) and "priority" (1-5).
- If type is "meal": also estimate macros and include "calories" (number), "protein_grams" (number), "carbs_grams" (number), "fat_grams" (number).
Journal entries need no extra fields — the raw transcript is stored exactly as written.

Input: "${text}"`;

    if (msg.photo) {
      const fileRes = await fetch(
        `https://api.telegram.org/bot${botToken}/getFile?file_id=${msg.photo.at(-1)?.file_id}`,
      );
      const { result } = await fileRes.json();
      const imgRes = await fetch(
        `https://api.telegram.org/file/bot${botToken}/${result.file_path}`,
      );
      const imgBuf = await imgRes.arrayBuffer();
      const imgBase64 = btoa(String.fromCharCode(...new Uint8Array(imgBuf)));

      classifyPrompt = `Estimate calories and macros for the food in this photo. Return JSON with all four macros:
{ "calories": number, "protein_grams": number, "carbs_grams": number, "fat_grams": number, "confidence": "low"|"medium"|"high", "description": string }`;

      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 512,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imgBase64 } },
              { type: 'text', text: classifyPrompt },
            ],
          }],
        }),
      });
      const claudeBody = await claudeRes.json();
      if (!claudeRes.ok) throw new Error(`Claude error (photo): ${JSON.stringify(claudeBody)}`);
      const photoText = claudeBody.content[0].text;
      const photoJsonMatch = photoText.match(/\{[\s\S]*\}/);
      if (!photoJsonMatch) throw new Error(`No JSON found in photo Claude response: ${photoText}`);
      const macros = JSON.parse(photoJsonMatch[0]);
      await supabase.from('meals').insert({
        user_id: userId,
        description: macros.description ?? 'Photo meal',
        calories_estimate: macros.calories,
        protein_estimate: macros.protein_grams,
        carbs_grams: macros.carbs_grams,
        fat_grams: macros.fat_grams,
        source: 'photo',
      });
      await supabase.from('telegram_events').update({ processed: true }).eq('id', eventId);
      return;
    }

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        messages: [{ role: 'user', content: classifyPrompt }],
      }),
    });
    const claudeBody = await claudeRes.json();
    if (!claudeRes.ok) throw new Error(`Claude error: ${JSON.stringify(claudeBody)}`);
    // Extract the JSON object from Claude's response, ignoring any preamble or markdown fences
    const fullText = claudeBody.content[0].text;
    const jsonMatch = fullText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`No JSON found in Claude response: ${fullText}`);
    const classified = JSON.parse(jsonMatch[0]);
    console.log('classified:', JSON.stringify(classified));
    // Normalize so casing/whitespace from Claude can't cause a silent miss.
    const entryType = String(classified.type ?? '').toLowerCase().trim();

    // ── Step 3: Write to correct table ────────────────────────
    if (entryType === 'task') {
      const { error: taskErr } = await supabase.from('tasks').insert({
        user_id: userId,
        title:    classified.title,
        notes:    classified.detail,
        category: normalizeCategory(classified.category),
        priority: classified.priority,
        status:   'today',
      });
      if (taskErr) throw new Error(`tasks insert error: ${JSON.stringify(taskErr)}`);
      console.log('task inserted OK:', classified.title);
    } else if (entryType === 'meal') {
      // Macros come back in the same classification response (see Step 2 prompt).
      const round = (v: unknown) => typeof v === 'number' ? Math.round(v) : null;
      const { error: mealErr } = await supabase.from('meals').insert({
        user_id:           userId,
        description:       classified.title,
        calories_estimate: round(classified.calories),
        protein_estimate:  round(classified.protein_grams),
        carbs_grams:       round(classified.carbs_grams),
        fat_grams:         round(classified.fat_grams),
        source:            msg.voice ? 'telegram' : 'manual',
      });
      if (mealErr) throw new Error(`meals insert error: ${JSON.stringify(mealErr)}`);
    } else {
      // Journal — and the default for any unrecognized classification, so
      // free-form personal text is never silently dropped.
      if (entryType !== 'journal') {
        console.warn('Unrecognized classification type, defaulting to journal:', entryType);
      }
      // Store the raw transcript exactly as spoken/typed — no Claude summary,
      // mood, or tags. The dashboard displays this natural-language text as-is.
      // journal_entries has UNIQUE (user_id, entry_date) — append to today's
      // entry if one exists rather than failing the insert.
      const today = new Date().toISOString().slice(0, 10);
      try {
        const { data: existing, error: selErr } = await supabase
          .from('journal_entries')
          .select('id, transcript')
          .eq('user_id', userId)
          .eq('entry_date', today)
          .maybeSingle();
        if (selErr) throw new Error(`journal select error: ${JSON.stringify(selErr)}`);
        if (existing) {
          const merged = existing.transcript ? `${existing.transcript}\n\n${text}` : text;
          console.log("Attempting journal insert:", { entry_date: today, transcript: merged });
          // Supabase returns errors on the result object — they are NOT thrown,
          // so the surrounding try/catch won't see them unless we check explicitly.
          const { error: updateError } = await supabase
            .from("journal_entries")
            .update({ transcript: merged })
            .eq("id", existing.id);
          if (updateError) {
            console.error("Journal update failed:", JSON.stringify(updateError));
            throw new Error(updateError.message);
          }
        } else {
          console.log("Attempting journal insert:", { entry_date: today, transcript: text });
          const { error: insertError } = await supabase
            .from("journal_entries")
            .insert({
              user_id:    userId,
              transcript: text,
              entry_date: today,
            });
          if (insertError) {
            console.error("Journal insert failed:", JSON.stringify(insertError));
            throw new Error(insertError.message);
          }
        }
      } catch (err) {
        console.error("Journal insert failed:", JSON.stringify(err));
        throw err;
      }
    }

    await supabase.from('telegram_events').update({ processed: true }).eq('id', eventId);

  } catch (err) {
    console.error('processEvent error:', err);
  }
}
