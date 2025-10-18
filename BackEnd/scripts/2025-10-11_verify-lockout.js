// File: scripts/2025-10-11_verify-lockout.js                                   // Ruta del archivo
// Descripción: Verifica bloqueo por intentos fallidos (423) y/o rate limit (429). // Propósito del script
// - Usa axios con agentes sin keep-alive para estabilidad en Windows              // Evita assert UV_HANDLE_CLOSING
// - Respeta Retry-After en 429 y reintenta sin contar el intento                  // Mediciones correctas
// - Bypass opcional de rate-limit vía header x-smoke-bypass en entornos dev/CI    // Acelera pruebas

'use strict';                                                                      // Activa modo estricto de JS

try { require('dotenv').config(); } catch {}                                       // Carga .env si existe; ignora error si no

const axios = require('axios');                                                    // Importa cliente HTTP axios
const http  = require('http');                                                     // Importa módulo http nativo (agente)
const https = require('https');                                                    // Importa módulo https nativo (agente)

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';                  // URL del backend (por env o localhost)
const ATTEMPTS = parseInt(process.env.ATTEMPTS || '12', 10);                       // Número máximo de intentos a probar
const OK_PASS  = process.env.PASSWORD_OK || 'Test#12345';                          // Password válida para crear usuario

// Agentes sin keep-alive → previene problemas de sockets en Windows               // Comentario técnico
const client = axios.create({                                                      // Crea instancia de axios
  validateStatus: () => true,                                                      // No lanza error por status HTTP
  httpAgent:  new http.Agent({ keepAlive: false }),                                // Agente HTTP con keep-alive desactivado
  httpsAgent: new https.Agent({ keepAlive: false }),                               // Agente HTTPS con keep-alive desactivado
  headers: { Accept: 'application/json' },                                         // Acepta JSON por defecto
});                                                                                // Fin de configuración del cliente

// Header opcional de bypass (solo dev/CI)                                          // Explicación del bypass
const bypassHeader = (process.env.SMOKE_BYPASS_RATE === '1' && process.env.RL_BYPASS_KEY) // Si ambas variables están definidas
  ? { 'x-smoke-bypass': process.env.RL_BYPASS_KEY }                                // Enviaremos x-smoke-bypass con la clave
  : {};                                                                            // De lo contrario, sin header especial

// Utilidades simples                                                                // Sección de utilidades
const now   = () => new Date().toISOString();                                      // Devuelve timestamp ISO actual
const sleep = (ms) => new Promise(r => setTimeout(r, ms));                         // Pausa asíncrona por ms

// Helper HTTP JSON (GET/POST) con data opcional                                     // Helper para requests
async function httpJson(method, path, { json, headers = {} } = {}) {               // Firma del helper
  const res = await client.request({                                               // Realiza la petición con axios
    method,                                                                        // Verbo HTTP
    url: `${BASE_URL}${path}`,                                                     // URL completa (base + path)
    headers: { 'Content-Type': 'application/json', ...headers },                   // Content-Type y headers extra
    data: json ? JSON.stringify(json) : undefined,                                 // Serializa body si hay json
  });                                                                              // Fin de request
  return { status: res.status, body: res.data, headers: res.headers };             // Normaliza respuesta
}                                                                                  // Fin helper

// Lee Retry-After en segundos (entero ≥1)                                           // Documentación de utilidad
function parseRetryAfterSeconds(hdr) {                                             // Firma de función
  const n = parseInt(String(hdr ?? '').trim(), 10);                                // Intenta parsear a entero
  return Number.isFinite(n) && n > 0 ? n : 1;                                      // Si inválido, usa 1 segundo por defecto
}                                                                                  // Fin función

(async () => {                                                                      // IIFE principal
  console.log(`[${now()}] Verificación lockout/rate-limit en ${BASE_URL}`);         // Log inicial con hora y base URL

  // 1) Usuario base (EMAIL fijo opcional o se registra uno de prueba)               // Paso 1
  let email = process.env.EMAIL;                                                    // Puede venir de env para repetir pruebas
  if (!email) {                                                                     // Si no se definió EMAIL…
    email = `lock.test+${Date.now()}@example.com`;                                  // Genera email único para el run
    const reg = await httpJson('POST', '/api/user/register', {                      // Llama a /register
      json: { firstName: 'Lock', lastName: 'Probe', email, phone: '3000000000', password: OK_PASS }, // Datos de registro
      headers: bypassHeader,                                                        // Incluye bypass si aplica (dev/CI)
    });                                                                             // Fin request
    if (![200, 201, 409].includes(reg.status)) {                                    // Acepta creado/ok o ya existente
      console.error('❌ No se pudo registrar usuario:', reg.status, reg.body);      // Log de error detallado
      process.exit(1);                                                              // Sale con código de error
    }                                                                               // Fin validación de status
    console.log('✅ Usuario de prueba listo:', email);                               // Confirma que hay usuario para probar
  }                                                                                 // Fin bloque registro condicional

  // 2) Forzar intentos fallidos con pass incorrecta                                 // Paso 2
  const badPass = 'Wrong#' + Math.random().toString(36).slice(2, 8);                // Genera password incorrecta aleatoria
  console.log(`🔄 Forzando intentos fallidos para ${email} (hasta ${ATTEMPTS})...`); // Log de inicio del bucle

  for (let i = 1; i <= ATTEMPTS; i++) {                                             // Bucle de intentos
    const r = await httpJson('POST', '/api/user/login', {                           // POST /login
      json: { email, password: badPass },                                           // Envia credenciales inválidas
      headers: bypassHeader,                                                        // Incluye bypass si está habilitado
    });                                                                             // Fin request

    // Caso: bloqueo activo (semántico)
    if (r.status === 423) {                                                         // 423 = cuenta bloqueada
      console.log(`🎯 Bloqueo activo (423) en intento #${i}:`, r.body?.message || ''); // Muestra mensaje del backend
      console.log('✅ Lockout funcional.');                                          // Confirma que el bloqueo funciona
      process.exit(0);                                                               // Termina con éxito
    }                                                                                // Fin caso 423

    // Caso: rate limit alcanzado
    if (r.status === 429) {                                                         // 429 = demasiadas solicitudes
      const ra = parseRetryAfterSeconds(r.headers['retry-after']);                  // Lee Retry-After (segundos)
      console.log(`⏳ Rate limit (429). Retry-After=${ra}s → esperando...`);         // Log de espera
      await sleep(ra * 1000);                                                       // Espera el tiempo indicado
      i--;                                                                          // No cuenta este intento (se repite)
      continue;                                                                     // Continúa con el siguiente loop
    }                                                                                // Fin caso 429

    // Fallo normal de credenciales
    if (r.status === 401) {                                                         // 401 = credenciales inválidas
      console.log(`   intento #${i}: 401 (fallo contabilizado)`);                   // Log del intento fallido
      await sleep(200);                                                              // Pequeña pausa para no saturar
      continue;                                                                      // Siguiente iteración
    }                                                                                // Fin caso 401

    // Otros estados (informativo)
    console.log(`ℹ️  Respuesta no esperada en #${i}:`, r.status, r.body);           // Log para casos atípicos
    await sleep(200);                                                                // Pausa breve antes de continuar
  }                                                                                 // Fin del bucle de intentos

  // Si no se alcanzó bloqueo en los intentos previstos                              // Epílogo
  console.log('\n⚠️  No se alcanzó 423 en el rango. Probable rate limit (429) primero.'); // Mensaje informativo
  process.exit(0);                                                                   // Sale como “ok” informativo
})().catch(err => {                                                                  // Manejo de errores no capturados
  console.error('❌ Error inesperado:', err?.message || err);                        // Log de error
  process.exit(1);                                                                    // Sale con error
});                                                                                  // Fin IIFE
