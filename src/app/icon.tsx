import { ImageResponse } from 'next/og';

export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
          borderRadius: '7px',
          border: '1.5px solid rgba(212, 175, 55, 0.5)',
        }}
      >
        <span
          style={{
            fontSize: '20px',
            fontWeight: 900,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            background: 'linear-gradient(135deg, #FDE68A 0%, #D4AF37 50%, #B8860B 100%)',
            backgroundClip: 'text',
            color: '#D4AF37',
            letterSpacing: '-1px',
            transform: 'translateY(-1px)',
          }}
        >
          L
        </span>
      </div>
    ),
    {
      ...size,
    }
  );
}
