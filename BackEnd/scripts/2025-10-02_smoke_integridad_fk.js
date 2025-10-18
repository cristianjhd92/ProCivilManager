// File: scripts/2025-10-02_smoke_integridad_fk.js                                // Ruta del archivo
// Descripción: Smoke E2E de integridad referencial + reglas de negocio           // Qué prueba este script
// - Crea/login usuarios (admin/líder/cliente)                                    // Altas y autenticación
// - Crea proyecto owner/team por email → ObjectId                                // Resolución de FKs por email
// - Verifica RESTRICT al eliminar owner y $pull en team                          // Políticas de borrado
// - Verifica duplicados {owner,title} y validación de fechas                     // Reglas de unicidad/fechas

const path = require('path');                                                     // Utilidad de rutas
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });           // Carga .env (backend/.env)

const API = process.env.API_BASE || 'http://localhost:5000';                      // Base URL de la API
const nowTag = Date.now();                                                        // Sufijo único por corrida
const users = {                                                                   // Cuentas de prueba
  admin:   { email: 'admin@procivilmanager.com',  password: 'Secret123!' },      // Admin
  lider:   { email: 'lider@constructoramd.com',   password: 'Secret123!' },      // Líder
  cliente: { email: `cliente_${nowTag}@test.com`, password: 'Secret123!' },      // Cliente (único)
};                                                                                // Fin usuarios

let _fetch = global.fetch;                                                        // Detecta fetch nativo
if (typeof _fetch !== 'function') {                                               // Si no hay fetch…
  try { ({ fetch: _fetch } = require('undici')); }                                // …usa undici
  catch { throw new Error('Node 18+ o instalar undici: npm i undici'); }          // Mensaje claro
}
const fetch = _fetch;                                                             // Alias local

async function req(method, path, body, token) {                                   // Helper HTTP genérico
  const headers = { 'Content-Type': 'application/json' };                         // JSON por defecto
  if (token) headers.Authorization = `Bearer ${token}`;                           // Bearer si hay token
  const res = await fetch(`${API}${path}`, { method, headers,                     // Llama endpoint
    body: body ? JSON.stringify(body) : undefined                                 // Serializa body
  });                                                                              // Cierra fetch
  const text = await res.text();                                                  // Lee texto
  let json; try { json = text ? JSON.parse(text) : {}; }                          // Intenta parsear JSON
  catch { json = { raw: text }; }                                                 // Si no era JSON, guarda raw
  return { status: res.status, data: json };                                      // Retorna status + data
}                                                                                 // Fin helper

function assert(ok, msg) { if (!ok) throw new Error(`ASSERT FAIL → ${msg}`); }    // Assert sencillo

(async () => {                                                                     // IIFE principal
  console.log('🔧 Iniciando smoke test de integridad referencial...');            // Banner

  // 1) Registrar usuarios (si existen, continuar) ----------------------------- //
  for (const role of Object.keys(users)) {                                        // Itera roles
    const name = role[0].toUpperCase() + role.slice(1);                           // Nombre amigable
    const reg = await req('POST', '/api/user/register', {                         // POST register
      firstName: name, lastName: 'Prueba', email: users[role].email,              // Datos base
      phone: '3000000000', password: users[role].password                         // Tel/pass
    });                                                                            // Cierra req
    if (reg.status === 201) {                                                      // Creado
      console.log(`✅ Registrado ${role}:`, reg.data.user?.email);                 // Log OK
    } else if (reg.status === 409 || reg.status === 400) {                         // Ya existe
      console.log(`ℹ️  ${role} ya existía o no era necesario crear.`);             // Log info
    } else {                                                                        // Otro error
      console.warn(`⚠️  Registro ${role} → ${reg.status}`, reg.data);             // Warn
    }
  }                                                                                // Fin for

  // 2) Login y captura de tokens ---------------------------------------------- //
  const tokens = {};                                                               // Map de tokens
  for (const role of Object.keys(users)) {                                         // Itera roles
    const log = await req('POST', '/api/user/login', {                             // POST login
      email: users[role].email, password: users[role].password                     // Credenciales
    });                                                                            // Cierra req
    assert(log.status === 200, `login ${role} debe 200`);                          // Assert 200
    const access = log.data?.access_token || log.data?.token;                      // Compat token
    assert(access, `login ${role} debe retornar access_token/token`);              // Debe existir
    tokens[role] = access;                                                         // Guarda token
    console.log(`🔑 Token ${role} OK`);                                            // Log OK
  }                                                                                // Fin for

  // 3) Obtener _id vía /me (evita /api/user/users) ---------------------------- //
  const meCliente = await req('GET', '/api/user/me', null, tokens.cliente);        // /me cliente
  assert(meCliente.status === 200 && meCliente.data?._id, '/me cliente debe 200'); // Assert
  const uCliente = { _id: meCliente.data._id, email: meCliente.data.email };       // Datos cliente

  const meLider = await req('GET', '/api/user/me', null, tokens.lider);            // /me líder
  assert(meLider.status === 200 && meLider.data?._id, '/me líder debe 200');       // Assert
  const uLider = { _id: meLider.data._id, email: meLider.data.email };             // Datos líder

  console.log('👥 IDs → cliente:', uCliente._id, 'líder:', uLider._id);            // Log IDs

  // 4) Crear proyecto (ownerEmail/teams por email → ObjectId) ----------------- //
  const title = `Obra Prueba ${nowTag}`;                                           // Título único
  const crear = await req('POST', '/api/proyectos', {                               // POST proyecto
    title, location: 'Bogotá', type: 'Remodelación', budget: 1000000,              // Campos base
    duration: 30, description: 'Proyecto de prueba', priority: 'media',            // Más datos
    startDate: '2025-10-02', endDate: '2025-10-12',                                // Fechas válidas
    ownerEmail: users.cliente.email,                                               // Owner por email
    teamEmails: [users.lider.email],                                               // Team por email
  }, tokens.cliente);                                                               // Autenticado cliente
  assert(crear.status === 201, `crear proyecto debe 201; llegó ${crear.status}`);  // Assert
  const proyecto = crear.data.proyecto;                                            // Proyecto creado
  assert(proyecto && proyecto._id, 'response debe traer proyecto._id');            // Assert _id
  console.log('🏗️  Proyecto creado:', proyecto._id);                               // Log

  // 5) mis-proyectos del cliente ---------------------------------------------- //
  const mis = await req('GET', '/api/proyectos/mis-proyectos', null, tokens.cliente); // GET mis
  assert(mis.status === 200 && Array.isArray(mis.data), 'mis-proyectos 200/array');    // Assert
  assert(mis.data.find(p => p._id === proyecto._id), 'proyecto debe estar en mis');    // Contiene
  console.log('📄 mis-proyectos OK');                                              // Log

  // 6) Permisos: cliente NO debe listar todos los proyectos ------------------- //
  const listAllByCliente = await req('GET', '/api/proyectos', null, tokens.cliente);   // GET all
  assert(listAllByCliente.status === 403, `cliente NO debe acceder a /api/proyectos`); // Debe 403
  console.log('🔒 Roles OK (cliente sin acceso a /api/proyectos)');               // Log

  // 7) RESTRICT: Admin NO puede borrar owner de un proyecto ------------------- //
  const delOwner = await req('DELETE', `/api/user/users/${uCliente._id}`, null, tokens.admin); // DELETE owner
  assert(delOwner.status === 409, `esperado 409 al eliminar owner; llegó ${delOwner.status}`); // Debe 409
  console.log('🛡️  RESTRICT eliminar owner OK');                                   // Log

  // 8) $pull en team: borrar líder y verificar limpieza ----------------------- //
  const delLider = await req('DELETE', `/api/user/users/${uLider._id}`, null, tokens.admin);   // DELETE líder
  assert(delLider.status === 200, `eliminar líder debe 200; llegó ${delLider.status}`);        // Debe 200

  const after = await req('GET', `/api/proyectos`, null, tokens.admin);            // GET all admin
  assert(after.status === 200 && Array.isArray(after.data), 'admin GET proyectos 200/array');  // Assert
  const pReload = after.data.find(p => p._id === proyecto._id);                    // Relee proyecto
  assert(pReload && Array.isArray(pReload.team), 'proyecto debe tener team array'); // Team array

  const teamIncluyeLider = pReload.team.some(m =>                                  // Busca líder
    (m && typeof m === 'object' && m._id) ? (m._id === uLider._id) : (m === uLider._id)
  );                                                                               // Fin some
  assert(!teamIncluyeLider, 'team ya NO debe incluir al líder tras $pull');        // Debe estar fuera
  console.log('🧹 Limpieza team por $pull OK');                                     // Log

  // 9) Duplicado {owner,title} debe 409 --------------------------------------- //
  const dup = await req('POST', '/api/proyectos', {                                 // Reintenta igual
    title, location: 'Bogotá', type: 'Remodelación', budget: 1000000,              // Mismo body
    duration: 30, description: 'Proyecto de prueba', priority: 'media',
    startDate: '2025-10-02', endDate: '2025-10-12',
    ownerEmail: users.cliente.email,
    teamEmails: [users.lider.email],
  }, tokens.cliente);                                                               // Token cliente
  assert(dup.status === 409, `duplicado {owner,title} debe 409; llegó ${dup.status}`); // Debe 409
  console.log('🚫 Duplicado {owner,title} bloqueado');                               // Log

  // 10) Validación de fechas (start > end) debe 400 --------------------------- //
  const badDates = await req('PATCH', `/api/proyectos/${proyecto._id}`, {           // PATCH fechas
    startDate: '2025-12-01', endDate: '2025-11-01'                                  // start > end
  }, tokens.cliente);                                                                // Token cliente
  assert(badDates.status === 400, `fechas inválidas debe 400; llegó ${badDates.status}`); // Debe 400
  console.log('⏱️  Validación de fechas OK');                                       // Log

  console.log('✅ Smoke test completado sin errores');                              // Fin OK
  process.exit(0);                                                                  // Exit 0
})().catch((e) => {                                                                 // Catch global
  console.error('❌ Smoke test falló:', e?.message || e);                           // Log error
  process.exit(1);                                                                  // Exit 1
});                                                                                 // Fin script
