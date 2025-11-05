const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "construserviciosmdcolombia@gmail.com",
    pass: "gpef grlu lunb stzl", // App password
  },
});

// ✅ Recuperación de contraseña
const sendPasswordResetEmail = async (to, token, expiresAt) => {
  const resetUrl = `http://localhost:3000/cambio?token=${token}`;

  const html = `
    <div style="font-family:sans-serif;padding:30px;background-color:#f4f4f4">
      <div style="max-width:600px;margin:0 auto;background:white;border-radius:8px;overflow:hidden">
        <div style="background-color:#0a4974;color:white;padding:20px;text-align:center;font-weight:bold;font-size:20px">
          SGPCMD
        </div>
        <div style="padding:30px;text-align:center">
          <h2 style="color:#333">Recuperación de contraseña</h2>
          <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el siguiente botón para continuar.</p>
          <a href="${resetUrl}" style="display:inline-block;margin:20px 0;padding:12px 24px;background-color:#1a73e8;color:white;text-decoration:none;border-radius:5px;font-weight:bold">
            Restablecer contraseña
          </a>
          <p style="font-size:13px;color:#555">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
          <a href="${resetUrl}" style="font-size:12px;color:#1a73e8">${resetUrl}</a>
          <div style="background:#e0e0e0;margin-top:30px;padding:10px;font-size:12px;color:#555">
            <b>Seguridad:</b> este enlace caduca en <b>1 hora</b>. Si no solicitaste este cambio, ignora este mensaje.
          </div>
        </div>
        <div style="background:#f1f1f1;padding:20px;text-align:center;font-size:12px;color:#888">
          © 2025 SGPCMD. Todos los derechos reservados.<br />
          ¿Necesitas ayuda? <a href="mailto:construserviciosmdcolombia@gmail.com">construserviciosmdcolombia@gmail.com</a>
        </div>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: '"SGPCMD" <construserviciosmdcolombia@gmail.com>',
    to,
    subject: "Recuperación de contraseña",
    html,
  });
};

const sendContactNotification = async (contactData) => {
  const { email, name, message } = contactData;

 // console.log('Preparando correo con datos:', { email, name, message });

  const html = `
    <div style="font-family:sans-serif;padding:30px;background-color:#f4f4f4">
      <div style="max-width:600px;margin:0 auto;background:white;border-radius:8px;overflow:hidden">
        <div style="background-color:#0a4974;color:white;padding:20px;text-align:center;font-weight:bold;font-size:20px">
          SGPCMD
        </div>
        <div style="padding:30px">
          <h2 style="color:#333;text-align:center">Nuevo mensaje de contacto</h2>
          <p><strong>Nombre:</strong> ${name}</p>
          <p><strong>Correo:</strong> ${email}</p>
          <p><strong>Mensaje:</strong></p>
          <div style="background:#f9f9f9;border-left:4px solid #0a4974;padding:15px;margin-top:10px">
            ${message}
          </div>
        </div>
        <div style="background:#f1f1f1;padding:20px;text-align:center;font-size:12px;color:#888">
          Este mensaje fue generado automáticamente desde el formulario de contacto de SGPCMD.<br />
          ¿Necesitas ayuda? <a href="mailto:construserviciosmdcolombia@gmail.com">construserviciosmdcolombia@gmail.com</a><br />
          © 2025 SGPCMD. Todos los derechos reservados.
        </div>
      </div>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: '"SGPCMD Contacto" <construserviciosmdcolombia@gmail.com>',
      to: `${email}, contacto@gestionproyectos.com`, // envía a ambos
      subject: 'Nuevo mensaje de contacto',
      html,
    });

   // console.log('Correo enviado correctamente:', info.messageId);
  } catch (error) {
    console.error('Error enviando correo:', error);
    throw error; // para que lo manejes donde llames a esta función
  }
};

const sendWelcomeEmail = async (to, name) => {
  const html = `
    <div style="font-family:sans-serif;padding:30px;background-color:#f4f4f4">
      <div style="max-width:600px;margin:0 auto;background:white;border-radius:8px;overflow:hidden">
        <div style="background-color:#0a4974;color:white;padding:20px;text-align:center;font-weight:bold;font-size:20px">
          SGPCMD
        </div>
        <div style="padding:30px;text-align:center">
          <h2 style="color:#333">¡Bienvenido/a, ${name}!</h2>
          <p>Tu correo fue utilizado para crear una cuenta en nuestra plataforma SGPCMD.</p>
          <p>Si tú hiciste este registro, no necesitas hacer nada más. Si no fuiste tú, por favor contáctanos de inmediato.</p>
          <div style="margin-top:30px;padding:10px;font-size:12px;color:#555;background:#e0e0e0">
            <b>Correo:</b> ${to}<br/>
            <b>Fecha de registro:</b> ${new Date().toLocaleString()}
          </div>
        </div>
        <div style="background:#f1f1f1;padding:20px;text-align:center;font-size:12px;color:#888">
          © 2025 SGPCMD. Todos los derechos reservados.<br />
          ¿Necesitas ayuda? <a href="mailto:construserviciosmdcolombia@gmail.com">construserviciosmdcolombia@gmail.com</a>
        </div>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: '"SGPCMD" <construserviciosmdcolombia@gmail.com>',
    to,
    subject: 'Bienvenido/a a SGPCMD',
    html,
  });
};


const sendProjectRequestEmail = async (projectData) => {
  const { name, email, phone, projectType, location, message } = projectData;

  const html = `
    <div style="font-family:sans-serif;padding:30px;background-color:#f4f4f4">
      <div style="max-width:600px;margin:0 auto;background:white;border-radius:8px;overflow:hidden">
        <div style="background-color:#0a4974;color:white;padding:20px;text-align:center;font-weight:bold;font-size:20px">
          SGPCMD - Nueva solicitud de proyecto
        </div>
        <div style="padding:30px">
          <h2 style="color:#333;text-align:center">Detalles del proyecto solicitado</h2>
          <p><strong>Nombre del solicitante:</strong> ${name}</p>
          <p><strong>Correo electrónico:</strong> ${email}</p>
          <p><strong>Tipo de proyecto:</strong> ${projectType}</p>
          <p><strong>Ubicación del proyecto:</strong> ${location}</p>
          <p><strong>Mensaje adicional:</strong></p>
          <div style="background:#f9f9f9;border-left:4px solid #0a4974;padding:15px;margin-top:10px;white-space:pre-line">
            ${message}
          </div>
        </div>
        <div style="background:#f1f1f1;padding:20px;text-align:center;font-size:12px;color:#888">
          Este mensaje fue generado automáticamente desde el formulario de solicitud de proyecto en SGPCMD.<br />
          ¿Necesitas ayuda? <a href="mailto:construserviciosmdcolombia@gmail.com">construserviciosmdcolombia@gmail.com</a><br />
          © 2025 SGPCMD. Todos los derechos reservados.
        </div>
      </div>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: '"SGPCMD - Solicitudes" <construserviciosmdcolombia@gmail.com>',
      to: `${email}, contacto@gestionproyectos.com`, // ⚠️ Aquí se envía a ambos: usuario y admin
      subject: 'Nueva solicitud de proyecto',
      html,
    });

   // console.log('✅ Correo enviado correctamente:', info.messageId);
  } catch (error) {
   // console.error('❌ Error enviando correo de solicitud de proyecto:', error);
    throw error;
  }
};


module.exports = {
  sendPasswordResetEmail,
  sendContactNotification,
  sendWelcomeEmail, 
  sendProjectRequestEmail
};

