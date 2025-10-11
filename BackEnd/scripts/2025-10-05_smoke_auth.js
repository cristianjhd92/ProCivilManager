// File: scripts/2025-10-05_smoke_auth.js                                     // Ruta del archivo
// Descripción: Smoke test del flujo login → me → refresh → logout → refresh401 // Propósito
// - NO importa modelos del proyecto (evita problemas de rutas)                  // Independencia del layout
// - Usa colecciones 'users' y 'refresh_tokens' directamente para cleanup         // Limpieza robusta
// - Maneja cookie HttpOnly (refresh) con axios + tough-cookie                    // Cookies

/* =========================
 * Dependencias
 * ========================= */
const axios = require('axios');                                                  // Cliente HTTP
const { wrapper } = require('axios-cookiejar-support');                          // Soporte de cookies en axios
const { CookieJar } = require('tough-cookie');                                   // Jar para cookies HttpOnly
const crypto = require('crypto');                                                // Para email único
const mongoose = require('mongoose');                                            // Conexión y colecciones directas
const path = require('path');                                                    // Utilidades de ruta
const fs = require('fs');                                                        // Comprobar existencia de archivos

/* =========================
 * Carga de .env (robusta)
 * ========================= */
// 1) Intenta cargar .env del directorio actual                                  // Caso: backend/.env
require('dotenv').config();                                                      // Primer intento (por si está junto al script/servidor)
// 2) Si no hay MONGO_URI, prueba en BackEnd/.env                                 // Caso: backend/BackEnd/.env
if (!process.env.MONGO_URI) {                                                    // Si no se cargó aún
  const candidate = path.join(__dirname, '..', 'BackEnd', '.env');               // Ruta alternativa
  if (fs.existsSync(candidate)) {                                                // Si existe
    require('dotenv').config({ path: candidate });                               // Carga ese .env
  }
}

/* =========================
 * Config del test
 * ========================= */
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';                // URL del backend en dev
const EP_REGISTER = `${BASE_URL}/api/user/register`;                             // Endpoint: registro
const EP_LOGIN    = `${BASE_URL}/api/user/login`;                                // Endpoint: login (access + cookie)
const EP_ME       = `${BASE_URL}/api/user/me`;                                   // Endpoint: perfil (JWT)
const EP_REFRESH  = `${BASE_URL}/api/auth/refresh`;                              // Endpoint: refresh (cookie)
const EP_LOGOUT   = `${BASE_URL}/api/auth/logout`;                               // Endpoint: logout (cookie)

// Datos de prueba                                                                 // Usuario temporal
const EMAIL = `smoke.auth+${Date.now()}_${crypto.randomBytes(3).toString('hex')}@example.com`;
const PASSWORD = 'Sm0keTest!';
const FIRST = 'Smoke';
const LAST  = 'Auth';
const PHONE = '0000000000';

/* =========================
 * Cliente HTTP con cookies
 * ========================= */
const jar = new CookieJar();                                                      // Instancia de jar en memoria
const client = wrapper(axios.create({                                             // Envuelve axios con soporte cookies
  withCredentials: true,                                                          // Enviar/recibir cookies
  jar,                                                                            // Usa nuestro jar
  validateStatus: () => true                                                      // Dejamos manejar status manualmente
}));

/* =========================
 * Utilidades
 * ========================= */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));                        // Pequeña espera (si se necesita)
function banner(title) {                                                          // Encabezado bonito en logs
  console.log('\n' + '='.repeat(80));
  console.log(title);
  console.log('='.repeat(80));
}

// Limpieza directa en BD (sin modelos)                                           // Borra usuario y refresh tokens
async function cleanupUserByEmail(email) {                                        // Firma
  if (!process.env.MONGO_URI) {                                                   // Requiere MONGO_URI
    console.warn('⚠️  MONGO_URI no está definido. Se omite cleanup.');            // Aviso
    return;                                                                       // Salida
  }
  await mongoose.connect(process.env.MONGO_URI);                                  // Conecta
  const db = mongoose.connection;                                                 // Referencia
  const usersCol = db.collection('users');                                        // Colección de usuarios
  const rtCol    = db.collection('refresh_tokens');                               // Colección de refresh

  const user = await usersCol.findOne({ email });                                 // Busca por email exacto (normalizado)
  if (user) {                                                                     // Si existe
    const uid = user._id;                                                         // ObjectId del usuario
    await rtCol.deleteMany({ user: uid });                                        // Borra sus refresh tokens
    await usersCol.deleteOne({ _id: uid });                                       // Borra el usuario
    console.log(`🧹 Cleanup OK: ${email}`);                                        // Log
  } else {
    console.log('🧹 Cleanup: usuario no encontrado, nada que borrar.');           // Nada que hacer
  }
  await db.close();                                                               // Cierra conexión
}

/* =========================
 * Flujo principal
 * ========================= */
(async () => {                                                                     // IIFE
  banner('SMOKE AUTH TEST (login → me → refresh → logout → refresh 401)');        // Título

  try {                                                                            // Manejo de errores del flujo
    // 1) REGISTER ------------------------------------------------------------- //
    console.log('1) Registrando usuario de prueba…');                              // Información
    const r1 = await client.post(EP_REGISTER, {                                    // POST /register
      firstName: FIRST,                                                            // Nombre
      lastName:  LAST,                                                             // Apellido
      email:     EMAIL,                                                            // Email único
      phone:     PHONE,                                                            // Teléfono
      password:  PASSWORD                                                          // Contraseña
    });
    if (r1.status !== 201) {                                                       // Espera 201
      throw new Error(`Register falló: ${r1.status} ${JSON.stringify(r1.data)}`);  // Detalle
    }
    console.log('   ✅ Registro OK');                                              // OK

    // 2) LOGIN ---------------------------------------------------------------- //
    console.log('2) Haciendo login…');                                            // Información
    const r2 = await client.post(EP_LOGIN, {                                       // POST /login
      email: EMAIL,                                                                // Email
      password: PASSWORD                                                           // Password
    });
    if (r2.status !== 200 || !r2.data?.access_token) {                             // Debe traer access_token
      throw new Error(`Login falló: ${r2.status} ${JSON.stringify(r2.data)}`);     // Detalle
    }
    const access1 = r2.data.access_token;                                          // Access token #1
    console.log('   ✅ Login OK (access_token recibido y cookie pm_rt seteada)');  // OK

    // 3) ME (con Bearer) ------------------------------------------------------ //
    console.log('3) Consultando /me con Bearer access…');                          // Información
    const r3 = await client.get(EP_ME, {                                           // GET /me
      headers: { Authorization: `Bearer ${access1}` }                              // Header Authorization
    });
    if (r3.status !== 200 || !r3.data?.email || r3.data.email !== EMAIL) {         // Debe devolver nuestro usuario
      throw new Error(`Me falló: ${r3.status} ${JSON.stringify(r3.data)}`);        // Detalle
    }
    console.log('   ✅ /me OK');                                                   // OK

    // 4) REFRESH (con cookie) ------------------------------------------------- //
    console.log('4) Haciendo /auth/refresh con cookie…');                          // Información
    const r4 = await client.post(EP_REFRESH, {});                                  // POST /refresh (usa cookie del jar)
    if (r4.status !== 200 || !r4.data?.access_token) {                             // Debe devolver nuevo access
      throw new Error(`Refresh falló: ${r4.status} ${JSON.stringify(r4.data)}`);   // Detalle
    }
    const access2 = r4.data.access_token;                                          // Access token #2
    const rotated = access2 !== access1;                                           // Suele ser distinto (válido si no)
    console.log(`   ✅ Refresh OK (${rotated ? 'access_token rotado' : 'access igual (válido)'})`); // OK

    // 5) LOGOUT --------------------------------------------------------------- //
    console.log('5) Haciendo /auth/logout…');                                      // Información
    const r5 = await client.post(EP_LOGOUT, {});                                   // POST /logout
    if (r5.status !== 200) {                                                       // Espera 200
      throw new Error(`Logout falló: ${r5.status} ${JSON.stringify(r5.data)}`);    // Detalle
    }
    console.log('   ✅ Logout OK (refresh revocado y cookie limpiada)');           // OK

    // 6) REFRESH debe 401 ----------------------------------------------------- //
    console.log('6) Probando /auth/refresh (debe 401 tras logout)…');              // Información
    const r6 = await client.post(EP_REFRESH, {});                                  // POST /refresh (cookie ya inválida)
    if (r6.status !== 401) {                                                       // Debe ser 401
      throw new Error(`Refresh post-logout NO falló como 401. status=${r6.status} body=${JSON.stringify(r6.data)}`);
    }
    console.log('   ✅ Refresh tras logout devuelve 401 (esperado)');              // OK

    console.log('\n🎉 Smoke auth test COMPLETADO con éxito.');                     // Éxito
    process.exitCode = 0;                                                          // Exit code OK
  } catch (err) {                                                                  // Cualquier fallo
    console.error('\n❌ Smoke auth test FALLÓ:', err?.message || err);             // Log de error
    process.exitCode = 1;                                                          // Exit code error
  } finally {                                                                      // Siempre intenta limpiar
    banner('CLEANUP (borrar usuario de prueba)');                                  // Encabezado
    try {
      await cleanupUserByEmail(EMAIL);                                             // Elimina usuario y sus RT
    } catch (e) {
      console.warn('⚠️  Cleanup con errores:', e?.message || e);                    // Aviso
    }
  }
})();
