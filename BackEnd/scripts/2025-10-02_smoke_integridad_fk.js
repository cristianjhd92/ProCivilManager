// File: BackEnd/scripts/2025-10-02_smoke_integridad_fk.js                       // Ruta del archivo dentro del proyecto
// Descripción: Prueba "end-to-end" de integridad referencial y reglas de negocio // Qué verifica el script
// - Crea/login usuarios (admin/líder/cliente)                                    // Accesos y roles
// - Crea proyecto con owner/team por email → ObjectId                            // FK lógica
// - Verifica RESTRICT al eliminar owner y $pull en team                          // Consistencia al borrar usuarios
// - Verifica duplicados {owner,title} y validaciones de fechas                   // Reglas de unicidad y validación

const path = require('path');                                                     // Módulo path para resolver rutas
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });           // Carga .env del BackEnd de forma robusta

// ===== Configuración base del test =====                                        // Sección de configuración
const API = process.env.API_BASE || 'http://localhost:5000';                      // URL del backend (puedes sobreescribir con API_BASE)
const nowTag = Date.now();                                                        // Tag único para títulos y correos
const users = {                                                                   // Correos/contraseñas de prueba
  admin:   { email: `admin@procivilmanager.com`,      password: 'Secret123!' },  // Admin (dominio procivilmanager.com)
  lider:   { email: `lider@constructoramd.com`,       password: 'Secret123!' },  // Líder (dominio constructoramd.com)
  cliente: { email: `cliente_${nowTag}@test.com`,     password: 'Secret123!' }   // Cliente (correo único por corrida)
};                                                                                // Cierra objeto users

// ===== fetch (Node 18+ o fallback undici) =====                                  // Soporte para fetch en Node
let _fetch = global.fetch;                                                        // Toma fetch nativo si existe (Node 18+)
if (typeof _fetch !== 'function') {                                               // Si no existe…
  try { ({ fetch: _fetch } = require('undici')); }                                // …intenta usar undici
  catch { throw new Error('Este script requiere Node 18+ o instalar undici: npm i undici'); } // Mensaje claro
}                                                                                 // Fin fallback
const fetch = _fetch;                                                             // Alias local

// ===== Helpers HTTP =====                                                        // Utilidades para requests
async function req(method, path, body, token) {                                   // Helper para hacer una request
  const headers = { 'Content-Type': 'application/json' };                         // Headers base JSON
  if (token) headers.Authorization = `Bearer ${token}`;                           // Agrega JWT si viene
  const res = await fetch(`${API}${path}`, { method, headers,                     // Llama a la API
    body: body ? JSON.stringify(body) : undefined                                 // Serializa body si existe
  });                                                                              // Cierra fetch
  const text = await res.text();                                                  // Lee cuerpo como texto
  let json; try { json = text ? JSON.parse(text) : {}; }                          // Intenta parsear JSON
  catch { json = { raw: text }; }                                                 // Si no es JSON, entrega raw
  return { status: res.status, data: json };                                      // Devuelve status + data
}                                                                                 // Fin req

function assert(condition, message) {                                             // Asserción simple
  if (!condition) throw new Error(`ASSERT FAIL → ${message}`);                    // Lanza error si falla
}                                                                                 // Fin assert

// ===== Flujo principal =====                                                     // Script principal
(async () => {                                                                     // IIFE asíncrona
  console.log('🔧 Iniciando smoke test de integridad referencial...');            // Log de inicio

  // 1) Registrar usuarios (si ya existen, se ignora y se hace login)             // Paso 1
  for (const role of Object.keys(users)) {                                        // Recorre roles admin/lider/cliente
    const name = role[0].toUpperCase() + role.slice(1);                           // Capitaliza nombre
    const body = {                                                                // Body de registro
      firstName: name, lastName: 'Prueba', email: users[role].email,              // Nombre, apellido, email
      phone: '3000000000', password: users[role].password                         // Teléfono y contraseña
    };                                                                            // Fin body
    const reg = await req('POST', '/api/user/register', body);                    // POST /register
    if (reg.status === 201) {                                                     // Si creó
      console.log(`✅ Registrado ${role}:`, reg.data.user?.email);                // Log éxito
    } else if (reg.status === 409 || reg.status === 400) {                        // Si ya existía o conflicto
      console.log(`ℹ️  ${role} ya existía o no fue necesario crear, continuando...`); // Seguimos adelante
    } else {                                                                       // Otros casos
      console.warn(`⚠️  Registro ${role} → ${reg.status}:`, reg.data);            // Warn
    }                                                                              // Fin if
  }                                                                                // Fin for

  // 2) Login de cada usuario y guardar tokens                                     // Paso 2
  const tokens = {};                                                               // Mapa de tokens por rol
  for (const role of Object.keys(users)) {                                         // Recorre roles
    const log = await req('POST', '/api/user/login', {                             // POST /login
      email: users[role].email, password: users[role].password                     // Credenciales
    });                                                                            // Cierra req
    assert(log.status === 200, `login ${role} debe devolver 200`);                 // Assert 200
    tokens[role] = log.data.token;                                                 // Guarda token
    console.log(`🔑 Token ${role} OK`);                                            // Log token
  }                                                                                // Fin for

  // 3) Con admin, listar usuarios para obtener _id del cliente y líder            // Paso 3
  const listUsers = await req('GET', '/api/user/users', null, tokens.admin);       // GET /users con token admin
  assert(listUsers.status === 200, 'GET /users debe devolver 200 para admin');     // Assert 200
  const all = Array.isArray(listUsers.data) ? listUsers.data : [];                 // Asegura arreglo
  const uCliente = all.find(u => u.email === users.cliente.email);                 // Busca cliente
  const uLider   = all.find(u => u.email === users.lider.email);                   // Busca líder
  assert(uCliente && uCliente._id, 'Debe existir uCliente con _id');               // Assert cliente
  assert(uLider && uLider._id, 'Debe existir uLider con _id');                     // Assert líder
  console.log('👥 IDs → cliente:', uCliente._id, 'líder:', uLider._id);            // Log IDs

  // 4) Cliente crea un proyecto con ownerEmail=cliente y teamEmails=[líder]       // Paso 4
  const title = `Obra Prueba ${nowTag}`;                                           // Título único
  const createBody = {                                                             // Body de creación (completo para cumplir validaciones)
    title, location: 'Bogotá', type: 'Remodelación', budget: 1000000,              // Datos base
    duration: 30, description: 'Proyecto de prueba', priority: 'media',            // Más datos
    startDate: '2025-10-02', endDate: '2025-10-12',                                // Fechas coherentes
    ownerEmail: users.cliente.email,                                               // Dueño por email (se resolverá a ObjectId)
    teamEmails: [users.lider.email]                                                // Team por emails (se resolverán a ObjectId)
  };                                                                               // Fin createBody
  const crear = await req('POST', '/api/proyectos', createBody, tokens.cliente);   // POST /api/proyectos (cliente)
  assert(crear.status === 201, `Crear proyecto debe 201, llegó ${crear.status}`);  // Assert 201
  const proyecto = crear.data.proyecto;                                            // Proyecto devuelto
  assert(proyecto && proyecto._id, 'Debe retornar proyecto con _id');              // Assert _id
  console.log('🏗️  Proyecto creado:', proyecto._id, 'owner:', proyecto.owner?.email || proyecto.owner); // Log

  // 5) Cliente consulta sus proyectos → debe ver el recién creado                 // Paso 5
  const mis = await req('GET', '/api/proyectos/mis-proyectos', null, tokens.cliente); // GET mis-proyectos
  assert(mis.status === 200 && Array.isArray(mis.data), 'mis-proyectos 200 y array');  // Assert ok
  assert(mis.data.find(p => p._id === proyecto._id), 'Proyecto debe estar en mis-proyectos'); // Contiene proyecto
  console.log('📄 mis-proyectos OK');                                              // Log ok

  // 6) Cliente intenta listar /users → debe 403 (rol insuficiente)                // Paso 6
  const listByCliente = await req('GET', '/api/user/users', null, tokens.cliente); // GET /users con token cliente
  assert(listByCliente.status === 403, `Cliente NO debe acceder a /users (status ${listByCliente.status})`); // Assert 403
  console.log('🔒 Roles OK (cliente sin acceso a /users)');                        // Log ok

  // 7) Admin intenta eliminar al cliente (owner) → debe 409 RESTRICT              // Paso 7
  const delOwner = await req('DELETE', `/api/user/users/${uCliente._id}`, null, tokens.admin); // DELETE cliente
  assert(delOwner.status === 409, `RESTRICT esperado 409 al eliminar owner, llegó ${delOwner.status}`); // Assert 409
  console.log('🛡️  RESTRICT eliminar owner OK');                                   // Log ok

  // 8) Admin elimina al líder (miembro del team) → debe $pull en proyecto         // Paso 8
  const delLider = await req('DELETE', `/api/user/users/${uLider._id}`, null, tokens.admin);   // DELETE líder
  assert(delLider.status === 200, `Eliminar miembro del team debe 200, llegó ${delLider.status}`); // Assert 200

  const after = await req('GET', `/api/proyectos`, null, tokens.admin);            // GET proyectos (admin)
  assert(after.status === 200, `GET /api/proyectos admin 200, llegó ${after.status}`); // Assert 200
  const pReload = (after.data || []).find(p => p._id === proyecto._id);           // Busca el proyecto creado
  assert(pReload && Array.isArray(pReload.team), 'Proyecto recargado debe tener team array'); // Assert team array

  // Chequeo robusto: team como ObjectId[] o como objetos poblados                 // Soporta ambas respuestas
  const teamIncluyeLider = pReload.team.some(m =>                                 // some → true si encuentra al líder
    (m && typeof m === 'object' && m._id) ? (m._id === uLider._id)                // Caso populate: objetos con _id
                                          : (m === uLider._id)                    // Caso no populate: strings ObjectId
  );                                                                              // Fin some
  assert(!teamIncluyeLider, 'Team ya NO debe incluir al líder tras $pull');       // Debe haber sido removido
  console.log('🧹 Limpieza de team por $pull OK');                                  // Log ok

  // 9) Intentar duplicar {owner,title} → debe 409                                 // Paso 9
  const dup = await req('POST', '/api/proyectos', createBody, tokens.cliente);     // Reintenta crear MISMO body
  assert(dup.status === 409, `Duplicado {owner,title} debe 409, llegó ${dup.status}`); // Assert 409
  console.log('🚫 Duplicado {owner,title} correctamente bloqueado');               // Log ok

  // 10) Validar fechas inválidas → 400                                            // Paso 10
  const badDates = await req('PATCH', `/api/proyectos/${proyecto._id}`, {          // PATCH con fechas cruzadas
    startDate: '2025-12-01', endDate: '2025-11-01'                                 // start > end
  }, tokens.cliente);                                                               // Token del owner
  assert(badDates.status === 400, `Fechas inválidas deben 400, llegó ${badDates.status}`); // Assert 400
  console.log('⏱️  Validación de fechas OK');                                       // Log ok

  console.log('✅ Smoke test completado sin errores');                              // Fin exitoso
  process.exit(0);                                                                  // Exit OK
})().catch((e) => {                                                                 // Captura de errores top-level
  console.error('❌ Smoke test falló:', e?.message || e);                           // Log de error
  process.exit(1);                                                                  // Exit error
});                                                                                 // Fin script
