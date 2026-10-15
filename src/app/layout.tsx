import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#0F172A' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://leads.theluxestudio.in'),
  title: {
    default: 'LuxeStudio LeadFlow | Premium Sales CRM & Pipeline',
    template: '%s | LuxeStudio LeadFlow',
  },
  description: 'Enterprise-grade sales pipeline, automated client follow-ups, and lead conversion platform for LuxeStudio.',
  applicationName: 'LuxeStudio LeadFlow',
  authors: [{ name: 'LuxeStudio Engineering', url: 'https://theluxestudio.in' }],
  creator: 'LuxeStudio',
  publisher: 'LuxeStudio',
  keywords: [
    'LuxeStudio',
    'LeadFlow',
    'CRM',
    'Sales Pipeline',
    'Lead Management',
    'Follow-up Reminders',
    'Sales Automation',
    'Telegram Bot CRM',
  ],
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.webmanifest',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://leads.theluxestudio.in',
    siteName: 'LuxeStudio LeadFlow',
    title: 'LuxeStudio LeadFlow | Premium Sales CRM',
    description: 'Enterprise-grade sales pipeline, automated client follow-ups, and lead conversion platform for LuxeStudio.',
  },
  twitter: {
    card: 'summary',
    title: 'LuxeStudio LeadFlow | Premium Sales CRM',
    description: 'Enterprise-grade sales pipeline and automated client follow-ups for LuxeStudio.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-gold-500/20 selection:text-gold-900">
        {children}
      </body>
    </html>
  );
}
