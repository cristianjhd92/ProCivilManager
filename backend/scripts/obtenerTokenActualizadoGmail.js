// File: BackEnd/scripts/obtenerTokenActualizadoGmail.js
// Description: Script de una sola ejecución para obtener el refresh token
//              de Gmail usando OAuth2 (cliente "installed").
//              Usa SIEMPRE http://localhost como redirect_uri,
//              que es lo que tienes en el credentials.json.

// Carga las variables de entorno (.env)
require('dotenv').config();

// Importa el SDK de Google para OAuth2
const { google } = require('googleapis');

// Importa readline para leer desde consola
const readline = require('readline');

// =============================
// Configuración básica OAuth2
// =============================

// TOMAMOS client_id y secret del .env
const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;

// AQUÍ YA NO USAMOS process.env, LO FIJAMOS A http://localhost
const REDIRECT_URI = 'http://localhost';

// Creamos el cliente OAuth2 con esos datos
const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,        // Client ID
  CLIENT_SECRET,    // Client Secret
  REDIRECT_URI      // Redirect URI FIJA: http://localhost
);

// Scopes necesarios para enviar correos con Gmail
const SCOPES = ['https://mail.google.com/'];

// Generamos la URL de autorización
const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',   // Necesario para obtener refresh_token
  prompt: 'consent',        // Fuerza a que entregue refresh_token
  scope: SCOPES,
});

console.log('==============================================');
console.log('  AUTORIZA EL ACCESO A GMAIL PARA PCM');
console.log('==============================================\n');
console.log('1) Abre esta URL en tu navegador (cópiala completa):\n');
console.log(authUrl + '\n');
console.log('2) Inicia sesión con la cuenta: ' + process.env.MAIL_USER);
console.log('3) Acepta los permisos de Gmail.');
console.log('4) El navegador intentará ir a http://localhost y mostrará error,');
console.log('   pero en la barra de direcciones verás algo como:');
console.log('   http://localhost/?code=4/0AfJohX...&scope=...\n');
console.log('5) Copia TODO el valor de "code" (lo que va después de code= y antes de &scope=).');
console.log('6) Pégalo aquí abajo y presiona Enter.\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Pega aquí el valor de "code":\n', async (code) => {
  try {
    const { tokens } = await oAuth2Client.getToken(code.trim());

    console.log('\n=== TOKENS OBTENIDOS ===\n');
    console.log('Access token :', tokens.access_token || '(no recibido)');
    console.log('Refresh token:', tokens.refresh_token || '(no recibido)');

    console.log('\n➡  Copia el Refresh token y ponlo en tu .env así:\n');
    console.log('GMAIL_REFRESH_TOKEN=' + (tokens.refresh_token || 'AQUI_EL_TOKEN'));
    console.log('\nLuego guarda el .env y reinicia el backend.');
  } catch (error) {
    console.error('\n❌ Error obteniendo los tokens:\n', error.message || error);
  } finally {
    rl.close();
  }
});
