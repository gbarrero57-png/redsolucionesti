'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AdminError boundary]', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="max-w-md w-full bg-gray-900 border border-red-700/30 rounded-2xl p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={24} className="text-red-400" />
        </div>
        <h2 className="text-base font-semibold text-white mb-2">Error en el panel</h2>
        <p className="text-sm text-gray-400 mb-4">
          {error?.message || 'Se produjo un error inesperado.'}
        </p>
        {error?.digest && (
          <p className="text-xs text-gray-600 mb-4 font-mono">ID: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
        >
          <RefreshCw size={14} /> Reintentar
        </button>
      </div>
    </div>
  );
}
