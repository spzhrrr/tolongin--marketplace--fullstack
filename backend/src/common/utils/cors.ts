/**
 * Helper konfigurasi CORS terpusat.
 * Dipakai oleh HTTP server (main.ts) maupun WebSocket gateway (chat.gateway.ts)
 * agar kebijakan origin konsisten dan tidak memakai wildcard '*' bersama credentials.
 */
export function getCorsOrigins(): (string | RegExp)[] | boolean {
  const isProduction = process.env.NODE_ENV === 'production';
  const corsOrigin = process.env.CORS_ORIGIN;

  // Jika CORS_ORIGIN di-set, pakai daftar dari env (dipisah koma)
  if (corsOrigin) {
    return corsOrigin.split(',').map((origin) => origin.trim());
  }

  if (isProduction) {
    // Default domain produksi
    return [
      'https://tolongin-marketplace-fullstack.vercel.app',
      'https://tolongin.vercel.app',
      'https://tolongin-backend.onrender.com',
      /\.vercel\.app$/,
      /\.onrender\.com$/,
    ];
  }

  // Default development
  return [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:5173',
  ];
}
