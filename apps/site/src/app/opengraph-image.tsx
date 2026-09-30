import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';
export const alt = 'Mekong ERP — a mini-ERP built with React 19';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 80,
        background: '#0f1720',
        color: '#e6edf3',
      }}
    >
      <div style={{ fontSize: 30, color: '#4fc3cf', marginBottom: 24 }}>PORTFOLIO PROJECT</div>
      <div style={{ fontSize: 96, fontWeight: 700, lineHeight: 1.05 }}>Mekong ERP</div>
      <div style={{ fontSize: 38, marginTop: 28, color: '#9fb0c0' }}>
        Procure-to-pay, order-to-cash, inventory and accounting
      </div>
      <div style={{ fontSize: 38, color: '#9fb0c0' }}>React 19 on a fully mocked backend</div>
    </div>,
    size,
  );
}
