import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LuxeStudio LeadFlow CRM',
    short_name: 'LeadFlow',
    description: 'High-performance CRM and intelligent lead management system designed for LuxeStudio.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0B0F19',
    theme_color: '#C5A84D',
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
