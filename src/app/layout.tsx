import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LuxeStudio LeadFlow CRM | Sales Pipeline & Automation',
  description: 'Internal Sales CRM and Lead Pipeline Management for LuxeStudio digital solutions and website agency.',
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
