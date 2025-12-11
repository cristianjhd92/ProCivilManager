// File: BackEnd/src/core/services/correo.servicio.js
// Description: Servicio centralizado de envío de correos para ProCivil Manager (PCM)
//              usando Nodemailer + Gmail OAuth2.
//              Aplica una plantilla HTML con identidad visual PCM
//              (modo oscuro, acentos sobrios en azul/naranja, contexto Colombia) para:
//              - Recuperación de contraseña
//              - Notificación de formulario de contacto
//              - Correo de bienvenida a la plataforma
//              - Notificación de nueva solicitud de proyecto

// ==========================
// Importaciones principales
// ==========================
const nodemailer = require('nodemailer');          // Importa Nodemailer para enviar correos electrónicos.
const { google } = require('googleapis');          // Importa el SDK de Google para manejar OAuth2 con Gmail.

// ========================================
// Variables de entorno y configuración
// ========================================

// Correo emisor principal (cuenta de Gmail que envía los correos).
const MAIL_USER = process.env.MAIL_USER;           // Ej: procivilmanagercolombia@gmail.com

// URL base del frontend (para enlaces como cambio de contraseña o acceso a la plataforma).
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// URL del logo oficial de ProCivil Manager para los correos (opcional).
// Si no se define, la plantilla mostrará las letras "PCM" dentro del círculo del encabezado.
const PCM_LOGO_URL = process.env.PCM_LOGO_URL || '';

// Destinatarios internos para notificaciones (contacto / proyectos).
let CONTACT_RECIPIENTS = (process.env.CONTACT_RECIPIENTS || MAIL_USER || '')
  .split(',')
  .map((email) => email.trim())
  .filter((email) => email.length > 0);

// Muestra advertencia si no hay destinatarios internos configurados.
if (CONTACT_RECIPIENTS.length === 0) {
  console.warn(
    '⚠️  No hay CONTACT_RECIPIENTS ni MAIL_USER configurados. Revisa tu archivo .env para que las notificaciones de correo funcionen correctamente.'
  );
}

// Credenciales OAuth2 para Gmail (definidas en .env).
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || '';         // Client ID de Google Cloud.
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || ''; // Client Secret de Google Cloud.
const GMAIL_REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || 'http://localhost'; // Redirect URI registrada.
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN || ''; // Refresh token obtenido con el script.

// Crea el cliente OAuth2 con las credenciales de Google.
const oAuth2Client = new google.auth.OAuth2(
  GMAIL_CLIENT_ID,       // Pasa el Client ID.
  GMAIL_CLIENT_SECRET,   // Pasa el Client Secret.
  GMAIL_REDIRECT_URI     // Pasa la URL de redirección configurada.
);

// Configura el refresh token en el cliente OAuth2 si existe.
if (GMAIL_REFRESH_TOKEN) {
  oAuth2Client.setCredentials({
    refresh_token: GMAIL_REFRESH_TOKEN, // Asigna el refresh token para poder pedir access tokens.
  });
}

// =======================================================
// Helper: plantilla HTML con identidad ProCivil Manager
// =======================================================

/**
 * Construye una plantilla HTML reutilizable con la identidad visual PCM.
 * (modo oscuro, header centrado con gradiente azul/naranja y card sobrio).
 *
 * @param {object} options                   Objeto de configuración.
 * @param {string} options.title             Título principal del correo (visible dentro del card).
 * @param {string} [options.preheader]       Texto corto que se muestra en la vista previa del correo.
 * @param {string} options.bodyHtml          Contenido HTML central (párrafos, tablas, botones, etc.).
 * @param {string} [options.badgeText]       Texto opcional para una “etiqueta” pequeña bajo el header.
 * @returns {string}                         HTML completo listo para enviar.
 */
function buildPcmEmailTemplate({ title, preheader = '', bodyHtml, badgeText = '' }) {
  // Preheader por defecto si no se envía uno específico.
  const safePreheader =
    preheader ||
    'ProCivil Manager · Plataforma de gestión centralizada de obras y proyectos de ingeniería en Colombia.';

  // Badge opcional (cinta pequeña bajo el encabezado).
  const badgeHtml = badgeText
    ? `
      <tr>
        <td
          style="
            padding:10px 24px 0 24px;
            background-color:#050816;
          "
        >
          <span
            style="
              display:inline-block;
              padding:4px 10px;
              border-radius:9999px;
              font-size:11px;
              font-weight:600;
              background:rgba(37,99,235,0.12);
              color:#60A5FA;
              border:1px solid rgba(96,165,250,0.6);
            "
          >
            ${badgeText}
          </span>
        </td>
      </tr>
    `
    : '';

  // Bloque para el contenido del logo dentro del círculo.
  // Si hay una URL definida en PCM_LOGO_URL, se muestra el logo como <img>;
  // de lo contrario se muestran las letras PCM centradas.
  const logoInnerHtml = PCM_LOGO_URL
    ? `
      <img
        src="${PCM_LOGO_URL}"
        alt="ProCivil Manager"
        width="40"
        height="40"
        style="
          display:block;
          max-width:40px;
          max-height:40px;
          margin-top:2px;              /* Pequeño ajuste para centrar mejor el arte dentro del círculo */
          object-fit:contain;
        "
      />
    `
    : `
      <span
        style="
          font-size:14px;
          font-weight:800;
          letter-spacing:0.08em;
          color:#E5E7EB;
        "
      >
        PCM
      </span>
    `;

  // Devuelve el HTML completo con estilos inline (compatibles con la mayoría de clientes de correo).
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body
  style="
    margin:0;
    padding:0;
    background-color:#020617;
    font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    color:#F5F7FA;
  "
>
  <!-- Preheader oculto (aparece en la vista previa de muchos clientes de correo) -->
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#020617;">
    ${safePreheader}
  </div>

  <!-- Contenedor general -->
  <table
    role="presentation"
    cellpadding="0"
    cellspacing="0"
    width="100%"
    style="background-color:#020617;padding:24px 8px 32px 8px;"
  >
    <tr>
      <td align="center">
        <!-- Card principal -->
        <table
          role="presentation"
          cellpadding="0"
          cellspacing="0"
          width="100%"
          style="
            max-width:640px;
            background-color:#020617;
            border-radius:24px;
            border:1px solid #1F2937;
            box-shadow:0 18px 45px rgba(15,23,42,0.9);
            overflow:hidden;
          "
        >
          <!-- Header: círculo + nombre en la misma línea, centrados -->
          <tr>
            <td
              style="
                padding:22px 24px 20px 24px;
                background:
                  radial-gradient(circle at 0% 0%, rgba(15,23,42,0.85) 0, #020617 45%) ,
                  linear-gradient(135deg,#1D4ED8,#0F172A,#EA580C);
                color:#F9FAFB;
                border-bottom:1px solid rgba(15,23,42,0.92);
              "
            >
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <!-- Tabla interna para alinear logo + texto en fila y centrados -->
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                      <tr>
                        <!-- Círculo del logo -->
                        <td style="padding-right:12px;">
                          <div
                            style="
                              width:56px;
                              height:56px;
                              border-radius:9999px;
                              background:
                                radial-gradient(circle at 30% 20%,rgba(249,115,22,0.95),rgba(37,99,235,0.9));
                              display:flex;
                              align-items:center;
                              justify-content:center;
                              border:2px solid rgba(248,250,252,0.2);
                              box-shadow:
                                0 12px 30px rgba(0,0,0,0.65),
                                0 0 18px rgba(59,130,246,0.45),
                                0 0 22px rgba(234,88,12,0.45);
                              overflow:hidden;
                            "
                          >
                            ${logoInnerHtml}
                          </div>
                        </td>

                        <!-- Nombre ProCivil Manager -->
                        <td style="text-align:left;">
                          <div
                            style="
                              font-size:16px;
                              font-weight:700;
                              letter-spacing:0.03em;
                              text-transform:none;
                              white-space:nowrap;
                            "
                          >
                            <span
                              style="
                                background-image:linear-gradient(
                                  120deg,
                                  #F97316,
                                  #FDBA74,
                                  #60A5FA,
                                  #1D4ED8
                                );
                                background-size:180% 180%;
                                background-position:0% 50%;
                                -webkit-background-clip:text;
                                background-clip:text;
                                color:transparent;
                                text-shadow:0 1px 2px rgba(15,23,42,0.85);
                              "
                            >
                              ProCivil Manager
                            </span>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Badge opcional -->
          ${badgeHtml}

          <!-- Título principal -->
          <tr>
            <td
              style="
                padding:18px 24px 6px 24px;
                background-color:#020617;
              "
            >
              <h1
                style="
                  margin:0;
                  font-size:20px;
                  line-height:1.3;
                  font-weight:800;
                  color:#F5F7FA;
                "
              >
                ${title}
              </h1>
            </td>
          </tr>

          <!-- Contenido central -->
          <tr>
            <td
              style="
                padding:6px 24px 24px 24px;
                background-color:#020617;
                color:#D1D5DB;
                font-size:13px;
                line-height:1.7;
              "
            >
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer interno -->
          <tr>
            <td
              style="
                padding:14px 24px 18px 24px;
                background-color:#020617;
                border-top:1px solid rgba(31,41,55,0.9);
              "
            >
              <p
                style="
                  margin:0;
                  font-size:10px;
                  line-height:1.5;
                  color:#6B7280;
                "
              >
                Este correo fue generado automáticamente por
                <strong>ProCivil Manager</strong>. Si no reconoces esta acción,
                por favor responde a este mensaje para que nuestro equipo lo revise.
              </p>
            </td>
          </tr>
        </table>

        <!-- Pie externo -->
        <p
          style="
            margin:14px 0 0 0;
            font-size:10px;
            color:#4B5563;
          "
        >
          © ${new Date().getFullYear()} ProCivil Manager · Plataforma desarrollada en Colombia.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

// =======================================================
// Helper: crear transporter OAuth2 de Nodemailer
// =======================================================

/**
 * Crea y devuelve un transporter de Nodemailer configurado con OAuth2.
 * Se obtiene dinámicamente un access token a partir del refresh token.
 */
async function createOAuthTransporter() {
  // Valida que existan las variables críticas.
  if (!MAIL_USER || !GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    throw new Error(
      'Faltan credenciales de Gmail OAuth2. Verifica MAIL_USER, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET y GMAIL_REFRESH_TOKEN en el .env'
    );
  }

  // Solicita un access token fresco a Google usando el refresh token.
  const accessTokenResponse = await oAuth2Client.getAccessToken();
  const accessToken =
    typeof accessTokenResponse === 'string'
      ? accessTokenResponse
      : accessTokenResponse?.token;

  // Crea el transporter SMTP con autenticación OAuth2.
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',                    // Tipo de autenticación.
      user: MAIL_USER,                   // Correo remitente.
      clientId: GMAIL_CLIENT_ID,         // Client ID de Google Cloud.
      clientSecret: GMAIL_CLIENT_SECRET, // Client Secret de Google Cloud.
      refreshToken: GMAIL_REFRESH_TOKEN, // Refresh token configurado.
      accessToken,                       // Access token recién obtenido.
    },
  });

  return transporter;                     // Devuelve el transporter listo para enviar correos.
}

// =======================================================
// 1. Correo de recuperación de contraseña
// =======================================================

/**
 * Envía un correo con el enlace de recuperación de contraseña.
 *
 * @param {string} to        Correo del usuario que solicita la recuperación.
 * @param {string} token     Token único generado para el reset.
 * @param {Date}   expiresAt Fecha y hora de expiración del token.
 */
const sendPasswordResetEmail = async (to, token, expiresAt) => {
  // Construye la URL de cambio de contraseña usando el frontend.
  const resetUrl = `${FRONTEND_URL}/cambio?token=${token}`;

  // Crea el transporter OAuth2.
  const transporter = await createOAuthTransporter();

  // Construye un texto amigable de expiración (zona horaria Colombia).
  const expiresText = expiresAt
    ? expiresAt.toLocaleString('es-CO', {
        timeZone: 'America/Bogota',
      })
    : 'dentro de 1 hora';

  // Asunto del correo.
  const subject = 'Recuperación de contraseña - ProCivil Manager';

  // Cuerpo HTML específico para recuperación.
  const bodyHtml = `
    <p style="margin:0 0 12px 0;">
      Hola,
    </p>
    <p style="margin:0 0 12px 0;">
      Recibimos una solicitud para restablecer la contraseña de tu cuenta en
      <strong>ProCivil Manager</strong>, la plataforma donde gestionas tus proyectos de ingeniería civil.
    </p>
    <p style="margin:0 0 18px 0;">
      Para continuar con el proceso de recuperación, haz clic en el siguiente botón o copia y pega el enlace en tu navegador:
    </p>
    <p style="margin:0 0 18px 0;">
      <a href="${resetUrl}"
         style="
           display:inline-block;
           padding:11px 22px;
           border-radius:999px;
           background:linear-gradient(135deg,#F97316,#FB923C,#FDBA74);
           color:#020617;
           font-size:13px;
           font-weight:700;
           letter-spacing:0.06em;
           text-transform:uppercase;
           text-decoration:none;
           border:1px solid rgba(234,88,12,0.9);
           box-shadow:0 14px 34px rgba(234,88,12,0.75);
         "
      >
        Cambiar mi contraseña
      </a>
    </p>
    <p style="margin:0 0 10px 0;font-size:12px;color:#9ca3af;">
      Si el botón no funciona, copia y pega este enlace en tu navegador:
    </p>
    <p style="margin:0 0 14px 0;font-size:12px;word-break:break-all;color:#9ca3af;">
      <a href="${resetUrl}" style="color:#60A5FA;text-decoration:none;">${resetUrl}</a>
    </p>
    <p style="margin:0 0 8px 0;font-size:12px;color:#9ca3af;">
      Este enlace es válido hasta: <strong>${expiresText}</strong>.
    </p>
    <p style="margin:10px 0 0 0;">
      Si tú no solicitaste este cambio, puedes ignorar este mensaje y tu contraseña actual seguirá siendo válida.
    </p>
  `;

  // Envuelve el contenido con la plantilla PCM.
  const html = buildPcmEmailTemplate({
    title: 'Solicitud de recuperación de contraseña',
    preheader: 'Restablece la contraseña de tu cuenta de ProCivil Manager.',
    bodyHtml,
    badgeText: '🔐 Seguridad de tu cuenta',
  });

  // Definición final del correo.
  const mailOptions = {
    from: `"ProCivil Manager" <${MAIL_USER}>`, // Remitente con nombre de marca.
    to,                                        // Destinatario.
    subject,                                   // Asunto.
    text: `Hola,

Recibimos una solicitud para restablecer la contraseña de tu cuenta en ProCivil Manager.

Para continuar, abre el siguiente enlace:
${resetUrl}

Este enlace es válido hasta: ${expiresText}.

Si tú no solicitaste este cambio, puedes ignorar este mensaje.

Atentamente,
Equipo ProCivil Manager`,
    html,                                      // Versión HTML con diseño PCM.
  };

  // Envía el correo y devuelve la información del envío.
  const info = await transporter.sendMail(mailOptions);
  return info;
};

// =======================================================
// 2. Correo de notificación de contacto (interno)
// =======================================================

/**
 * Envía una notificación interna cuando alguien diligencia el formulario de contacto.
 *
 * @param {object} contact Objeto con los campos:
 *                         name, email, message, company, phone, projectType
 */
const sendContactNotification = async (contact) => {
  // Crea el transporter OAuth2.
  const transporter = await createOAuthTransporter();

  // Extrae campos relevantes del contacto.
  const {
    name,
    email,
    message,
    company = '',
    phone = '',
    projectType = '',
  } = contact;

  // Etiqueta amigable para el tipo de proyecto.
  const projectLabel = projectType || 'No especificado';

  // Asunto del correo interno.
  const subject = `Nuevo mensaje de contacto - ${name}`;

  // Cuerpo HTML estilizado para el equipo interno PCM.
  const bodyHtml = `
    <p style="margin:0 0 12px 0;">
      Se ha recibido un nuevo mensaje desde el formulario de contacto del sitio público de
      <strong>ProCivil Manager</strong>.
    </p>
    <p style="margin:0 0 8px 0;font-size:12px;color:#9ca3af;">
      Datos de la persona que escribió (posible cliente o aliado en Colombia):
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0"
           style="width:100%;margin:8px 0 16px 0;border-collapse:collapse;font-size:12px;">
      <tr>
        <td style="padding:4px 0;color:#9ca3af;width:150px;">Nombre:</td>
        <td style="padding:4px 0;color:#e5e7eb;font-weight:500;">${name}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#9ca3af;">Correo:</td>
        <td style="padding:4px 0;">
          <a href="mailto:${email}" style="color:#60A5FA;text-decoration:none;">${email}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#9ca3af;">Teléfono:</td>
        <td style="padding:4px 0;color:#e5e7eb;">${phone || 'No informado'}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#9ca3af;">Empresa / Copropiedad:</td>
        <td style="padding:4px 0;color:#e5e7eb;">${company || 'No informada'}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#9ca3af;">Tipo de proyecto:</td>
        <td style="padding:4px 0;color:#e5e7eb;">${projectLabel}</td>
      </tr>
    </table>
    <p style="margin:0 0 6px 0;font-weight:500;color:#e5e7eb;">Mensaje recibido:</p>
    <p style="margin:0 0 12px 0;color:#d1d5db;">
      ${message.replace(/\n/g, '<br/>')}
    </p>
    <p style="margin:10px 0 0 0;font-size:12px;color:#9ca3af;">
      Puedes responder directamente a
      <a href="mailto:${email}" style="color:#60A5FA;text-decoration:none;">${email}</a>
      para coordinar una reunión, visita técnica o propuesta formal.
    </p>
  `;

  // Envuelve el contenido con la plantilla PCM.
  const html = buildPcmEmailTemplate({
    title: 'Nuevo mensaje de contacto del sitio web',
    preheader: `Nuevo mensaje de ${name} a través del sitio ProCivil Manager.`,
    bodyHtml,
    badgeText: '📩 Nuevo mensaje de contacto',
  });

  // Opciones del correo.
  const mailOptions = {
    from: `"ProCivil Manager" <${MAIL_USER}>`,
    to: CONTACT_RECIPIENTS,
    subject,
    text: `Se ha recibido un nuevo mensaje desde el formulario de contacto:

Nombre: ${name}
Correo: ${email}
Teléfono: ${phone || 'No informado'}
Empresa / Copropiedad: ${company || 'No informada'}
Tipo de proyecto: ${projectLabel}

Mensaje:
${message}

Este mensaje fue generado automáticamente por ProCivil Manager.`,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
};

// =======================================================
// 3. Correo de bienvenida al registrar usuario
// =======================================================

/**
 * Envía un correo de bienvenida cuando se crea un nuevo usuario.
 *
 * @param {string} to        Correo del nuevo usuario.
 * @param {string} fullName  Nombre completo del usuario.
 */
const sendWelcomeEmail = async (to, fullName) => {
  // Crea transporter OAuth2.
  const transporter = await createOAuthTransporter();

  // Asunto del correo.
  const subject = 'Bienvenido a ProCivil Manager';

  // Cuerpo HTML de bienvenida, alineado a tu tipo de clientes.
  const bodyHtml = `
    <p style="margin:0 0 12px 0;">
      Hola <strong>${fullName}</strong>,
    </p>
    <p style="margin:0 0 12px 0;">
      ¡Gracias por unirte a <strong>ProCivil Manager</strong>! A partir de ahora cuentas con una
      plataforma pensada para centralizar la gestión de tus proyectos de ingeniería civil,
      propiedad horizontal e infraestructura en Colombia.
    </p>
    <p style="margin:0 0 10px 0;">
      Con tu usuario podrás:
    </p>
    <ul style="margin:0 0 16px 18px;padding:0;color:#d1d5db;font-size:13px;line-height:1.7;">
      <li>Consultar el estado de tus obras y requerimientos en tiempo real.</li>
      <li>Revisar avances, actas, informes y documentación técnica en un solo lugar.</li>
      <li>Recibir alertas sobre hitos, visitas de obra y comunicaciones del equipo técnico.</li>
    </ul>
    <p style="margin:0 0 14px 0;">
      Cuando tu cuenta esté activa, podrás ingresar desde:
      <br/>
      <a href="${FRONTEND_URL}" style="color:#60A5FA;text-decoration:none;">${FRONTEND_URL}</a>
    </p>
    <p style="margin:0 0 8px 0;">
      Si no reconoces este registro o crees que se trata de un error, responde a este correo
      para que revisemos el caso.
    </p>
    <p style="margin:14px 0 0 0;">
      Un saludo,
      <br/>
      <strong>Equipo ProCivil Manager</strong>
    </p>
  `;

  // Plantilla completa PCM.
  const html = buildPcmEmailTemplate({
    title: '¡Bienvenido a ProCivil Manager!',
    preheader: 'Tu acceso a la plataforma de gestión de proyectos ha sido creado.',
    bodyHtml,
    badgeText: '✅ Cuenta creada correctamente',
  });

  // Opciones del correo.
  const mailOptions = {
    from: `"ProCivil Manager" <${MAIL_USER}>`,
    to,
    subject,
    text: `Hola ${fullName},

Tu cuenta en ProCivil Manager ha sido creada correctamente.

A partir de ahora podrás ingresar a la plataforma, consultar tus proyectos,
hacer seguimiento y recibir notificaciones del equipo técnico.

Si no reconoces este registro, por favor responde a este mensaje.

Saludos,
Equipo ProCivil Manager`,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
};

// =======================================================
// 4. Correo de notificación de nuevo proyecto (interno)
// =======================================================

/**
 * Envía una notificación interna cuando se crea una nueva solicitud de proyecto.
 *
 * @param {object} projectData Objeto con información básica del proyecto:
 *                             name, email, phone, projectType, location, message
 */
const sendProjectRequestEmail = async (projectData) => {
  // Crea transporter OAuth2.
  const transporter = await createOAuthTransporter();

  // Extrae campos del proyecto.
  const {
    name,
    email,
    phone = '',
    projectType = '',
    location = '',
    message = '',
  } = projectData;

  // Nombre amigable para el tipo de proyecto.
  const projectLabel = projectType || 'Sin clasificar';

  // Asunto del correo interno.
  const subject = `Nueva solicitud de proyecto - ${name}`;

  // Cuerpo HTML con datos de la solicitud.
  const bodyHtml = `
    <p style="margin:0 0 12px 0;">
      Se ha registrado una nueva solicitud de proyecto en <strong>ProCivil Manager</strong>.
    </p>
    <p style="margin:0 0 8px 0;font-size:12px;color:#9ca3af;">
      Detalles iniciales de la solicitud:
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0"
           style="width:100%;margin:8px 0 16px 0;border-collapse:collapse;font-size:12px;">
      <tr>
        <td style="padding:4px 0;color:#9ca3af;width:160px;">Nombre del proyecto:</td>
        <td style="padding:4px 0;color:#e5e7eb;font-weight:500;">${name}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#9ca3af;">Correo de contacto:</td>
        <td style="padding:4px 0;">
          <a href="mailto:${email}" style="color:#60A5FA;text-decoration:none;">${email}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#9ca3af;">Teléfono:</td>
        <td style="padding:4px 0;color:#e5e7eb;">${phone || 'No informado'}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#9ca3af;">Tipo de proyecto:</td>
        <td style="padding:4px 0;color:#e5e7eb;">${projectLabel}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#9ca3af;">Ubicación:</td>
        <td style="padding:4px 0;color:#e5e7eb;">${location || 'No informada'}</td>
      </tr>
    </table>
    <p style="margin:0 0 6px 0;font-weight:500;color:#e5e7eb;">Comentario del solicitante:</p>
    <p style="margin:0 0 12px 0;color:#d1d5db;">
      ${(message || 'Sin comentarios adicionales.').replace(/\n/g, '<br/>')}
    </p>
    <p style="margin:10px 0 0 0;font-size:12px;color:#9ca3af;">
      Puedes responder directamente a
      <a href="mailto:${email}" style="color:#60A5FA;text-decoration:none;">${email}</a>
      para coordinar visita técnica, levantamiento de información o envío de propuesta.
    </p>
  `;

  // Plantilla PCM.
  const html = buildPcmEmailTemplate({
    title: 'Nueva solicitud de proyecto',
    preheader: `Se ha registrado un nuevo proyecto: ${name}.`,
    bodyHtml,
    badgeText: '📁 Nueva solicitud de proyecto',
  });

  // Opciones del correo.
  const mailOptions = {
    from: `"ProCivil Manager" <${MAIL_USER}>`,
    to: CONTACT_RECIPIENTS,
    subject,
    text: `Se ha registrado una nueva solicitud de proyecto:

Nombre del proyecto: ${name}
Correo de contacto: ${email}
Teléfono: ${phone || 'No informado'}
Tipo de proyecto: ${projectLabel}
Ubicación: ${location || 'No informada'}

Mensaje adicional:
${message || 'Sin comentarios adicionales.'}

Este mensaje fue generado automáticamente por ProCivil Manager.`,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
};

// =======================================================
// Exportación del servicio
// =======================================================
module.exports = {
  sendPasswordResetEmail,   // Exporta función de recuperación de contraseña.
  sendContactNotification,  // Exporta función de notificación de contacto (interno).
  sendWelcomeEmail,         // Exporta función de bienvenida a la plataforma.
  sendProjectRequestEmail,  // Exporta función de notificación de nueva solicitud de proyecto.
};
