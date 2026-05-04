import { GmailMessage, GmailMessageDetail, RawEmailParams } from '@/types';
import { GOOGLE_URLS } from '@/config/google.config';

function decodeBase64Url(str: string): string {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

function extractTextBody(payload: any): string {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    for (const part of payload.parts) {
      const nested = extractTextBody(part);
      if (nested) return nested;
    }
  }
  return payload.body?.data ? decodeBase64Url(payload.body.data) : '';
}

function buildRawEmail({ to, subject, body, from, replyTo }: RawEmailParams): string {
  const lines = [
    from ? `From: ${from}` : '',
    `To: ${to}`,
    `Subject: ${subject}`,
    replyTo ? `In-Reply-To: ${replyTo}` : '',
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    body,
  ].filter(Boolean);

  return Buffer.from(lines.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function fetchInbox(accessToken: string): Promise<GmailMessage[]> {
  const listRes = await fetch(
    `${GOOGLE_URLS.GMAIL_MESSAGES}?maxResults=20&q=in:inbox`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!listRes.ok) {
    const err = await listRes.json();
    throw new Error(err.error?.message || 'Gmail API-fel');
  }

  const listData = await listRes.json();
  const messageIds: { id: string }[] = listData.messages || [];

  const details = await Promise.all(
    messageIds.slice(0, 20).map(async ({ id }) => {
      const res = await fetch(
        `${GOOGLE_URLS.GMAIL_MESSAGES}/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) return null;
      const data = await res.json();
      const headers: { name: string; value: string }[] = data.payload?.headers || [];
      const h = (name: string) => headers.find(x => x.name === name)?.value ?? '';
      return {
        id: data.id as string,
        threadId: data.threadId as string,
        snippet: (data.snippet as string) ?? '',
        from: h('From'),
        subject: h('Subject'),
        date: h('Date'),
        isUnread: ((data.labelIds as string[]) ?? []).includes('UNREAD'),
      };
    })
  );

  return details.filter((m): m is GmailMessage => m !== null);
}

export async function fetchMessage(accessToken: string, id: string): Promise<GmailMessageDetail> {
  const res = await fetch(
    `${GOOGLE_URLS.GMAIL_MESSAGES}/${id}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Gmail API-fel');
  }

  const data = await res.json();
  const headers: { name: string; value: string }[] = data.payload?.headers || [];
  const h = (name: string) => headers.find(x => x.name === name)?.value ?? '';

  return {
    id: data.id,
    threadId: data.threadId,
    from: h('From'),
    to: h('To'),
    subject: h('Subject'),
    date: h('Date'),
    replyTo: h('Reply-To') || h('From'),
    body: extractTextBody(data.payload),
    snippet: data.snippet ?? '',
    isUnread: false,
  };
}

export async function sendEmail(accessToken: string, params: RawEmailParams): Promise<string> {
  const raw = buildRawEmail(params);

  const res = await fetch(GOOGLE_URLS.GMAIL_SEND, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Gmail API-fel');
  }

  const data = await res.json();
  return data.id as string;
}

export async function saveDraft(accessToken: string, params: RawEmailParams): Promise<string> {
  const raw = buildRawEmail(params);

  const res = await fetch(GOOGLE_URLS.GMAIL_DRAFTS, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: { raw } }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Gmail API-fel');
  }

  const data = await res.json();
  return data.id as string;
}
