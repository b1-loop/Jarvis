import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAuth } from '@/lib/supabase-server';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 });

  try {
    const { mail, calendarContext } = await req.json();

    const calendarSection = calendarContext
      ? `\n\nAnvändarens kommande kalenderhändelser (ta hänsyn till dessa vid tidsbokningar och tillgänglighet):\n${calendarContext}`
      : '';

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1024,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Du är Jarvis, en personlig AI-assistent. Analysera inkommande mail och returnera alltid ett JSON-objekt med exakt två fält:
- "summary": En kort sammanfattning (1-3 meningar) på svenska av vad mailet handlar om och vad som efterfrågas.
- "reply": Ett fullständigt, professionellt och vänligt mailsvar på svenska. Inga platshållare — skriv ett klart svar direkt.${calendarSection}`,
        },
        {
          role: 'user',
          content: `Analysera och svara på detta mail:\n\n${mail}`,
        },
      ],
    });

    const raw = response.choices[0].message.content ?? '{}';
    const parsed = JSON.parse(raw);

    return NextResponse.json({
      summary: parsed.summary ?? '',
      content: parsed.reply ?? '',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
