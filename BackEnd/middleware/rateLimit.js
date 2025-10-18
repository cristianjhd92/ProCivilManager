// File: BackEnd/middleware/rateLimit.js                                  // Ruta del archivo en tu backend
// Descripción: Middlewares de limitación de tasa con express-rate-limit.
// Define límite global por IP (toda la API) y límites específicos para /login:
// - Por IP (loginIpLimiter)
// - Por usuario/email (loginUserLimiter)
// Compatible con tus variables .env existentes:
// * RATE_LIMIT_LOGIN_WINDOW_MIN  (minutos)
// * RATE_LIMIT_LOGIN_MAX         (intentos)  → por defecto 3
// y con variables granulares opcionales (*_IP_* y *_USER_*).
// Incluye encabezado Retry-After y encabezados RateLimit-* (draft-7).

const rateLimit = require('express-rate-limit');                        // Importa la librería de rate limiting

// ------------------------- Lectura de variables de entorno -------------------------

// A) Variables “legado” que YA tienes en tu .env (fallback por defecto)
const LOGIN_WINDOW_MIN_LEGACY = Number(process.env.RATE_LIMIT_LOGIN_WINDOW_MIN || 15); // Ventana (min)
const LOGIN_MAX_LEGACY        = Number(process.env.RATE_LIMIT_LOGIN_MAX || 3);         // Máx intentos (3)

// B) Variables granulares (opcionales). Si existen, tienen prioridad.
// Global
const RL_GLOBAL_WINDOW_MS = Number(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS || 60_000); // 60 s
const RL_GLOBAL_MAX       = Number(process.env.RATE_LIMIT_GLOBAL_MAX || 120);          // 120 req/ventana

// Login por IP
const RL_LOGIN_IP_WINDOW_MS = Number(                                                   // Ventana ms para IP
  process.env.RATE_LIMIT_LOGIN_IP_WINDOW_MS || (LOGIN_WINDOW_MIN_LEGACY * 60_000)       // Si no, usa legacy
);
const RL_LOGIN_IP_MAX = Number(                                                         // Máx intentos por IP
  process.env.RATE_LIMIT_LOGIN_IP_MAX || LOGIN_MAX_LEGACY                               // Si no, usa legacy (3)
);

// Login por usuario
const RL_LOGIN_USER_WINDOW_MS = Number(                                                 // Ventana ms por usuario
  process.env.RATE_LIMIT_LOGIN_USER_WINDOW_MS || (LOGIN_WINDOW_MIN_LEGACY * 60_000)     // Si no, usa legacy
);
const RL_LOGIN_USER_MAX = Number(                                                       // Máx intentos por usuario
  process.env.RATE_LIMIT_LOGIN_USER_MAX || LOGIN_MAX_LEGACY                             // Si no, usa legacy (3)
);

// ------------------------------ Utilidades comunes --------------------------------

const WINDOW_MIN = (ms) =>                                                              // Convierte ms → min (aprox)
  Math.max(1, Math.ceil((ms || 60_000) / 60_000));                                      // Asegura mínimo 1

function withRetryAfterHandler(opts = {}) {                                             // Añade handler con Retry-After
  const { windowMs = 60_000 } = opts;                                                   // Ventana por defecto 60 s
  return {
    ...opts,                                                                            // Mantiene el resto de opciones
    standardHeaders: 'draft-7',                                                         // Encabezados RateLimit-* (v7)
    // Si usas express-rate-limit v6, cambia a: standardHeaders: true
    legacyHeaders: false,                                                               // Oculta X-RateLimit-*
    handler: (_req, res) => {                                                           // Maneja exceso (HTTP 429)
      const retrySecs = Math.max(1, Math.ceil(windowMs / 1000));                        // Segundos para reintentar
      res.set('Retry-After', String(retrySecs));                                        // Indica espera sugerida
      return res.status(429).json({                                                     // Respuesta 429
        ok: false,                                                                      // Bandera para el front
        message: `Límite alcanzado. Intenta de nuevo en ~${WINDOW_MIN(windowMs)} min.`, // Mensaje claro
      });                                                                               // Fin respuesta
    },
  };
}

// -------------------------------- Middlewares --------------------------------------

// Límite global por IP para toda la API
const rateLimitGlobal = rateLimit(                                                      // Crea middleware global
  withRetryAfterHandler({
    windowMs: RL_GLOBAL_WINDOW_MS,                                                      // Ventana global ms
    max: RL_GLOBAL_MAX,                                                                 // Máx req/ventana por IP
    message: { ok: false, message: 'Demasiadas solicitudes. Intenta más tarde.' },      // (No se usa con handler)
  })
);

// Límite en /login por IP (agresivo contra ataques desde una misma IP)
const loginIpLimiter = rateLimit(                                                       // Middleware por IP
  withRetryAfterHandler({
    windowMs: RL_LOGIN_IP_WINDOW_MS,                                                    // Ventana ms (o legacy)
    max: RL_LOGIN_IP_MAX,                                                               // Máx intentos (o legacy=3)
    message: { ok: false, message: 'Demasiados intentos de login. Intenta más tarde.'}, // Texto neutro
    keyGenerator: (req) => (req.ip || req.connection?.remoteAddress || 'ip:unknown'),   // Clave=IP real
    // Nota: asegura en tu server: app.set('trust proxy', 1) si usas Nginx/Cloudflare
  })
);

// Límite en /login por USUARIO (email/username) — evita fuerza bruta distribuida
const loginUserLimiter = rateLimit(                                                     // Middleware por usuario
  withRetryAfterHandler({
    windowMs: RL_LOGIN_USER_WINDOW_MS,                                                  // Ventana ms (o legacy)
    max: RL_LOGIN_USER_MAX,                                                             // Máx intentos (o legacy=3)
    message: { ok: false, message: 'Demasiados intentos para este usuario.' },          // Texto neutro
    keyGenerator: (req) => {                                                            // Clave estable por usuario
      const id = (req.body?.email || req.body?.username || 'unknown')                   // Toma email/usuario
        .toString()                                                                      // A string
        .trim()                                                                          // Sin espacios
        .toLowerCase();                                                                  // Normaliza
      return `user:${id}`;                                                               // Namespace para evitar colisiones
    },
  })
);

// -------------------------------- Exportaciones ------------------------------------

module.exports = {                                                                      // Exporta middlewares
  rateLimitGlobal,                                                                       // Límite global (IP)
  loginIpLimiter,                                                                        // Límite en login (IP)
  loginUserLimiter,                                                                      // Límite en login (usuario)
};
