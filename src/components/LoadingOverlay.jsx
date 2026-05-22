import React from 'react';

export default function LoadingOverlay({ message }) {
  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 10, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff'
      }}
    >
      <div 
        style={{
          width: '64px',
          height: '64px',
          border: '4px solid rgba(37, 211, 102, 0.2)',
          borderTop: '4px solid var(--accent-green)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '24px'
        }}
      />
      <h2 
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '16px',
          letterSpacing: '1px',
          color: 'var(--accent-green)',
          margin: 0,
          animation: 'pulse 2s infinite'
        }}
      >
        {message || 'PROCESSING...'}
      </h2>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </div>
  );
}
