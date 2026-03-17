'use client';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <html lang="es">
      <body style={{ margin: 0, background: '#030712', color: '#f9fafb', fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
        <div style={{ maxWidth: '600px', width: '100%', background: '#111827', border: '1px solid #991b1b', borderRadius: '12px', padding: '2rem' }}>
          <div style={{ color: '#f87171', fontSize: '18px', fontWeight: 'bold', marginBottom: '1rem' }}>
            ⚠ Error capturado
          </div>
          <div style={{ background: '#1f2937', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ color: '#fca5a5', fontSize: '14px', marginBottom: '0.5rem', wordBreak: 'break-all' }}>
              <strong>Mensaje:</strong> {error?.message || '(sin mensaje)'}
            </div>
            {error?.name && (
              <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '0.5rem' }}>
                <strong>Tipo:</strong> {error.name}
              </div>
            )}
            {error?.digest && (
              <div style={{ color: '#6b7280', fontSize: '12px', marginBottom: '0.5rem' }}>
                <strong>Digest:</strong> {error.digest}
              </div>
            )}
            {error?.stack && (
              <pre style={{ color: '#6b7280', fontSize: '11px', overflow: 'auto', maxHeight: '200px', margin: '0.5rem 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {error.stack}
              </pre>
            )}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 1.5rem', cursor: 'pointer', fontSize: '14px' }}
          >
            Recargar
          </button>
        </div>
      </body>
    </html>
  );
}
