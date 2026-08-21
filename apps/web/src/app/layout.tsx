import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'Janus — OSINT & Zafiyet Tarama',
  description:
    'Web tabanlı, self-host edilebilen, BYOK mantığıyla çalışan modüler OSINT & zafiyet tarama platformu.',
};

// Set the theme class before paint to avoid a flash (follows the system by default).
const themeScript = `try{var t=localStorage.getItem('theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.classList.add(t);}catch(e){document.documentElement.classList.add('dark');}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
