// File: scripts/2025-10-05_smoke_auth.js                                         // Ruta del archivo
// Descripción: Smoke test de AUTH → login → me → refresh → logout → refresh401   // Flujo verificado end-to-end
// - Usa axios + http-cookie-agent + tough-cookie (SIN axios-cookiejar-support)    // Manejo correcto de cookies HttpOnly en Node
// - Reintenta login si hay 429 respetando Retry-After                             // Estable frente a rate limit
// - Agentes sin keep-alive para evitar asserts en Windows                         // Evita UV_HANDLE_CLOSING
// - Limpia usuario/RT directo en la BD (sin modelos del proyecto)                 // Cleanup robusto

'use strict';                                                                      // Enforce modo estricto

const axios = require('axios');                                                    // Cliente HTTP
const { CookieJar } = require('tough-cookie');                                     // Jar de cookies en memoria
const { HttpCookieAgent, HttpsCookieAgent } = require('http-cookie-agent/http');   // Agentes HTTP/HTTPS con soporte de cookies
const crypto = require('crypto');                                                  // Generar sufijos aleatorios (emails únicos)
const mongoose = require('mongoose');                                              // Driver MongoDB (conexión directa)
const path = require('path');                                                      // Utilidad de rutas
const fs = require('fs');                                                          // Sistema de archivos

require('dotenv').config();                                                        // Carga variables de entorno desde .env
if (!process.env.MONGO_URI) {                                                      // Si no hay MONGO_URI en el .env raíz…
  const candidate = path.join(__dirname, '..', 'BackEnd', '.env');                 // …probamos BackEnd/.env como alternativa
  if (fs.existsSync(candidate)) require('dotenv').config({ path: candidate });     // Cargamos ese .env si existe
}

const BASE_URL  = process.env.BASE_URL || 'http://localhost:5000';                 // URL base del backend
const EP_REGISTER = `${BASE_URL}/api/user/register`;                               // Endpoint de registro
const EP_LOGIN    = `${BASE_URL}/api/user/login`;                                  // Endpoint de login
const EP_ME       = `${BASE_URL}/api/user/me`;                                     // Endpoint de perfil (/me)
const EP_REFRESH  = `${BASE_URL}/api/auth/refresh`;                                // Endpoint de refresh token
const EP_LOGOUT   = `${BASE_URL}/api/auth/logout`;                                 // Endpoint de logout

const EMAIL    = `smoke.auth+${Date.now()}_${crypto.randomBytes(3).toString('hex')}@example.com`; // Email único por ejecución
const PASSWORD = 'Sm0keTest!';                                                     // Password de prueba
const FIRST    = 'Smoke';                                                           // Nombre
const LAST     = 'Auth';                                                            // Apellido
const PHONE    = '0000000000';                                                      // Teléfono dummy

const jar = new CookieJar();                                                       // Instancia del jar de cookies
const client = axios.create({                                                      // Crea cliente Axios con agentes cookie-aware
  validateStatus: () => true,                                                      // No lanzar excepción por status HTTP ≠ 2xx
  httpAgent:  new HttpCookieAgent({ cookies: { jar }, keepAlive: false }),         // Agente HTTP con jar (sin keep-alive)
  httpsAgent: new HttpsCookieAgent({ cookies: { jar }, keepAlive: false }),        // Agente HTTPS con jar (sin keep-alive)
  headers: { Accept: 'application/json' },                                         // Aceptamos JSON por defecto
  // Nota: no usar withCredentials aquí; http-cookie-agent gestiona cookies en Node
});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));                         // Pequeña utilidad de espera en ms
const banner = (title) => console.log('\n' + '='.repeat(80) + `\n${title}\n` + '='.repeat(80)); // Pretty banner en consola

// Bypass opcional de rate-limit (solo dev/CI): set SMOKE_BYPASS_RATE=1 y RL_BYPASS_KEY=…        // Cabecera opcional
const bypassHeader = (process.env.SMOKE_BYPASS_RATE === '1' && process.env.RL_BYPASS_KEY)
  ? { 'x-smoke-bypass': process.env.RL_BYPASS_KEY }                                              // Usar header si está configurado
  : {};                                                                                          // Si no, sin headers extra

// Helper POST con reintento ante 429 siguiendo Retry-After --------------------------------------
async function postWith429Retry(url, data, opts = {}, { maxRetries = 3, maxTotalWaitSec = 600 } = {}) {
  let tries = 0;                                                                                 // Contador de reintentos
  let waited = 0;                                                                                // Total acumulado de espera (seg)
  // Bucle de intento → si 429 con Retry-After válido, espera y reintenta hasta límites
  while (true) {                                                                                 // Loop hasta devolver respuesta
    const res = await client.post(url, data, opts);                                              // POST con Axios
    if (res.status !== 429) return res;                                                          // Sale si no es rate-limited
    const retry = parseInt(res.headers['retry-after'] || '60', 10) || 60;                        // Lee Retry-After (seg)
    if (tries >= maxRetries || (waited + retry) > maxTotalWaitSec) return res;                   // Corta si excede límites
    console.log(`⏳ 429 en ${url}. Esperando ${retry}s para reintentar...`);                      // Log de espera
    await sleep(retry * 1000);                                                                    // Espera lo indicado
    waited += retry;                                                                              // Acumula espera
    tries++;                                                                                      // Incrementa reintentos
  }
}

// Limpieza directa en BD por email ---------------------------------------------------------------
async function cleanupUserByEmail(email) {
  if (!process.env.MONGO_URI) {                                                                  // Si no hay MONGO_URI…
    console.warn('⚠️  MONGO_URI no definido. Se omite cleanup.');                                // Aviso y salimos
    return;                                                                                      // Nada que hacer
  }
  await mongoose.connect(process.env.MONGO_URI);                                                 // Conexión a Mongo
  const db = mongoose.connection;                                                                // Referencia a la conexión
  const usersCol = db.collection('users');                                                       // Colección users
  const rtCol    = db.collection('refresh_tokens');                                              // Colección refresh_tokens
  const user = await usersCol.findOne({ email });                                                // Busca usuario por email
  if (user) {                                                                                    // Si existe…
    await rtCol.deleteMany({ user: user._id });                                                  // Borra todos sus refresh tokens
    await usersCol.deleteOne({ _id: user._id });                                                 // Borra el usuario
    console.log(`🧹 Cleanup OK: ${email}`);                                                      // Log de confirmación
  } else {                                                                                       // Si no existe…
    console.log('🧹 Cleanup: usuario no encontrado.');                                           // No hay nada que borrar
  }
  await db.close();                                                                              // Cierra conexión
}

// IIFE principal --------------------------------------------------------------------------------
(async () => {
  banner('SMOKE AUTH TEST (login → me → refresh → logout → refresh 401)');                      // Encabezado

  try {                                                                                          // Bloque principal con manejo de errores
    // 1) Registro --------------------------------------------------------------------------------
    console.log('1) Registrando usuario…');                                                      // Paso 1: register
    const r1 = await client.post(EP_REGISTER,                                                    // POST /register
      { firstName: FIRST, lastName: LAST, email: EMAIL, phone: PHONE, password: PASSWORD },     // Cuerpo de registro
      { headers: bypassHeader },                                                                 // Header opcional de bypass
    );
    if (r1.status !== 201 && r1.status !== 200)                                                  // Acepta 201/200
      throw new Error(`Register ${r1.status} ${JSON.stringify(r1.data)}`);                       // Si no, aborta
    console.log('   ✅ Registro OK');                                                            // Log OK

    // 2) Login -----------------------------------------------------------------------------------
    console.log('2) Login…');                                                                    // Paso 2: login
    const r2 = await postWith429Retry(EP_LOGIN, { email: EMAIL, password: PASSWORD },           // POST /login (con retry 429)
      { headers: bypassHeader });                                                                // Header opcional
    if (r2.status !== 200 || !r2.data?.access_token)                                            // Debe devolver access_token
      throw new Error(`Login ${r2.status} ${JSON.stringify(r2.data)}`);                         // Error si no
    const access1 = r2.data.access_token;                                                       // Guarda el access #1
    console.log('   ✅ Login OK (access y cookie pm_rt)');                                       // Log OK

    // 3) /me -------------------------------------------------------------------------------------
    console.log('3) GET /me con Bearer…');                                                      // Paso 3: GET /me
    const r3 = await client.get(EP_ME, { headers: { Authorization: `Bearer ${access1}` } });    // Bearer access #1
    if (r3.status !== 200 || r3.data?.email !== EMAIL)                                          // Debe responder mi email
      throw new Error(`Me ${r3.status} ${JSON.stringify(r3.data)}`);                            // Error si no
    console.log('   ✅ /me OK');                                                                 // Log OK

    // 4) refresh ---------------------------------------------------------------------------------
    console.log('4) POST /auth/refresh (cookie)…');                                             // Paso 4: refresh
    const r4 = await client.post(EP_REFRESH, {}, { headers: bypassHeader });                    // POST refresh (usa cookie HttpOnly)
    if (r4.status !== 200 || !r4.data?.access_token)                                            // Debe devolver nuevo access
      throw new Error(`Refresh ${r4.status} ${JSON.stringify(r4.data)}`);                       // Error si no
    const access2 = r4.data.access_token;                                                       // Guarda access #2
    console.log(`   ✅ Refresh OK (${access2 !== access1 ? 'rotado' : 'igual (válido)'})`);     // Indica si rotó o no

    // 5) logout ----------------------------------------------------------------------------------
    console.log('5) POST /auth/logout…');                                                       // Paso 5: logout
    const r5 = await client.post(EP_LOGOUT, {}, { headers: bypassHeader });                     // POST logout
    if (r5.status !== 200)                                                                      // Debe ser 200
      throw new Error(`Logout ${r5.status} ${JSON.stringify(r5.data)}`);                        // Error si no
    console.log('   ✅ Logout OK (RT revocado y cookie limpiada)');                             // Log OK

    // 6) refresh tras logout → 401 ---------------------------------------------------------------
    console.log('6) POST /auth/refresh (debe 401)…');                                           // Paso 6: refresh falla
    const r6 = await client.post(EP_REFRESH, {}, { headers: bypassHeader });                    // POST refresh (cookie ya inválida)
    if (r6.status !== 401)                                                                      // Debe 401
      throw new Error(`Refresh post-logout ${r6.status} ${JSON.stringify(r6.data)}`);           // Error si no
    console.log('   ✅ Refresh tras logout devuelve 401');                                       // Log OK

    console.log('\n🎉 Smoke auth COMPLETADO con éxito.');                                       // Éxito total
    process.exitCode = 0;                                                                        // Exit code 0 (ok)
  } catch (err) {                                                                                // Captura error
    console.error('\n❌ Smoke auth FALLÓ:', err?.message || err);                                // Log del motivo
    process.exitCode = 1;                                                                         // Exit code 1 (fail)
  } finally {                                                                                    // Siempre ejecutar cleanup
    banner('CLEANUP (borrar usuario de prueba)');                                                // Encabezado de cleanup
    try { await cleanupUserByEmail(EMAIL); } catch (e) {                                         // Intenta borrar usuario y RT
      console.warn('⚠️  Cleanup con errores:', e?.message || e);                                 // Log de aviso si falla
    }
    await sleep(50);                                                                             // Micro pausa (Windows stability)
  }
})();
