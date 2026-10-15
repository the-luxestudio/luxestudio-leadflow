import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LuxeStudio LeadFlow CRM',
    short_name: 'LeadFlow',
    description: 'High-performance CRM and intelligent lead management system designed for LuxeStudio.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0B0D12',
    theme_color: '#C5A84D',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
