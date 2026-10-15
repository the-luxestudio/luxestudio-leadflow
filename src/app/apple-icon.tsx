import { ImageResponse } from 'next/og';

export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1E293B 0%, #0A0E17 100%)',
          borderRadius: '40px',
          border: '4px solid rgba(212, 175, 55, 0.45)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: '96px',
            height: '96px',
            borderRadius: '20px',
            border: '2px solid rgba(212, 175, 55, 0.25)',
            transform: 'rotate(45deg)',
          }}
        />
        <span
          style={{
            fontSize: '96px',
            fontWeight: 900,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: '#D4AF37',
            letterSpacing: '-2px',
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
