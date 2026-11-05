import type { Metadata, Viewport } from 'next';
import { ReactQueryProvider } from '@/components/ui/ReactQueryProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'ZENO TECH SOLUTION - Smart Access Card System',
  description:
    'Complete Hotel SaaS Platform for RFID Smart Access Control, ESP32 Fail-Secure Strike Locks, Reception Enrollment & Cloud Telemetry.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0A1931',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Poppins:wght@600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col"><ReactQueryProvider>{children}</ReactQueryProvider></body>
    </html>
  );
}
