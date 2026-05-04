export interface CalendarEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  location: string | null;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  from: string;
  subject: string;
  date: string;
  isUnread: boolean;
}

export interface GmailMessageDetail extends GmailMessage {
  to: string;
  replyTo: string;
  body: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface MailAnalysis {
  summary: string;
  content: string;
}

export interface RawEmailParams {
  to: string;
  subject: string;
  body: string;
  from?: string;
  replyTo?: string;
}

export interface Reminder {
  id: string;
  text: string;
  active: boolean;
  triggerAt: 'home' | 'work' | 'both';
  createdAt: string;
  lastTriggered?: string;
}

export interface CreateEventParams {
  title: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  location?: string;
  description?: string;
}
