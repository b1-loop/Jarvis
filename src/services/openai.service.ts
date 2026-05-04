import OpenAI from 'openai';
import { ChatMessage, MailAnalysis } from '@/types';
import { CHAT_SYSTEM_PROMPT, MAIL_SYSTEM_PROMPT } from '@/config/prompts';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function chat(messages: ChatMessage[], context?: string): Promise<string> {
  const systemPrompt = context
    ? `${CHAT_SYSTEM_PROMPT}\n\n--- AKTUELL KONTEXT ---\n${context}`
    : CHAT_SYSTEM_PROMPT;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1024,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
  });

  return response.choices[0].message.content ?? '';
}

export async function analyzeAndDraftMail(mail: string, calendarContext?: string): Promise<MailAnalysis> {
  const calendarSection = calendarContext
    ? `\n\nAnvändarens kommande kalenderhändelser (ta hänsyn till dessa vid tidsbokningar och tillgänglighet):\n${calendarContext}`
    : '';

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1024,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: `${MAIL_SYSTEM_PROMPT}${calendarSection}` },
      { role: 'user', content: `Analysera och svara på detta mail:\n\n${mail}` },
    ],
  });

  const raw = response.choices[0].message.content ?? '{}';
  const parsed = JSON.parse(raw);
  return { summary: parsed.summary ?? '', content: parsed.reply ?? '' };
}
