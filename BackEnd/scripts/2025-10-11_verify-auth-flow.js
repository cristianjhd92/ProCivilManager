// File: scripts/2025-10-11_verify-auth-flow.js                                   // Ruta del archivo
// Descripción: Prueba punta-a-punta del flujo Access JWT + Refresh                // Propósito
// - Registra usuario → Login (access + refresh cookie)                            // Paso 1-2
// - /me con Bearer (200)                                                          // Paso 3
// - /auth/refresh rota cookie + nuevo access                                      // Paso 4
// - Refresh con cookie vieja (401)                                                // Paso 5
// - /auth/logout invalida refresh actual (401 luego)                              // Paso 6
// - Segundo login + /auth/logout-all invalida todas (401 luego)                   // Paso 7
// - Reintento de login ante 429 respetando Retry-After                            // Anti flakiness
// - Agentes sin keep-alive (Windows fix)                                          // Estabilidad

'use strict';                                                                      // Modo estricto

require('dotenv').config();                                                        // Carga .env si existe

const axios = require('axios');                                                    // HTTP client
const http = require('http');                                                      // Agente HTTP
const https = require('https');                                                    // Agente HTTPS

const BASE_URL    = process.env.BASE_URL || 'http://localhost:5000';              // URL base backend
const COOKIE_NAME = process.env.REFRESH_TOKEN_COOKIE || 'pm_rt';                  // Nombre de cookie RT

// Cliente axios básico (sin jar; manejaremos cookies manualmente en headers)      // Cliente axios
const client = axios.create({
  validateStatus: () => true,                                                     // Manejo manual status
  httpAgent:  new http.Agent({ keepAlive: false }),                                // Sin keep-alive (Win fix)
  httpsAgent: new https.Agent({ keepAlive: false }),                               // Sin keep-alive (Win fix)
});

// Bypass opcional de rate-limit (dev/CI): exporta SMOKE_BYPASS_RATE=1 + RL_BYPASS_KEY // Bypass opcional
const bypassHeader = (process.env.SMOKE_BYPASS_RATE === '1' && process.env.RL_BYPASS_KEY)
  ? { 'x-smoke-bypass': process.env.RL_BYPASS_KEY } : {};

// Utilidades varias                                                                  // Utils
const now = () => new Date().toISOString();                                         // Timestamp ISO
const sleep = (ms) => new Promise(r => setTimeout(r, ms));                          // Pausa

// Helper POST con reintentos ante 429                                                // Retry 429
async function postWith429Retry(path, data, { headers = {}, cookie } = {}, { maxRetries = 3, maxTotalWaitSec = 600 } = {}) {
  let tries = 0, waited = 0;                                                        // Contadores
  while (true) {                                                                     // Bucle
    const res = await client.post(`${BASE_URL}${path}`, data, {                      // POST
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers },
    });
    if (res.status !== 429) return res;                                              // Devuelve si no es 429
    const retry = parseInt(res.headers['retry-after'] || '60', 10);                  // Retry-After
    if (tries >= maxRetries || (waited + retry) > maxTotalWaitSec) return res;       // Corta si excede
    console.log(`⏳ 429 en ${path}. Esperando ${retry}s…`);                           // Log
    await sleep(retry * 1000);                                                       // Espera
    waited += retry; tries++;                                                        // Acumula
  }
}

// Helper genérico HTTP (GET/POST sin retry, con cookie opcional)                     // Helper HTTP
async function httpJson(method, path, { json, headers = {}, cookie } = {}) {
  const res = await client.request({                                                 // Request axios
    method, url: `${BASE_URL}${path}`, headers: { Accept: 'application/json', ...(json ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
    data: json ? JSON.stringify(json) : undefined,                                   // Body JSON
  });
  return { status: res.status, body: res.data, headers: res.headers };               // Respuesta normalizada
}

// Normaliza Set-Cookie de axios (array o string)                                     // Cookies
function getSetCookieArray(headers) {
  const sc = headers['set-cookie'];                                                  // Lee header
  if (!sc) return [];                                                                // Vacío
  return Array.isArray(sc) ? sc : [sc];                                              // A array
}

// Extrae "name=value" de la cookie deseada                                           // Buscar cookie
function findCookie(setCookieArr, name) {
  const lname = String(name).toLowerCase();                                          // Minúsculas
  for (const sc of setCookieArr) {                                                   // Recorre cookies
    const first = String(sc).split(';')[0].trim();                                   // Toma "name=value"
    if (first.toLowerCase().startsWith(`${lname}=`)) return first;                   // Coincidencia
  }
  return null;                                                                        // No encontrada
}

(async () => {                                                                        // IIFE principal
  console.log(`[${now()}] Iniciando verificación AUTH en ${BASE_URL}`);               // Log de inicio

  const rnd = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;                      // Sufijo random
  const email = `auth.test+${rnd}@example.com`;                                       // Email prueba
  const password = 'Test#12345';                                                      // Password prueba

  // 1) Registro ------------------------------------------------------------------ //
  const register = await httpJson('POST', '/api/user/register', {                      // POST register
    json: { firstName: 'Auth', lastName: 'Probe', email, phone: '3000000000', password }, // Body
    headers: bypassHeader,                                                             // Bypass opcional
  });
  if (![200,201,409].includes(register.status)) {                                      // Acepta 201/200/409
    console.error(`❌ register → ${register.status} ${JSON.stringify(register.body)}`); // Error
    process.exit(1);                                                                    // Exit
  }
  if (register.status === 409) console.log('ℹ️  Email ya registrado (OK en re-ejecuciones)'); // Info

  // 2) Login → access + refresh cookie ------------------------------------------ //
  const login = await postWith429Retry('/api/user/login', { email, password },         // POST login (retry)
    { headers: bypassHeader });                                                         // Bypass opcional
  if (login.status !== 200) {                                                           // Debe 200
    console.error(`❌ login ${login.status} ${JSON.stringify(login.data || login.body)}`); // Error
    process.exit(1);                                                                    // Exit
  }
  const access1 = (login.data || login.body)?.access_token;                             // JWT acceso
  if (!access1) { console.error('❌ Falta access_token en login'); process.exit(1); }    // Guard
  const rtCookie1 = findCookie(getSetCookieArray(login.headers), COOKIE_NAME);          // Cookie refresh
  if (!rtCookie1) { console.error(`❌ No llegó cookie de refresh (${COOKIE_NAME})`); process.exit(1); } // Guard
  console.log('✅ Login OK (Bearer + refresh cookie)');                                  // OK

  // 3) GET /me con Bearer ------------------------------------------------------- //
  const me = await httpJson('GET', '/api/user/me', { headers: { Authorization: `Bearer ${access1}` } }); // GET me
  if (me.status !== 200) { console.error(`❌ /me ${me.status} ${JSON.stringify(me.body)}`); process.exit(1); } // Valida
  console.log('✅ /me con Bearer OK');                                                // OK

  // 4) Refresh (rota cookie + nuevo access) ------------------------------------- //
  const r1 = await httpJson('POST', '/api/auth/refresh', { cookie: rtCookie1 });       // POST refresh
  if (r1.status !== 200) { console.error(`❌ refresh ${r1.status} ${JSON.stringify(r1.body)}`); process.exit(1); } // Valida
  const access2 = r1.body?.access_token;                                               // Nuevo JWT
  if (!access2) { console.error('❌ Falta access_token en refresh'); process.exit(1); } // Guard
  const rtCookie2 = findCookie(getSetCookieArray(r1.headers), COOKIE_NAME);            // Nueva cookie
  if (!rtCookie2) { console.error('❌ No llegó cookie de refresh en refresh'); process.exit(1); } // Guard
  if (rtCookie2 === rtCookie1) { console.error('❌ Rotación no cambió el valor del refresh'); process.exit(1); } // Debe cambiar
  console.log('✅ Refresh rotó cookie correctamente');                                  // OK

  // 5) Refresh con cookie vieja → 401 ------------------------------------------- //
  const rOld = await httpJson('POST', '/api/auth/refresh', { cookie: rtCookie1 });     // Reintenta con cookie vieja
  if (rOld.status !== 401) { console.error(`❌ Refresh con cookie vieja dio ${rOld.status}`); process.exit(1); } // Valida
  console.log('✅ Cookie anterior inválida (401)');                                     // OK

  // 6) Logout → invalida refresh actual ---------------------------------------- //
  const logout = await httpJson('POST', '/api/auth/logout', { cookie: rtCookie2 });    // POST logout
  if (logout.status !== 200) { console.error(`❌ logout ${logout.status} ${JSON.stringify(logout.body)}`); process.exit(1); } // Valida
  const rAfterLogout = await httpJson('POST', '/api/auth/refresh', { cookie: rtCookie2 }); // Refresh luego de logout
  if (rAfterLogout.status !== 401) { console.error(`❌ Refresh tras logout dio ${rAfterLogout.status}`); process.exit(1); }   // Debe 401
  console.log('✅ Logout invalida refresh actual');                                     // OK

  // 7) Segundo login + logout-all ---------------------------------------------- //
  const login2 = await postWith429Retry('/api/user/login', { email, password }, { headers: bypassHeader }); // Segundo login
  if (login2.status !== 200) { console.error(`❌ segundo login ${login2.status}`); process.exit(1); }       // Valida
  const access3 = (login2.data || login2.body)?.access_token;                            // Nuevo JWT
  const rtCookie3 = findCookie(getSetCookieArray(login2.headers), COOKIE_NAME);          // Nueva cookie
  if (!access3 || !rtCookie3) { console.error('❌ Faltan access o refresh en segundo login'); process.exit(1); } // Guard

  const logoutAll = await httpJson('POST', '/api/auth/logout-all', {                     // POST logout-all
    headers: { Authorization: `Bearer ${access3}` },                                     // Requiere JWT
  });
  if (logoutAll.status !== 200) { console.error(`❌ logout-all ${logoutAll.status} ${JSON.stringify(logoutAll.body)}`); process.exit(1); } // Valida

  const rAfterAll = await httpJson('POST', '/api/auth/refresh', { cookie: rtCookie3 });  // Refresh tras logout-all
  if (rAfterAll.status !== 401) { console.error(`❌ Refresh tras logout-all dio ${rAfterAll.status}`); process.exit(1); } // Debe 401
  console.log('✅ Logout-all invalida todas las sesiones');                               // OK

  console.log('\n🎉 Todo OK. Flujo Access + Refresh verificado.');                       // Final feliz
  process.exit(0);                                                                        // Exit 0
})().catch(err => {                                                                       // Catch global
  console.error('❌ Error inesperado:', err?.message || err);                             // Log error
  process.exit(1);                                                                         // Exit 1
});
