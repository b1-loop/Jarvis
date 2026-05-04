export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

export const GOOGLE_COOKIES = {
  ACCESS_TOKEN: 'gcal_access_token',
  REFRESH_TOKEN: 'gcal_refresh_token',
} as const;

export const GOOGLE_URLS = {
  TOKEN: 'https://oauth2.googleapis.com/token',
  AUTH: 'https://accounts.google.com/o/oauth2/v2/auth',
  CALENDAR_EVENTS: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
  GMAIL_MESSAGES: 'https://gmail.googleapis.com/gmail/v1/users/me/messages',
  GMAIL_SEND: 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
  GMAIL_DRAFTS: 'https://gmail.googleapis.com/gmail/v1/users/me/drafts',
} as const;

export const COOKIE_OPTIONS = {
  ACCESS_TOKEN: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 3600,
    path: '/',
  },
  REFRESH_TOKEN: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  },
} as const;
