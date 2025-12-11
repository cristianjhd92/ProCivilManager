// File: BackEnd/scripts/generarDatosPruebaPCM.js
// Description: Script de una sola ejecución para generar datos de prueba
//              realistas para ProCivil Manager (PCM) en MongoDB. Crea
//              usuarios (admin / líder / cliente), proyectos, materiales,
//              almacenes, movimientos de inventario, presupuestos,
//              solicitudes, contactos, alertas y registros de auditoría,
//              con fechas entre 2023 y la fecha actual y contexto propio
//              de la ingeniería civil colombiana.

// =============================
// Importaciones principales
// =============================

// Carga variables de entorno desde .env (incluye MONGO_URI, etc.).
require('dotenv').config(); // Permite usar process.env.MONGO_URI, PORT, etc.

// Importa Mongoose para poder cerrar la conexión al final del script.
const mongoose = require('mongoose'); // ODM para manejar MongoDB

// Importa la función de conexión reutilizada por el servidor principal.
const conectarBaseDatos = require('../src/config/conexionBaseDatos'); // Conecta a MongoDB

// Importa el modelo de usuarios.
const Usuario = require('../src/modules/users/models/usuario.modelo'); // Modelo Usuario

// Importa modelos de inventario y almacenes.
const Material = require('../src/modules/inventory/models/material.modelo'); // Modelo Material
const MovimientoInventario = require('../src/modules/inventory/models/inventario.modelo'); // Modelo Movimiento inventario
const Almacen = require('../src/modules/warehouses/models/almacen.modelo'); // Modelo Almacén

// Importa modelo de proyectos.
const Proyecto = require('../src/modules/projects/models/proyecto.modelo'); // Modelo Proyecto

// Importa modelo de presupuesto por proyecto.
const PresupuestoMaterial = require('../src/modules/budgets/models/presupuesto.modelo'); // Modelo PresupuestoMaterial

// Importa modelos de solicitudes, contactos, alertas y auditoría.
const Solicitud = require('../src/modules/requests/models/solicitud.modelo'); // Modelo Solicitud
const Contacto = require('../src/modules/contacts/models/contacto.modelo'); // Modelo Contacto (formulario contacto)
const Alerta = require('../src/modules/alerts/models/alerta.modelo'); // Modelo Alerta
const AuditLog = require('../src/modules/audit/models/auditoria.modelo'); // Modelo Auditoría

// Importa bcrypt para encriptar las contraseñas por defecto.
const bcrypt = require('bcryptjs'); // Librería para hash de contraseñas

// =============================
// Constantes de configuración
// =============================

// Define la fecha mínima para los datos aleatorios (1 enero 2023).
const FECHA_INICIO_DATOS = new Date('2023-01-01'); // Límite inferior de fechas
// Define la fecha máxima como la fecha actual.
const FECHA_FIN_DATOS = new Date(); // Límite superior de fechas (hoy)

// Cantidades mínimas deseadas por "apartado" (módulo principal).
const CANTIDAD_MIN_USUARIOS = 45; // Suma de admins + líderes + clientes
const CANTIDAD_MIN_PROYECTOS = 40; // Número mínimo de proyectos
const CANTIDAD_MIN_MATERIALES = 40; // Número mínimo de materiales
const CANTIDAD_MIN_ALMACENES = 10; // Número mínimo de almacenes
const CANTIDAD_MIN_MOVIMIENTOS = 60; // Movimientos de inventario
const CANTIDAD_MIN_PRESUPUESTOS = 40; // Presupuestos (idealmente uno por proyecto)
const CANTIDAD_MIN_SOLICITUDES = 40; // Solicitudes
const CANTIDAD_MIN_CONTACTOS = 40; // Mensajes de formulario contacto
const CANTIDAD_MIN_ALERTAS = 40; // Alertas (el total efectivo será mayor)
const CANTIDAD_MIN_AUDITORIAS = 60; // Logs de auditoría

// Dominios configurados en roles.json del proyecto.
//  - @adminpcm.com → admin
//  - @liderpcm.com → líder de obra
//  - default (ej. @gmail.com) → cliente
const DOMINIO_ADMIN = '@adminpcm.com'; // Dominio para usuarios admin
const DOMINIO_LIDER = '@liderpcm.com'; // Dominio para líderes de obra
const DOMINIO_CLIENTE = '@gmail.com'; // Dominio para clientes (gmail realista)

// Contraseñas por defecto (se almacenan encriptadas en la base).
const PASSWORD_ADMIN_PLAINO = 'Admin1234**'; // Contraseña base para admin
const PASSWORD_LIDER_PLAINO = 'Lider1234**'; // Contraseña base para líder
const PASSWORD_CLIENTE_PLAINO = 'Cliente1234**'; // Contraseña base para cliente

// =============================
// Helpers utilitarios
// =============================

/**
 * Genera un número entero aleatorio entre min y max (incluyendo ambos).
 */
function enteroAleatorio(min, max) {
  const minEntero = Math.ceil(min); // Redondea hacia arriba el mínimo
  const maxEntero = Math.floor(max); // Redondea hacia abajo el máximo
  return Math.floor(Math.random() * (maxEntero - minEntero + 1)) + minEntero; // Entero en el rango
}

/**
 * Devuelve un elemento aleatorio de un arreglo.
 */
function elegirAleatorio(lista) {
  if (!lista || lista.length === 0) return null; // Evita errores de índice
  const indice = enteroAleatorio(0, lista.length - 1); // Índice aleatorio
  return lista[indice]; // Elemento aleatorio
}

/**
 * Genera una fecha aleatoria entre dos fechas dadas.
 */
function fechaAleatoriaEntre(inicio, fin) {
  const tInicio = inicio.getTime(); // Milisegundos fecha inicio
  const tFin = fin.getTime(); // Milisegundos fecha fin
  const tRandom = tInicio + Math.random() * (tFin - tInicio); // Interpolación aleatoria
  return new Date(tRandom); // Fecha resultante
}

/**
 * Normaliza un texto para usarlo en correos:
 *  - Minúsculas
 *  - Sin tildes ni caracteres especiales
 *  - Reemplaza espacios por puntos
 *  - Elimina caracteres no permitidos en correos.
 */
function normalizarTextoParaEmail(texto) {
  let resultado = (texto || '').toLowerCase(); // Convierte a minúsculas y evita null

  // Reemplaza vocales tildadas y ñ.
  resultado = resultado
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u')
    .replace(/ñ/g, 'n');

  // Reemplaza espacios por puntos.
  resultado = resultado.replace(/\s+/g, '.');

  // Elimina caracteres no permitidos (solo letras, números y puntos).
  resultado = resultado.replace(/[^a-z0-9\.]/g, '');

  // Evita múltiples puntos seguidos.
  resultado = resultado.replace(/\.+/g, '.');

  // Quita puntos al inicio o al final.
  resultado = resultado.replace(/^\./, '').replace(/\.$/, '');

  return resultado; // Retorna el texto normalizado para usar en correos
}

/**
 * Construye un correo dado un nombre, apellido y un dominio.
 */
function construirEmail(nombre, apellido, dominio) {
  const baseNombre = normalizarTextoParaEmail(nombre); // Normaliza el nombre
  const baseApellido = normalizarTextoParaEmail(apellido); // Normaliza el apellido

  let usuario = `${baseNombre}.${baseApellido}`; // Une nombre y apellido con punto

  // Si por alguna razón quedó vacío, usa un valor genérico.
  if (!usuario || usuario === '.') {
    usuario = 'usuario.pcm';
  }

  return `${usuario}${dominio}`; // Retorna el correo concatenando dominio
}

/**
 * Genera un número de teléfono colombiano genérico (fijo o celular) como string.
 */
function generarTelefonoColombiano() {
  const esCelular = Math.random() < 0.7; // 70% probabilidad de ser celular
  if (esCelular) {
    // Prefijos típicos de celulares en Colombia.
    const prefijos = [
      '300',
      '301',
      '302',
      '310',
      '311',
      '312',
      '313',
      '314',
      '315',
      '316',
      '317',
      '318',
      '319',
    ];
    const prefijo = elegirAleatorio(prefijos); // Elige un prefijo
    const resto = enteroAleatorio(1000000, 9999999); // Siete dígitos restantes
    return `${prefijo}${resto}`; // Retorna el número de celular
  } else {
    // Teléfono fijo genérico (ej. Bogotá 1, Eje Cafetero 6, etc.).
    const prefijosFijo = ['1', '6'];
    const prefijo = elegirAleatorio(prefijosFijo); // Elige prefijo fijo
    const resto = enteroAleatorio(1000000, 9999999); // Siete dígitos
    return `${prefijo}${resto}`; // Retorna el número fijo
  }
}

/**
 * Genera una dirección genérica en alguna ciudad colombiana.
 */
function generarDireccionColombia() {
  const ciudades = [
    'Bogotá D.C.',
    'Medellín, Antioquia',
    'Cali, Valle del Cauca',
    'Barranquilla, Atlántico',
    'Bucaramanga, Santander',
    'Cartagena, Bolívar',
    'Villavicencio, Meta',
    'Cúcuta, Norte de Santander',
    'Pereira, Risaralda',
    'Manizales, Caldas',
  ];

  const tiposVia = ['Calle', 'Carrera', 'Avenida', 'Transversal', 'Diagonal']; // Tipos de vía

  const numVia = enteroAleatorio(1, 170); // Número de vía
  const numCruce = enteroAleatorio(1, 180); // Número de cruce

  const ciudad = elegirAleatorio(ciudades); // Ciudad aleatoria

  // Retorna una dirección estilo colombiano.
  return `${elegirAleatorio(tiposVia)} ${numVia} # ${numCruce}-${enteroAleatorio(
    1,
    60
  )}, ${ciudad}`;
}

/**
 * Genera un nombre de empresa colombiana genérico.
 */
function generarNombreEmpresa() {
  const prefijos = [
    'Ingeniería y Construcciones',
    'Obras Civiles',
    'Infraestructura & Vías',
    'Soluciones Integrales',
    'Consultoría Técnica',
  ];
  const nombres = [
    'Andina',
    'Bogotá',
    'Altos de Colombia',
    'Vial Col',
    'InfraCol',
    'Vías y Puentes',
    'Proyectos Urbanos',
    'FerroVial',
    'Cemento y Acero',
  ];
  const tipos = ['SAS', 'LTDA', 'SA'];

  // Construye un nombre tipo "Ingeniería y Construcciones Andina SAS".
  return `${elegirAleatorio(prefijos)} ${elegirAleatorio(nombres)} ${elegirAleatorio(
    tipos
  )}`;
}

/**
 * Genera un título corto de proyecto de infraestructura/vial/edificación.
 */
function generarTituloProyecto() {
  const tipos = [
    'Mejoramiento vial',
    'Rehabilitación estructural de pavimento',
    'Construcción de placa huella',
    'Ampliación de calzada',
    'Reparación de espacio público',
    'Construcción de muros de contención',
    'Urbanismo y paisajismo',
    'Obras de drenaje pluvial',
    'Mantenimiento de vía rural',
    'Reforzamiento estructural',
  ];
  const elementos = [
    'en barrio residencial',
    'en zona industrial',
    'en vía principal',
    'en acceso a conjunto residencial',
    'en corredor escolar',
    'en zona comercial',
    'en sector mixto',
    'en parque lineal',
    'en corredor férreo',
    'en variante perimetral',
  ];

  // Une tipo y elemento en una frase tipo "Mejoramiento vial en vía principal".
  return `${elegirAleatorio(tipos)} ${elegirAleatorio(elementos)}`;
}

/**
 * Genera una descripción corta para un proyecto.
 */
function generarDescripcionProyecto() {
  const descripciones = [
    'Intervención de la estructura de pavimento, incluyendo mejoramiento de la subrasante, conformación de estructura granular y carpeta asfáltica.',
    'Obra orientada a mejorar la accesibilidad peatonal y vehicular, cumpliendo con la normatividad del IDU y el Manual de Espacio Público.',
    'Proyecto de mejoramiento integral de vía local con obras de drenaje, bordillos, andenes y señalización horizontal y vertical.',
    'Reforzamiento de muros de contención y estabilización de taludes con soluciones en concreto lanzado y anclajes pasivos.',
    'Construcción de placa huella en vía rural con cunetas laterales y sistemas de drenaje transversal.',
    'Mantenimiento periódico de corredor vial, fresado y reposición de carpeta asfáltica tipo MDC-2.',
    'Obras complementarias de urbanismo, paisajismo y mobiliario urbano en entorno residencial.',
    'Diseño y ejecución de obras de drenaje pluvial con rejillas, sumideros y redes en PVC sanitario.',
  ];

  return elegirAleatorio(descripciones); // Retorna una descripción aleatoria
}

/**
 * Genera un nombre de material de ingeniería civil.
 */
function generarNombreMaterial() {
  const materiales = [
    'Concreto MR-0 21 MPa',
    'Concreto MR-0 28 MPa',
    'Concreto estructural 3000 psi',
    'Acero de refuerzo A615 #3',
    'Acero de refuerzo A615 #4',
    'Acero de refuerzo A615 #5',
    'Tubería PVC sanitaria 6"',
    'Tubería PVC sanitaria 8"',
    'Tubería PVC aguas lluvias 10"',
    'Base granular BG-40',
    'Subbase granular SB-36',
    'Mezcla asfáltica MDC-2',
    'Mezcla asfáltica MAM-25',
    'Cemento tipo UG',
    'Cemento estructural',
    'Arena de río lavada',
    'Grava triturada 3/4"',
    'Acero estructural IPN',
    'Geotextil no tejido 200 g/m2',
    'Geotextil no tejido 400 g/m2',
    'Adoquín de concreto 8 cm',
    'Bordillo en concreto prefabricado',
    'Losa en concreto 10 cm',
    'Luminaria LED vial 100 W',
    'Poste metálico 9 m',
    'Sumidero tipo rejilla',
    'Caja de inspección 60x60',
    'Pintura tráfico blanco',
    'Pintura tráfico amarillo',
    'Baranda metálica de protección',
    'Malla eslabonada galvanizada',
    'Tornillería galvanizada',
    'Módulo de expansión para junta',
    'Mortero de reparación estructural',
    'Impermeabilizante acrílico',
    'Anclaje químico tipo epóxico',
    'Varilla corrugada 3/8"',
    'Placa metálica base',
    'Pernos de anclaje',
    'Panel de drywall RH',
    'Panel de fibrocemento',
    'Ladrillo estructural',
    'Ladrillo decorativo cara vista',
  ];

  return elegirAleatorio(materiales); // Retorna un nombre de material
}

/**
 * Genera una unidad de medida adecuada para materiales.
 */
function generarUnidadMaterial() {
  const unidades = ['m³', 'm²', 'm', 'kg', 'ton', 'unidad', 'juego', 'ml']; // Posibles unidades
  return elegirAleatorio(unidades); // Retorna una unidad aleatoria
}

/**
 * Genera una categoría general de material.
 */
function generarCategoriaMaterial() {
  const categorias = [
    'Concreto',
    'Acero de refuerzo',
    'Asfalto',
    'Granulares',
    'Tuberías',
    'Estructural',
    'Eléctrico',
    'Señalización',
    'Acabados',
    'Drenaje',
  ];

  return elegirAleatorio(categorias); // Retorna una categoría aleatoria
}

/**
 * Calcula un porcentaje de avance coherente según el estado (status) del proyecto.
 * - planning: entre 0% y 25%
 * - in-progress: entre 30% y 90%
 * - on-hold: entre 5% y 60%
 * - completed: 100%
 */
function calcularProgresoPorEstado(status) {
  switch (status) {
    case 'planning':
      return enteroAleatorio(0, 25);    // Proyectos en planeación inicial
    case 'in-progress':
      return enteroAleatorio(30, 90);   // Proyectos en ejecución activa
    case 'on-hold':
      return enteroAleatorio(5, 60);    // Proyectos suspendidos temporalmente
    case 'completed':
      return 100;                       // Proyectos finalizados
    default:
      return enteroAleatorio(0, 100);   // Fallback para estados desconocidos
  }
}

// =============================
// Generación de datos por módulo
// =============================

/**
 * Crea usuarios base: admins, líderes y clientes.
 */
async function crearUsuariosBase() {
  console.log('➡️ Creando usuarios (admin / líder / cliente)...');

  const nombres = [
    'Juan',
    'Carlos',
    'Andres',
    'Camilo',
    'Felipe',
    'Luisa',
    'Maria',
    'Ana',
    'Daniel',
    'Sofia',
    'Valentina',
    'Pedro',
    'Diana',
    'Carolina',
    'Julian',
    'Laura',
    'Sebastian',
    'Natalia',
  ];

  const apellidos = [
    'Hernandez',
    'Gomez',
    'Martinez',
    'Rodriguez',
    'Perez',
    'Lopez',
    'Ramirez',
    'Moreno',
    'Castro',
    'Rojas',
    'Torres',
    'Diaz',
    'Munoz',
    'Jimenez',
    'Vargas',
    'Cortes',
  ];

  const emailsUsados = new Set(); // Set para evitar correos duplicados

  // Calcula la cantidad de usuarios a crear de cada tipo.
  // La constante CANTIDAD_MIN_USUARIOS establece el mínimo total deseado.
  // Si se quieren más usuarios, incrementa este valor en .env o modifica la constante.
  const totalDeseado = Math.max(CANTIDAD_MIN_USUARIOS, 60);

  // Distribución: 10 % admins, 30 % líderes de obra y el resto clientes.
  const numAdmins = Math.max(3, Math.floor(totalDeseado * 0.1));
  const numLideres = Math.max(6, Math.floor(totalDeseado * 0.3));
  const numClientes = totalDeseado - numAdmins - numLideres;

  // Se generan los hashes de las contraseñas por defecto.
  const hashAdmin = await bcrypt.hash(PASSWORD_ADMIN_PLAINO, 10);
  const hashLider = await bcrypt.hash(PASSWORD_LIDER_PLAINO, 10);
  const hashCliente = await bcrypt.hash(PASSWORD_CLIENTE_PLAINO, 10);

  /**
   * Construye un objeto usuario con correo único y datos base.
   */
  function construirUsuarioUnico({ dominio, role, passwordHash }) {
    let firstName;
    let lastName;
    let email;
    let intentos = 0;

    // Bucle para garantizar correo único.
    do {
      firstName = elegirAleatorio(nombres);
      lastName = elegirAleatorio(apellidos);
      email = construirEmail(firstName, lastName, dominio);

      intentos += 1;

      // Si hay demasiados intentos con el mismo correo, agrega un sufijo numérico.
      if (intentos > 20 && emailsUsados.has(email)) {
        const sufijo = enteroAleatorio(1, 9999);
        const baseNombre = normalizarTextoParaEmail(firstName);
        const baseApellido = normalizarTextoParaEmail(lastName);
        email = `${baseNombre}.${baseApellido}${sufijo}${dominio}`;
      }
    } while (emailsUsados.has(email)); // Repite mientras el correo exista

    emailsUsados.add(email); // Marca el correo como usado

    const phone = generarTelefonoColombiano(); // Genera teléfono

    // Retorna el documento de usuario listo para insertarse.
    return {
      firstName,
      lastName,
      email,
      phone,
      password: passwordHash,
      role,
      status: true,
      isDeleted: false,
      loginAttempts: 0,
      token: null,
      resetToken: null,
      resetTokenExpires: null,
    };
  }

  const docsAdmins = [];
  const docsLideres = [];
  const docsClientes = [];

  // Construye admins.
  for (let i = 0; i < numAdmins; i++) {
    docsAdmins.push(
      construirUsuarioUnico({
        dominio: DOMINIO_ADMIN,
        role: 'admin',
        passwordHash: hashAdmin,
      })
    );
  }

  // Construye líderes.
  for (let i = 0; i < numLideres; i++) {
    docsLideres.push(
      construirUsuarioUnico({
        dominio: DOMINIO_LIDER,
        role: 'lider de obra',
        passwordHash: hashLider,
      })
    );
  }

  // Construye clientes.
  for (let i = 0; i < numClientes; i++) {
    docsClientes.push(
      construirUsuarioUnico({
        dominio: DOMINIO_CLIENTE,
        role: 'cliente',
        passwordHash: hashCliente,
      })
    );
  }

  // Inserta en la base de datos.
  const usuariosAdmins = await Usuario.insertMany(docsAdmins);
  const usuariosLideres = await Usuario.insertMany(docsLideres);
  const usuariosClientes = await Usuario.insertMany(docsClientes);

  const todosUsuarios = [...usuariosAdmins, ...usuariosLideres, ...usuariosClientes];

  console.log(
    `   ✔️ Usuarios creados -> Admins: ${usuariosAdmins.length}, Líderes: ${usuariosLideres.length}, Clientes: ${usuariosClientes.length}`
  );

  return {
    admins: usuariosAdmins,
    lideres: usuariosLideres,
    clientes: usuariosClientes,
    todos: todosUsuarios,
  };
}

/**
 * Crea almacenes y materiales asociados.
 */
async function crearAlmacenesYMateriales(lideres) {
  console.log('➡️ Creando almacenes y materiales...');

  const nombresAlmacenes = [
    'Almacén principal Bogotá',
    'Bodega Norte',
    'Bodega Sur',
    'Bodega Occidente',
    'Almacén de obra Nororiente',
    'Bodega Equipos y Herramientas',
    'Centro de acopio Zona Industrial',
    'Almacén de acabados',
    'Bodega Metalmecánica',
    'Almacén de prefabricados',
  ];

  // Construye documentos de almacenes usando líderes como encargados.
  const docsAlmacenes = nombresAlmacenes.map((nombre) => {
    const lider = elegirAleatorio(lideres);
    // Genera una dirección completa y extrae ciudad y departamento
    const direccionCompleta = generarDireccionColombia();
    const partesDir = direccionCompleta.split(',').map((p) => p.trim());
    // La primera parte después de la calle es la ciudad; si hay una segunda, es el departamento
    const ciudadExtraida = partesDir.length >= 2 ? partesDir[1] : '';
    const departamentoExtraido = partesDir.length >= 3 ? partesDir[2] : undefined;
    return {
      nombre,
      direccion: direccionCompleta,
      ciudad: ciudadExtraida || 'Bogotá',
      departamento: departamentoExtraido,
      pais: 'Colombia',
      telefono: generarTelefonoColombiano(),
      encargado: lider ? `${lider.firstName} ${lider.lastName}` : undefined,
      // Activo e isDeleted utilizan valores por defecto en el modelo.
    };
  });

  const almacenes = await Almacen.insertMany(docsAlmacenes); // Inserta almacenes

  // Define cuántos materiales se van a crear (mínimo la constante, pero se fuerza a 45).
  const cantidadMateriales = Math.max(CANTIDAD_MIN_MATERIALES, 45);
  const docsMateriales = [];

  for (let i = 0; i < cantidadMateriales; i++) {
    const nombreMaterial = generarNombreMaterial();
    const categoria = generarCategoriaMaterial();
    const unidad = generarUnidadMaterial();
    const precioUnitario = enteroAleatorio(15000, 950000); // Rango de precio unitario
    const almacen = elegirAleatorio(almacenes); // Almacén al que pertenece
    const stockDisponible = enteroAleatorio(10, 500); // Cantidad actual
    const stockMinimo = enteroAleatorio(5, 50); // Stock mínimo de seguridad

    docsMateriales.push({
      nombre: nombreMaterial,
      categoria,
      unidad,
      precioUnitario,
      // Guardamos la cantidad en dos campos por compatibilidad:
      cantidad: stockDisponible,
      cantidadDisponible: stockDisponible,
      stockMinimo,
      almacen: almacen ? almacen._id : undefined,
      isDeleted: false,
    });
  }

  const materiales = await Material.insertMany(docsMateriales); // Inserta materiales

  console.log(`   ✔️ Almacenes creados: ${almacenes.length}`);
  console.log(`   ✔️ Materiales creados: ${materiales.length}`);

  return {
    almacenes,
    materiales,
  };
}

/**
 * Crea proyectos asociados a líderes, clientes y materiales.
 */
async function crearProyectos({ lideres, clientes, materiales }) {
  console.log('➡️ Creando proyectos...');

  const tiposProyecto = [
    'vial',
    'espacio público',
    'edificación',
    'obra hidráulica',
    'infraestructura férrea',
    'urbanismo',
  ];

  // Estados actualizados según el nuevo modelo: planning, in-progress, on-hold, completed
  const estados = ['planning', 'in-progress', 'on-hold', 'completed'];

  const docsProyectos = [];

  for (let i = 0; i < CANTIDAD_MIN_PROYECTOS; i++) {
    const lider = elegirAleatorio(lideres); // Líder del proyecto
    const cliente = elegirAleatorio(clientes); // Cliente asociado

    // Genera fechas de inicio y fin de acuerdo con el rango de datos global.
    const fechaInicio = fechaAleatoriaEntre(FECHA_INICIO_DATOS, FECHA_FIN_DATOS);
    const duracionDias = enteroAleatorio(60, 540); // Duración simulada en días (2–18 meses)
    const fechaFinTentativa = new Date(
      fechaInicio.getTime() + duracionDias * 24 * 60 * 60 * 1000
    );

    // Construye materiales asignados al proyecto.
    const cantidadMaterialesProyecto = enteroAleatorio(3, 8);
    const materialesProyecto = [];
    const copiaMateriales = [...materiales]; // Copia del arreglo original

    for (let j = 0; j < cantidadMaterialesProyecto; j++) {
      const mat = elegirAleatorio(copiaMateriales);
      if (!mat) continue;

      const cantidadAsignada = enteroAleatorio(10, 300);
      const cantidadUtilizada = enteroAleatorio(0, cantidadAsignada);

      materialesProyecto.push({
        material: mat._id,
        cantidadAsignada,
        cantidadUtilizada,
        fechaAsignacion: fechaAleatoriaEntre(fechaInicio, fechaFinTentativa),
      });
    }

    // Escoge un estado y calcula el progreso según ese estado.
    const status = elegirAleatorio(estados);
    const progress = calcularProgresoPorEstado(status);

    // Genera la ubicación completa del proyecto y extrae ciudad y país.
    const direccionProyecto = generarDireccionColombia();
    const partesProyecto = direccionProyecto.split(',').map((p) => p.trim());
    const ciudadProyecto = partesProyecto.length >= 2 ? partesProyecto[1] : 'Bogotá';

    // Asigna prioridad aleatoria (alta, media, baja) para la prueba.
    const prioridades = ['alta', 'media', 'baja'];
    const priority = elegirAleatorio(prioridades);

    docsProyectos.push({
      title: generarTituloProyecto(),                    // Título del proyecto
      pais: 'Colombia',                                  // País fijo (contexto PCM)
      ciudad: ciudadProyecto,                            // Ciudad extraída de la dirección
      location: direccionProyecto,                       // Dirección completa
      type: elegirAleatorio(tiposProyecto),              // Tipo de proyecto
      budget: enteroAleatorio(100_000_000, 3_000_000_000), // Presupuesto global (COP)
      priority,                                          // Prioridad del proyecto
      comentario: generarDescripcionProyecto(),          // Descripción breve
      comentarios: [],                                   // Sin comentarios iniciales
      lider: lider ? lider._id : null,                   // Referencia al líder
      cliente: cliente ? cliente._id : null,             // Referencia al cliente
      equipo: [lider ? lider._id : null].filter(Boolean),// Equipo inicial con el líder (si existe)
      status,                                            // Estado actual del proyecto (status)
      progress,                                          // Avance porcentual coherente con el estado
      materiales: materialesProyecto,                    // Arreglo de materiales asignados
      isDeleted: false,                                  // Eliminación lógica desactivada
      startDate: fechaInicio,                            // Fecha de inicio
      endDate: fechaFinTentativa,                        // Fecha de fin estimada
    });
  }

  const proyectos = await Proyecto.insertMany(docsProyectos); // Inserta proyectos

  console.log(`   ✔️ Proyectos creados: ${proyectos.length}`);

  return proyectos;
}

/**
 * Crea presupuestos de materiales por proyecto.
 */
async function crearPresupuestos({ proyectos, materiales, usuarioAdmin }) {
  console.log('➡️ Creando presupuestos de materiales por proyecto...');

  const docsPresupuestos = [];

  for (let i = 0; i < proyectos.length; i++) {
    if (docsPresupuestos.length >= CANTIDAD_MIN_PRESUPUESTOS) break; // Respeta mínimo configurado

    const proyecto = proyectos[i]; // Proyecto actual

    const numItems = enteroAleatorio(3, 7); // Número de renglones de materiales
    const items = [];
    let totalPresupuesto = 0; // Acumulador del total

    for (let j = 0; j < numItems; j++) {
      const material = elegirAleatorio(materiales);
      if (!material) continue;

      const cantidad = enteroAleatorio(10, 200);
      const costo =
        cantidad * (material.precioUnitario || enteroAleatorio(50_000, 600_000));

      totalPresupuesto += costo; // Suma el costo al total

      items.push({
        material: material._id,
        cantidadPrevista: cantidad,
        costoPrevisto: costo,
      });
    }

    docsPresupuestos.push({
      proyecto: proyecto._id,
      totalPresupuesto,
      items,
      createdBy: usuarioAdmin ? usuarioAdmin._id : undefined,
    });
  }

  const presupuestos = await PresupuestoMaterial.insertMany(docsPresupuestos);

  console.log(`   ✔️ Presupuestos creados: ${presupuestos.length}`);

  return presupuestos;
}

/**
 * Crea movimientos de inventario asociados a materiales, almacenes y proyectos.
 */
async function crearMovimientosInventario({ materiales, almacenes, proyectos }) {
  console.log('➡️ Creando movimientos de inventario...');

  const docsMovimientos = [];
  const tiposMovimiento = ['entrada', 'salida', 'ajuste']; // Tipos de movimiento

  for (let i = 0; i < CANTIDAD_MIN_MOVIMIENTOS; i++) {
    const material = elegirAleatorio(materiales);
    const almacen = elegirAleatorio(almacenes);
    const proyecto = elegirAleatorio(proyectos);

    const tipo = elegirAleatorio(tiposMovimiento); // Tipo de movimiento
    const cantidad = enteroAleatorio(5, 120); // Cantidad movida
    const fechaMovimiento = fechaAleatoriaEntre(FECHA_INICIO_DATOS, FECHA_FIN_DATOS); // Fecha

    let descripcion = '';
    if (tipo === 'entrada') {
      descripcion = 'Entrada de materiales por compra / abastecimiento.';
    } else if (tipo === 'salida') {
      descripcion = 'Salida de materiales para obra asociada al proyecto.';
    } else {
      descripcion = 'Ajuste de inventario por conteo físico.';
    }

    docsMovimientos.push({
      tipo,
      material: material ? material._id : undefined,
      almacen: almacen ? almacen._id : undefined,
      cantidad,
      motivo: descripcion,
      descripcion,
      usuario: 'script-semilla@pcm',
      proyecto: proyecto ? proyecto._id : undefined,
      fechaMovimiento,
      stockAnterior: null,
      stockNuevo: null,
    });
  }

  const movimientos = await MovimientoInventario.insertMany(docsMovimientos);

  console.log(`   ✔️ Movimientos de inventario creados: ${movimientos.length}`);

  return movimientos;
}

/**
 * Crea solicitudes de proyecto y materiales.
 * Usa estados válidos según el modelo:
 * ['pendiente', 'aprobada', 'rechazada', 'procesada'].
 */
async function crearSolicitudes({ clientes, lideres, proyectos, materiales }) {
  console.log('➡️ Creando solicitudes (proyecto / material)...');

  const docsSolicitudes = [];
  const estados = ['pendiente', 'aprobada', 'rechazada', 'procesada']; // Estados válidos

  for (let i = 0; i < CANTIDAD_MIN_SOLICITUDES; i++) {
    const tipo = Math.random() < 0.5 ? 'proyecto' : 'material'; // Tipo de solicitud

    const esCliente = Math.random() < 0.7; // 70% de probabilidad que sea cliente
    const solicitante = esCliente ? elegirAleatorio(clientes) : elegirAleatorio(lideres);

    const proyectoRelacionado = elegirAleatorio(proyectos);
    const materialRelacionado = elegirAleatorio(materiales);

    let titulo;
    if (tipo === 'proyecto') {
      titulo = `Solicitud de nuevo proyecto: ${generarTituloProyecto()}`;
    } else {
      titulo = `Solicitud de materiales adicionales: ${
        materialRelacionado ? materialRelacionado.nombre : 'Material'
      } para obra`;
    }

    const descripcion =
      tipo === 'proyecto'
        ? 'Solicitud para evaluar, diseñar y ejecutar un nuevo proyecto de infraestructura acorde a los lineamientos del conjunto / entidad.'
        : 'Solicitud de suministro adicional de materiales debido a ajustes de alcance y necesidades de obra en campo.';

    const estado = elegirAleatorio(estados); // Estado de la solicitud

    const fechaCreacion = fechaAleatoriaEntre(FECHA_INICIO_DATOS, FECHA_FIN_DATOS); // Fecha de creación
    const fechaActualizacion = fechaAleatoriaEntre(
      fechaCreacion,
      FECHA_FIN_DATOS
    ); // Fecha de última actualización

    const materialesSolicitados = [];
    if (tipo === 'material' && materialRelacionado) {
      const numRenglones = enteroAleatorio(1, 3);

      for (let j = 0; j < numRenglones; j++) {
        const cantidad = enteroAleatorio(5, 100);
        const observaciones =
          'Material requerido para garantizar continuidad de las actividades de obra.';

        materialesSolicitados.push({
          material: materialRelacionado._id,
          cantidadSolicitada: cantidad,
          observaciones,
        });
      }
    }

    docsSolicitudes.push({
      solicitante: solicitante ? solicitante._id : undefined,
      tipo,
      titulo,
      descripcion,
      proyecto: proyectoRelacionado ? proyectoRelacionado._id : undefined,
      materialesSolicitados,
      respuestas: [],
      estado,
      prioridad: Math.random() < 0.3 ? 'alta' : 'normal',
      fechaCreacion,
      fechaActualizacion,
    });
  }

  const solicitudes = await Solicitud.insertMany(docsSolicitudes);

  console.log(`   ✔️ Solicitudes creadas: ${solicitudes.length}`);

  return solicitudes;
}

/**
 * Crea mensajes del formulario de contacto público.
 * Se inserta directamente en la colección con bypassDocumentValidation
 * porque el enum de projectType del modelo es más restringido.
 */
async function crearContactos(clientes) {
  console.log('➡️ Creando mensajes de contacto (landing)...');

  const docsContactos = [];

  const tiposProyectoLanding = [
    'Diseño y construcción de vía interna',
    'Mantenimiento de parqueaderos',
    'Reparación de fachadas',
    'Diseño de drenaje pluvial',
    'Reforzamiento estructural',
    'Urbanismo y senderos peatonales',
  ];

  for (let i = 0; i < CANTIDAD_MIN_CONTACTOS; i++) {
    const clienteBase = Math.random() < 0.6 ? elegirAleatorio(clientes) : null;

    const nombre = clienteBase
      ? `${clienteBase.firstName} ${clienteBase.lastName}`
      : 'Contacto anónimo PCM';
    const email = clienteBase ? clienteBase.email : `contacto${i + 1}@gmail.com`;
    const phone = clienteBase ? clienteBase.phone : generarTelefonoColombiano();
    const empresa = clienteBase
      ? clienteBase.empresa || generarNombreEmpresa()
      : generarNombreEmpresa();
    const tipoProyecto = elegirAleatorio(tiposProyectoLanding);

    const mensaje =
      'Estoy interesado en recibir una propuesta técnica y económica para este proyecto, incluyendo diagnóstico y acompañamiento ante entidades competentes.';

    const createdAt = fechaAleatoriaEntre(FECHA_INICIO_DATOS, FECHA_FIN_DATOS);

    docsContactos.push({
      name: nombre,
      email,
      phone,
      company: empresa,
      projectType: tipoProyecto,
      message: mensaje,
      createdAt,
    });
  }

  const resultadoInsert = await Contacto.collection.insertMany(docsContactos, {
    bypassDocumentValidation: true,
  });

  console.log(`   ✔️ Mensajes de contacto creados: ${resultadoInsert.insertedCount}`);

  return docsContactos;
}

/**
 * Crea alertas basadas en proyectos, presupuestos, solicitudes y stock de materiales.
 * OJO: el modelo usa el campo message (inglés), por eso lo mapeamos así.
 */
async function crearAlertas({ proyectos, presupuestos, solicitudes, usuarios, materiales }) {
  console.log('➡️ Creando alertas del sistema...');

  const { admins, lideres, clientes } = usuarios;
  const docsAlertas = [];

  // 1) Alertas de presupuesto.
  presupuestos.forEach((presupuesto) => {
    const proyecto = proyectos.find(
      (p) => String(p._id) === String(presupuesto.proyecto)
    );
    if (!proyecto) return;

    const admin = elegirAleatorio(admins);

    const mensaje =
      'El costo de materiales del proyecto está alcanzando un porcentaje relevante del presupuesto referencial. Revisar y validar ajustes de alcance.';

    docsAlertas.push({
      proyecto: proyecto._id,
      usuario: admin ? admin._id : null,
      tipo: 'presupuesto',
      titulo: 'Presupuesto de materiales cercano al límite de obra',
      message: mensaje, // Campo correcto en el modelo
      resolved: false,
    });
  });

  // 2) Alertas de stock.
  const materialesParaStock =
    materiales.length > 10 ? materiales.slice(0, 10) : materiales;

  for (let i = 0; i < 10 && materialesParaStock.length > 0; i++) {
    const proyecto = elegirAleatorio(proyectos);
    const material = elegirAleatorio(materialesParaStock);
    const lider = elegirAleatorio(lideres);
    if (!proyecto || !material) continue;

    const mensaje = `El material "${material.nombre}" asociado al proyecto presenta niveles cercanos al stock mínimo definido. Revisar la programación de compras.`;

    docsAlertas.push({
      proyecto: proyecto._id,
      usuario: lider ? lider._id : null,
      tipo: 'stock',
      titulo: 'Stock de material cercano al mínimo',
      message: mensaje, // Campo correcto
      resolved: false,
    });
  }

  // 3) Alertas de solicitudes.
  solicitudes.forEach((sol) => {
    const destinatario =
      Math.random() < 0.5 ? elegirAleatorio(admins) : elegirAleatorio(lideres);

    let mensaje = '';
    if (sol.estado === 'pendiente') {
      mensaje = 'Tienes una nueva solicitud pendiente de revisión.';
    } else if (sol.estado === 'aprobada') {
      mensaje = 'Una solicitud ha sido aprobada y requiere gestión de ejecución.';
    } else if (sol.estado === 'rechazada') {
      mensaje = 'Una solicitud fue rechazada. Notificar al solicitante la justificación.';
    } else if (sol.estado === 'procesada') {
      mensaje =
        'Una solicitud ha sido procesada y su trámite fue finalizado en el sistema.';
    } else {
      mensaje = 'Una solicitud cambió de estado y requiere revisión.';
    }

    docsAlertas.push({
      solicitud: sol._id,
      usuario: destinatario ? destinatario._id : null,
      tipo: 'solicitud',
      titulo: `Solicitud "${sol.titulo}" - Estado: ${sol.estado}`,
      message: mensaje, // Campo correcto
      resolved: false,
    });
  });

  // 4) Alertas de asignación de líder de obra.
  proyectos.forEach((proyecto) => {
    if (!proyecto.lider || !proyecto.cliente) return;

    const cliente = clientes.find((c) => String(c._id) === String(proyecto.cliente));
    if (!cliente) return;

    const mensaje =
      'Te informamos que se ha asignado un líder de obra responsable para tu proyecto. Podrás ver el detalle en el panel de proyectos.';

    docsAlertas.push({
      proyecto: proyecto._id,
      usuario: cliente._id,
      tipo: 'asignacion',
      titulo: 'Se ha asignado un líder de obra a tu proyecto',
      message: mensaje, // Campo correcto
      resolved: false,
    });
  });

  const alertas = await Alerta.insertMany(docsAlertas);

  console.log(`   ✔️ Alertas creadas: ${alertas.length}`);

  return alertas;
}

/**
 * Crea registros de auditoría de acciones típicas.
 */
async function crearAuditoriaInicial({ usuarios, proyectos, materiales }) {
  console.log('➡️ Creando registros de auditoría...');

  const { admins, lideres } = usuarios;
  const docsAuditoria = [];

  const acciones = [
    'CREAR_PROYECTO',
    'ACTUALIZAR_PROYECTO',
    'ASIGNAR_LIDER',
    'REGISTRAR_MOVIMIENTO_INVENTARIO',
    'CREAR_SOLICITUD',
    'CAMBIAR_ESTADO_SOLICITUD',
    'ACTUALIZAR_USUARIO',
    'ELIMINAR_MATERIAL',
  ];

  for (let i = 0; i < CANTIDAD_MIN_AUDITORIAS; i++) {
    const usuario = Math.random() < 0.5 ? elegirAleatorio(admins) : elegirAleatorio(lideres);
    const action = elegirAleatorio(acciones);
    const fecha = fechaAleatoriaEntre(FECHA_INICIO_DATOS, FECHA_FIN_DATOS);

    let resource = 'Sistema';
    let resourceId = null;

    if (action.includes('PROYECTO')) {
      const proyecto = elegirAleatorio(proyectos);
      if (proyecto) {
        resource = 'Proyecto';
        resourceId = proyecto._id;
      }
    } else if (action.includes('MATERIAL')) {
      const material = elegirAleatorio(materiales);
      if (material) {
        resource = 'Material';
        resourceId = material._id;
      }
    } else if (action.includes('USUARIO')) {
      resource = 'Usuario';
      resourceId = usuario ? usuario._id : null;
    }

    const details = {
      descripcion: 'Registro automático generado por script de semillas PCM.',
      ip: '127.0.0.1',
      navegador: 'Script Node.js',
    };

    docsAuditoria.push({
      user: usuario ? usuario._id : null,
      action,
      resource,
      resourceId,
      details,
      createdAt: fecha,
    });
  }

  const auditorias = await AuditLog.insertMany(docsAuditoria);

  console.log(`   ✔️ Registros de auditoría creados: ${auditorias.length}`);

  return auditorias;
}

// =============================
// Orquestador principal
// =============================

/**
 * Función principal que orquesta la generación de todos los datos de prueba.
 */
async function ejecutar() {
  console.log('🚀 Iniciando generación de datos de prueba para ProCivil Manager (PCM)...');

  try {
    console.log('🔗 Conectando a MongoDB...');
    await conectarBaseDatos(); // Establece conexión

    console.log('🧹 Limpiando colecciones existentes (usuarios, proyectos, etc.)...');
    await Promise.all([
      Usuario.deleteMany({}),
      Material.deleteMany({}),
      Almacen.deleteMany({}),
      MovimientoInventario.deleteMany({}),
      Proyecto.deleteMany({}),
      PresupuestoMaterial.deleteMany({}),
      Solicitud.deleteMany({}),
      Contacto.deleteMany({}),
      Alerta.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);
    console.log('   ✔️ Colecciones limpiadas correctamente.');

    // 1) Usuarios base.
    const usuarios = await crearUsuariosBase();
    const adminReferencia = usuarios.admins[0]; // Admin que se usará como createdBy

    // 2) Almacenes y materiales.
    const { almacenes, materiales } = await crearAlmacenesYMateriales(usuarios.lideres);

    // 3) Proyectos.
    const proyectos = await crearProyectos({
      lideres: usuarios.lideres,
      clientes: usuarios.clientes,
      materiales,
    });

    // 4) Presupuestos por proyecto.
    const presupuestos = await crearPresupuestos({
      proyectos,
      materiales,
      usuarioAdmin: adminReferencia,
    });

    // 5) Movimientos de inventario.
    await crearMovimientosInventario({
      materiales,
      almacenes,
      proyectos,
    });

    // 6) Solicitudes.
    const solicitudes = await crearSolicitudes({
      clientes: usuarios.clientes,
      lideres: usuarios.lideres,
      proyectos,
      materiales,
    });

    // 7) Mensajes de contacto de la landing.
    await crearContactos(usuarios.clientes);

    // 8) Alertas.
    await crearAlertas({
      proyectos,
      presupuestos,
      solicitudes,
      usuarios,
      materiales,
    });

    // 9) Auditoría inicial.
    await crearAuditoriaInicial({
      usuarios,
      proyectos,
      materiales,
    });

    console.log('✅ Datos de prueba generados correctamente para todos los módulos principales.');
  } catch (error) {
    console.error('❌ Error durante la generación de datos de prueba:', error);
  } finally {
    // Cierre de conexión a MongoDB.
    await mongoose.connection.close();
    console.log('🔚 Conexión a MongoDB cerrada. Fin del script de semillas.');
    process.exit(0); // Finaliza el proceso de Node
  }
}

// Ejecuta el script solo si se llama directamente desde la línea de comandos.
if (require.main === module) {
  ejecutar();
}
