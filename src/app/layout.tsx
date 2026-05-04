import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jarvis — Din personliga AI-assistent',
  description: 'Smart AI-assistent för planering, minne och kommunikation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv" className="h-full">
      <body className="h-full" suppressHydrationWarning>{children}</body>
    </html>
  );
}
