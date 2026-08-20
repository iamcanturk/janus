import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Janus — OSINT & Zafiyet Tarama',
  description:
    'Web tabanlı, self-host edilebilen, BYOK mantığıyla çalışan modüler OSINT & zafiyet tarama platformu.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
