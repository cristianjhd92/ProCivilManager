// File: BackEnd/services/ServiceEmail.js                                         // Ruta del archivo dentro del proyecto
// Descripción: Servicio centralizado para envío de correos con Nodemailer.       // Propósito del módulo
// - Carga credenciales desde variables de entorno (sin secretos en código).       // Seguridad
// - Plantilla HTML base uniforme + versión de texto plano.                        // UX y accesibilidad
// - Helpers para reset de contraseña, contacto, bienvenida y solicitud de proyecto// Casos de uso

const nodemailer = require('nodemailer');                                          // Importa Nodemailer para SMTP

// -----------------------------------------------------------------------------
// Configuración vía variables de entorno (usa .env)                               // Sección de configuración
// -----------------------------------------------------------------------------
const {
  SMTP_HOST = 'smtp.gmail.com',                                                    // Host SMTP (por defecto Gmail)
  SMTP_PORT = '465',                                                               // Puerto SMTP (465 TLS implícito)
  SMTP_SECURE = 'true',                                                            // 'true' para TLS en 465, 'false' para STARTTLS
  SMTP_USER,                                                                       // Usuario SMTP (obligatorio)
  SMTP_PASS,                                                                       // Password SMTP / App Password (obligatorio)
  MAIL_FROM = '"Procivil Manager" <procivilmanager@gmail.com>',                    // Remitente por defecto (nombre + email)
  SUPPORT_EMAIL = 'procivilmanager@gmail.com',                                     // Correo de soporte (reply-to / fallback)
  FRONTEND_URL = 'http://localhost:3000',                                           // URL frontend para armar enlaces
  CONTACT_NOTIFICATIONS_TO = 'procivilmanager@gmail.com',                          // Destinatarios notificaciones de contacto (CSV)
  PROJECT_NOTIFICATIONS_TO = 'procivilmanager@gmail.com'                           // Destinatarios notificaciones de proyecto (CSV)
} = process.env;                                                                   // Lee desde process.env

// -----------------------------------------------------------------------------
// Utilidades simples                                                              // Helpers reutilizables
// -----------------------------------------------------------------------------
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;                                  // Regex básica para validar email

const assertEmail = (email, etiqueta = 'Email') => {                               // Valida un email y lanza si es inválido
  if (!EMAIL_REGEX.test(String(email || ''))) {                                    // Ejecuta regex contra el valor recibido
    const err = new Error(`${etiqueta} inválido: ${email}`);                       // Construye error descriptivo
    err.status = 400;                                                              // Marca status sugerido
    throw err;                                                                     // Lanza error
  }                                                                                // Fin if inválido
};                                                                                 // Cierra assertEmail

const htmlToTextLite = (html) =>                                                   // Convierte HTML muy básico a texto plano
  String(html || '')                                                               // Asegura string
    .replace(/<br\s*\/?>/gi, '\n')                                                 // <br> → salto de línea
    .replace(/<\/p>/gi, '\n\n')                                                    // </p> → doble salto
    .replace(/<[^>]+>/g, '')                                                       // Elimina etiquetas
    .replace(/\u00A0/g, ' ')                                                       // NBSP → espacio
    .replace(/[ \t]+\n/g, '\n')                                                    // Quita espacios al fin de línea
    .trim();                                                                       // Recorta extremos

// -----------------------------------------------------------------------------
// Creación del transporter SMTP                                                   // Cliente SMTP
// -----------------------------------------------------------------------------
const transporter = nodemailer.createTransport({                                   // Crea el transport a partir de la config
  host: SMTP_HOST,                                                                 // Host SMTP
  port: Number(SMTP_PORT),                                                         // Puerto numerificado
  secure: (SMTP_SECURE === 'true') || SMTP_PORT === '465',                         // TLS implícito si es 465 o flag true
  auth: { user: SMTP_USER, pass: SMTP_PASS },                                      // Credenciales SMTP
  tls: { ciphers: 'TLSv1.2', rejectUnauthorized: true }                            // TLS endurecido
});                                                                                // Fin createTransport

// (Opcional) Verificación del transporter al cargar el módulo                     // Diagnóstico temprano
transporter.verify().catch(err => {                                                // Llama verify (promesa)
  console.warn('⚠️  SMTP no verificado en arranque:', err?.message || err);        // Log no bloqueante
});                                                                                // Fin verify

// -----------------------------------------------------------------------------
// Plantilla HTML base para todos los correos                                      // Branding consistente
// -----------------------------------------------------------------------------
const baseTemplate = (title, innerHtml) => `                                       
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;padding:24px;background:#f6f7f9">
    <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.06)">
      <div style="background:#0a4974;color:#fff;padding:16px 20px;text-align:center;font-weight:700;font-size:18px">
        Procivil Manager
      </div>
      <div style="padding:28px">
        <h2 style="margin:0 0 12px 0;color:#222;font-size:20px">${title}</h2>
        ${innerHtml}
      </div>
      <div style="background:#f3f5f7;padding:16px 20px;text-align:center;font-size:12px;color:#667085">
        © ${new Date().getFullYear()} Procivil Manager • Soporte: 
        <a href="mailto:${SUPPORT_EMAIL}" style="color:#0a4974;text-decoration:none">${SUPPORT_EMAIL}</a>
      </div>
    </div>
  </div>
`;                                                                                  // Cierra template

// -----------------------------------------------------------------------------
// Envío genérico (aplica defaults y fallback de texto)                            // Función central de envío
// -----------------------------------------------------------------------------
async function sendEmail({ to, subject, html, text, cc, bcc, replyTo }) {           // Firma genérica de envío
  if (!to) {                                                                        // Debe existir destinatario
    const err = new Error('Destinatario "to" requerido');                           // Error de uso
    err.status = 400;                                                               // Status sugerido
    throw err;                                                                      // Lanza
  }                                                                                 // Fin validación to
  const toList = String(to).split(',').map(s => s.trim()).filter(Boolean);          // Soporte CSV → array
  toList.forEach((addr) => assertEmail(addr, 'Destinatario'));                      // Valida cada destinatario

  const mailOptions = {                                                             // Construye opciones de envío
    from: MAIL_FROM,                                                                // Remitente por defecto
    to: toList,                                                                     // Lista de destinatarios
    subject,                                                                        // Asunto
    html,                                                                           // Cuerpo HTML
    text: text || htmlToTextLite(html),                                             // Fallback de texto plano
    replyTo: replyTo || SUPPORT_EMAIL,                                              // Reply-to por defecto a soporte
    cc,                                                                             // CC opcional (si lo pasan ya validado)
    bcc,                                                                            // BCC opcional
    headers: { 'X-App': 'ProcivilManager', 'X-Category': 'Transactional' }          // Headers informativos
  };                                                                                // Fin mailOptions

  const info = await transporter.sendMail(mailOptions);                              // Realiza el envío SMTP
  return info;                                                                       // Devuelve info del envío (messageId, etc.)
}                                                                                    // Fin sendEmail

// -----------------------------------------------------------------------------
// 1) Recuperación de contraseña                                                   // Caso de uso
// -----------------------------------------------------------------------------
async function sendPasswordResetEmail(to, token, expiresAt) {                       // Envía correo de reset
  assertEmail(to, 'Email destino');                                                 // Valida destinatario
  const url = `${FRONTEND_URL.replace(/\/+$/, '')}/cambio?token=${token}`;          // Arma URL sin dobles slashes
  const vence = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 3600000);   // Calcula expiración (1h si no viene)
  const content = `                                                                 
    <p>Recibimos una solicitud para restablecer tu contraseña.</p>
    <p>
      <a href="${url}" style="display:inline-block;padding:12px 18px;background:#1a73e8;color:#fff;
         text-decoration:none;border-radius:8px;font-weight:600">Restablecer contraseña</a>
    </p>
    <p style="font-size:13px;color:#475467">Si el botón no funciona, copia y pega este enlace:</p>
    <p style="font-size:12px;word-break:break-all;"><a href="${url}" style="color:#1a73e8">${url}</a></p>
    <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:10px;margin-top:14px;font-size:12px;color:#475467">
      <strong>Seguridad:</strong> este enlace caduca el <strong>${vence.toLocaleString()}</strong>.
      Si no solicitaste este cambio, ignora este mensaje.
    </div>
  `;                                                                                // Fin content

  const html = baseTemplate('Recuperación de contraseña', content);                 // Inserta en plantilla base
  return sendEmail({ to, subject: 'Recuperación de contraseña', html });            // Envía correo
}                                                                                    // Fin sendPasswordResetEmail

// -----------------------------------------------------------------------------
// 2) Notificación de contacto (a internos)                                        // Caso de uso
// -----------------------------------------------------------------------------
async function sendContactNotification(contactData = {}) {                           // Envía aviso interno
  const { email, name, message, company = '', phone = '', projectType = '' } = contactData; // Desestructura datos
  if (email) assertEmail(email, 'Email de contacto');                                // Valida email remitente si viene
  const notifyList = String(CONTACT_NOTIFICATIONS_TO).split(',')                     // Destinatarios desde env
    .map(s => s.trim()).filter(Boolean);                                             // Normaliza CSV
  notifyList.forEach(addr => assertEmail(addr, 'Destinatario (CONTACT_NOTIFICATIONS_TO)')); // Valida cada uno

  const safeName = String(name || '(sin nombre)').trim();                             // Limpia nombre
  const safeMsg = String(message || '').trim();                                       // Limpia mensaje

  const content = `                                                                   
    <p>Nuevo mensaje de contacto desde el sitio:</p>
    <div style="background:#f9fafb;border-left:4px solid #0a4974;padding:12px;margin:10px 0">
      <p><strong>Nombre:</strong> ${safeName}</p>
      <p><strong>Correo:</strong> ${email || '(no provisto)'}</p>
      <p><strong>Empresa:</strong> ${company || '(no provista)'}</p>
      <p><strong>Teléfono:</strong> ${phone || '(no provisto)'}</p>
      <p><strong>Tipo de proyecto:</strong> ${projectType || '(no especificado)'}</p>
      <p style="margin-top:10px"><strong>Mensaje:</strong></p>
      <pre style="white-space:pre-wrap;font-family:inherit;margin:0">${safeMsg}</pre>
    </div>
  `;                                                                                  // Fin content

  const html = baseTemplate('Nuevo mensaje de contacto', content);                    // Inserta en plantilla
  return sendEmail({                                                                  // Envía correo
    to: notifyList.join(','),                                                         // A internos (lista env)
    subject: 'Nuevo mensaje de contacto',                                             // Asunto
    html,                                                                             // HTML
    replyTo: email && EMAIL_REGEX.test(email) ? email : SUPPORT_EMAIL                 // Reply-To al remitente si válido
  });                                                                                 // Fin sendEmail
}                                                                                     // Fin sendContactNotification

// -----------------------------------------------------------------------------
// 3) Bienvenida                                                                  // Caso de uso
// -----------------------------------------------------------------------------
async function sendWelcomeEmail(to, name = '') {                                     // Envía correo de bienvenida
  assertEmail(to, 'Email destino');                                                  // Valida destinatario
  const safeName = String(name || '').trim();                                        // Normaliza nombre

  const content = `
    <p>¡Bienvenido/a ${safeName ? `<strong>${safeName}</strong>` : ''} a Procivil Manager!</p>
    <p>Tu correo fue utilizado para crear una cuenta en nuestra plataforma.</p>
    <p>Si tú hiciste este registro, no necesitas hacer nada más. Si no fuiste tú, por favor contáctanos de inmediato.</p>
  `;                                                                                  // Fin content

  const html = baseTemplate('Bienvenido/a a Procivil Manager', content);              // Inserta en plantilla
  return sendEmail({ to, subject: 'Bienvenido/a a Procivil Manager', html });         // Envía correo
}                                                                                     // Fin sendWelcomeEmail

// -----------------------------------------------------------------------------
// 4) Solicitud de proyecto (aviso a internos; reply-to al solicitante)          // Caso de uso
// -----------------------------------------------------------------------------
async function sendProjectRequestEmail(projectData = {}) {                            // Envía aviso de solicitud
  const { name = '', email = '', phone = '', projectType = '', location = '', message = '' } = projectData; // Datos
  if (email) assertEmail(email, 'Email del solicitante');                             // Valida email solicitante si viene
  const notifyList = String(PROJECT_NOTIFICATIONS_TO).split(',')                      // Destinatarios internos
    .map(s => s.trim()).filter(Boolean);                                              // Normaliza CSV
  notifyList.forEach(addr => assertEmail(addr, 'Destinatario (PROJECT_NOTIFICATIONS_TO)')); // Valida cada uno

  const content = `
    <p>Se ha recibido una <strong>nueva solicitud de proyecto</strong>:</p>
    <div style="background:#f9fafb;border-left:4px solid #0a4974;padding:12px;margin:10px 0">
      <p><strong>Nombre del solicitante:</strong> ${String(name || '(sin nombre)').trim()}</p>
      <p><strong>Correo electrónico:</strong> ${email || '(no provisto)'}</p>
      <p><strong>Teléfono:</strong> ${phone || '(no provisto)'}</p>
      <p><strong>Tipo de proyecto:</strong> ${projectType || '(no especificado)'}</p>
      <p><strong>Ubicación:</strong> ${location || '(no especificada)'}</p>
      <p style="margin-top:10px"><strong>Mensaje:</strong></p>
      <pre style="white-space:pre-wrap;font-family:inherit;margin:0">${String(message || '').trim()}</pre>
    </div>
  `;                                                                                  // Fin content

  const html = baseTemplate('Nueva solicitud de proyecto', content);                  // Inserta en plantilla
  return sendEmail({                                                                  // Envía correo
    to: notifyList.join(','),                                                         // A internos
    subject: 'Nueva solicitud de proyecto',                                           // Asunto
    html,                                                                             // HTML
    replyTo: email && EMAIL_REGEX.test(email) ? email : SUPPORT_EMAIL                 // Reply-To al solicitante si válido
  });                                                                                 // Fin sendEmail
}                                                                                     // Fin sendProjectRequestEmail

// -----------------------------------------------------------------------------
// Exportaciones                                                                   // API pública del servicio
// -----------------------------------------------------------------------------
module.exports = {                                                                  // Exporta funciones
  sendPasswordResetEmail,                                                           // Reset de contraseña
  sendContactNotification,                                                          // Notificación de contacto
  sendWelcomeEmail,                                                                 // Bienvenida
  sendProjectRequestEmail                                                           // Solicitud de proyecto
};                                                                                  // Fin exports
