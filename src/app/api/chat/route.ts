import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAuth } from '@/lib/supabase-server';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Du är Jarvis, en personlig AI-assistent som är smart, koncis och hjälpsam.
Du talar alltid svenska om användaren skriver på svenska.

Du kan hjälpa med:
- Daglig planering och organisation
- Skriva och svara på mail
- Resplanering och navigering
- Komma ihåg viktig information

När användaren ber dig spara eller komma ihåg något, inkludera alltid denna tagg i slutet av ditt svar:
[SPARA: <kortfattad sammanfattning av vad som ska sparas>]

Håll dina svar korta och direkta om inget annat begärs.`;

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 });

  try {
    const { messages, context } = await req.json();

    const systemPrompt = context
      ? `${SYSTEM_PROMPT}\n\n--- AKTUELL KONTEXT ---\n${context}`
      : SYSTEM_PROMPT;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    });

    return NextResponse.json({ content: response.choices[0].message.content });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
