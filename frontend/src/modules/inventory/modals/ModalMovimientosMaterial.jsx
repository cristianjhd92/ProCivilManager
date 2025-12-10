// File: frontend/src/modules/inventory/modals/ModalMovimientosMaterial.jsx
// Description: Modal autónomo para visualizar el historial de movimientos de un material
//              de inventario en ProCivil Manager (PCM). Muestra ficha básica del material
//              (categoría, unidad, precio, stock) y el listado de movimientos de entrada/
//              salida. Ya NO usa ModalGenerico: implementa su propio overlay, cierre por ESC,
//              bloqueo de scroll del body y adaptación visual por rol usando las clases
//              .pcm-panel y .pcm-panel--ROL definidas en index.css, además del tema PCM
//              (paleta, sombras, bordes, helpers y animaciones).

// =========================
//   Importaciones básicas
// =========================
import React, {
  useEffect,                         // Hook para manejar efectos secundarios (carga, scroll, teclado).
  useState,                          // Hook para manejar estado local (movimientos, loading, error, rol).
  useMemo,                           // Hook para derivar valores calculados (rol visual y clases por rol).
} from 'react';

// =========================
//   Importación de íconos
// =========================
import {
  Package,                           // Ícono de caja para representar un material.
  ArrowUpCircle,                     // Ícono de flecha hacia arriba para movimientos de salida.
  ArrowDownCircle,                   // Ícono de flecha hacia abajo para movimientos de entrada.
  Calendar,                          // Ícono de calendario para la fecha del movimiento.
  DollarSign,                        // Ícono de dólar para el precio unitario.
  Warehouse,                         // Ícono de almacén para la ficha del material.
  ClipboardList,                     // Ícono de lista para el encabezado de movimientos.
  AlertCircle,                       // Ícono de alerta para errores o estados vacíos.
  Loader2,                           // Ícono tipo spinner para estados de carga.
} from 'lucide-react';

// =========================
//   Servicios de API PCM
// =========================
import { obtenerMovimientosInventario } from '../../../services/api/api.js'; // Servicio que trae la lista de movimientos de inventario.

/**
 * Componente ModalMovimientosMaterial
 *
 * Props:
 *  - materialSeleccionado: objeto del material cuyo historial de movimientos
 *                          se va a visualizar (contiene nombre, unidad, etc.).
 *  - alCerrar:             función para cerrar el modal, controlada por el
 *                          componente padre (overlay, botón de cerrar, tecla ESC).
 */
const ModalMovimientosMaterial = ({
  materialSeleccionado,              // Material actualmente seleccionado para ver su histórico.
  alCerrar,                          // Función que se ejecuta cuando se quiere cerrar el modal.
}) => {
  // ======================================================================
  //   Estado local (movimientos, carga, error)
  // ======================================================================

  const [movimientos, setMovimientos] = useState([]);     // Lista de movimientos filtrados y ordenados (inicia vacía).
  const [estaCargando, setEstaCargando] = useState(false); // Bandera booleana para el estado de carga desde la API.
  const [mensajeError, setMensajeError] = useState(null); // Texto de error para mostrar en la interfaz, null si no hay error.

  // Flag derivado: el modal está abierto si existe un material seleccionado.
  const estaAbierto = !!materialSeleccionado;             // Convierte el objeto en booleano (true si no es null/undefined).

  // ======================================================================
  //   Estado local de rol del usuario (para colores dinámicos por rol)
  // ======================================================================

  const [rolUsuario, setRolUsuario] = useState('lider');  // Rol lógico del usuario actual (por defecto líder de obra).

  // Efecto: lectura del usuario desde localStorage para detectar el rol lógico.
  useEffect(() => {
    try {
      const datoUsuario = localStorage.getItem('pcm_usuario'); // Lee el JSON del usuario almacenado en localStorage.
      if (datoUsuario) {
        const usuario = JSON.parse(datoUsuario);               // Parsea el JSON a objeto JS.

        const rolDetectado =
          usuario?.rol ||
          usuario?.role ||
          usuario?.tipoRol ||
          'lider';                                             // Valor por defecto si no se encuentra un rol explícito.

        setRolUsuario(rolDetectado);                           // Actualiza el rol lógico del usuario.
      }
    } catch (error) {
      console.error('Error al leer el rol del usuario en ModalMovimientosMaterial:', error);
      setRolUsuario('lider');                                  // Fallback seguro en caso de error.
    }
  }, []);                                                      // Solo al montar el componente.

  // Rol visual simplificado (admin / lider / cliente / auditor) para clases por rol.
  const rolVisual = useMemo(() => {
    const rolCrudo = (rolUsuario || '').toString().toLowerCase(); // Normaliza el rol a minúsculas para inspección.

    if (rolCrudo.includes('admin')) return 'admin';               // Roles que contienen "admin" → admin (azul).
    if (rolCrudo.includes('auditor')) return 'auditor';           // Roles que contienen "auditor" → auditor (morado).
    if (rolCrudo.includes('client') || rolCrudo.includes('cliente')) {
      return 'cliente';                                           // Roles de cliente → cliente (verde).
    }
    return 'lider';                                               // Cualquier otro caso → líder de obra (naranja).
  }, [rolUsuario]);                                               // Se recalcula si cambia el rol lógico.

  // Clases para aplicar las variables CSS de color por rol (definidas en index.css).
  const clasePanelRol = useMemo(() => {
    // Aplica .pcm-panel + modificador por rol para usar --pcm-color-acento, etc.
    if (rolVisual === 'admin') return 'pcm-panel pcm-panel--admin';
    if (rolVisual === 'cliente') return 'pcm-panel pcm-panel--cliente';
    if (rolVisual === 'auditor') return 'pcm-panel pcm-panel--auditor';
    return 'pcm-panel pcm-panel--lider';                          // Rol por defecto: líder de obra.
  }, [rolVisual]);

  // ======================================================================
  //   Efecto: cargar movimientos cuando cambia el material seleccionado
  // ======================================================================
  useEffect(() => {
    if (!materialSeleccionado) return;                       // Si no hay material, no se carga nada.

    // Función interna asíncrona para cargar movimientos desde la API.
    const cargarMovimientos = async () => {
      try {
        setEstaCargando(true);                               // Activa estado de carga.
        setMensajeError(null);                               // Limpia cualquier mensaje de error previo.

        // Llama al servicio que trae los movimientos desde el backend.
        const respuesta = await obtenerMovimientosInventario(); // Puede devolver arreglo o un objeto con .movimientos.

        // Normaliza la estructura: queremos trabajar siempre con un arreglo.
        const movimientosData = Array.isArray(respuesta)     // Si la respuesta ya es un arreglo...
          ? respuesta                                        // ...se usa tal cual.
          : Array.isArray(respuesta?.movimientos)            // Si tiene propiedad "movimientos" como arreglo...
          ? respuesta.movimientos                            // ...se usa esa propiedad.
          : [];                                              // En cualquier otro caso, se usa un arreglo vacío.

        // Obtiene el id del material seleccionado, tolerando _id o id.
        const idMaterialSeleccionado =
          materialSeleccionado._id || materialSeleccionado.id; // Usa _id si existe; si no, id genérico.

        // Filtra los movimientos que pertenecen a este material.
        const movimientosFiltrados = movimientosData.filter((movimiento) => {
          // Determina el id del material dentro de cada movimiento, tolerando varias estructuras posibles.
          const idMaterialEnMovimiento =
            movimiento.materialId ||                         // Caso 1: campo materialId.
            movimiento.material_id ||                        // Caso 2: campo material_id.
            (typeof movimiento.material === 'object'         // Caso 3: material es un objeto.
              ? movimiento.material?._id                     // Intenta usar su _id.
              : movimiento.material);                        // Caso 4: material como string (id directo).

          // Compara el id del movimiento con el id del material seleccionado.
          return idMaterialEnMovimiento === idMaterialSeleccionado; // true si pertenece al mismo material.
        });

        // Ordena los movimientos por fecha descendente (más recientes primero).
        const movimientosOrdenados = [...movimientosFiltrados].sort((a, b) => {
          const fechaA = a.fecha ? new Date(a.fecha).getTime() : 0; // Convierte fecha A a timestamp (0 si no hay fecha).
          const fechaB = b.fecha ? new Date(b.fecha).getTime() : 0; // Convierte fecha B a timestamp (0 si no hay fecha).
          return fechaB - fechaA;                                   // Ordena de más nuevo a más antiguo.
        });

        setMovimientos(movimientosOrdenados);           // Actualiza el estado con la lista final filtrada y ordenada.
      } catch (error) {
        console.error('Error al cargar movimientos:', error); // Log de consola útil en desarrollo.
        setMensajeError(
          'No se pudieron cargar los movimientos del material.' // Mensaje amigable al usuario en caso de error.
        );
      } finally {
        setEstaCargando(false);                         // Apaga siempre la bandera de carga (éxito o error).
      }
    };

    cargarMovimientos();                                // Ejecuta la función interna para cargar los movimientos.
  }, [materialSeleccionado]);                           // Se ejecuta cada vez que cambia el material seleccionado.

  // ======================================================================
  //   Efecto: bloquear scroll del body mientras el modal está abierto
  // ======================================================================
  useEffect(() => {
    if (!estaAbierto) return;                           // Si el modal está cerrado, no toca el body.

    const overflowOriginal = document.body.style.overflow; // Guarda el valor original del overflow.
    document.body.style.overflow = 'hidden';            // Deshabilita el scroll de fondo mientras el modal está abierto.

    return () => {
      document.body.style.overflow = overflowOriginal;  // Restaura el overflow original al cerrar o desmontar.
    };
  }, [estaAbierto]);                                    // Se ejecuta cuando cambia el estado de apertura del modal.

  // ======================================================================
  //   Efecto: cerrar el modal al presionar la tecla ESC
  // ======================================================================
  useEffect(() => {
    if (!estaAbierto) return;                           // Si no está abierto, no agrega el listener de teclado.

    const manejarKeyDown = (evento) => {                // Función que procesa eventos de teclado globales.
      if (evento.key === 'Escape') {                    // Si el usuario presiona la tecla ESC...
        if (typeof alCerrar === 'function') {           // Verifica que alCerrar sea una función válida.
          alCerrar();                                   // Ejecuta el cierre del modal.
        }
      }
    };

    window.addEventListener('keydown', manejarKeyDown); // Agrega listener global de teclado.

    return () => {
      window.removeEventListener('keydown', manejarKeyDown); // Limpia el listener al desmontar o cerrar.
    };
  }, [estaAbierto, alCerrar]);                          // Dependencias: estado de apertura y callback de cierre.

  // ======================================================================
  //   Guard de seguridad: sin material seleccionado no se renderiza nada
  // ======================================================================
  if (!materialSeleccionado) return null;               // Evita renderizar el modal si no hay material válido.

  // Texto de título principal del modal (siempre el nombre o un fallback).
  const tituloMaterial =
    materialSeleccionado.nombre || 'Material sin nombre'; // Fallback si el material no tiene nombre.

  // ======================================================================
  //   Render principal: overlay + contenedor centrado con borde animado
  // ======================================================================
  return (
    <div
      className={`
        ${clasePanelRol}                                 /* Aplica variables de color por rol (.pcm-panel--ROL). */
        fixed inset-0 z-40                               /* Cubre toda la pantalla, sobre el contenido.          */
        flex items-center justify-center                 /* Centra el modal en pantalla.                         */
        px-4 sm:px-6                                     /* Padding horizontal adaptable a breakpoints.          */
      `}
      aria-modal="true"                                  // Indica a lectores de pantalla que es un modal.
      role="dialog"                                      // Rol ARIA de diálogo.
      aria-labelledby="modal-movimientos-material-titulo" // Referencia al título del modal.
    >
      {/* Overlay de fondo: capa oscura que captura clics para cerrar el modal */}
      <div
        className="absolute inset-0 bg-black/75 pcm-overlay-suave" // Fondo oscuro con overlay PCM.
        onClick={alCerrar}                         // Clic en el overlay → cierra el modal.
      />

      {/* Contenedor centrado del modal con animación de entrada suave */}
      <div className="relative w-full max-w-3xl animate-entrada-suave-arriba">
        {/* Borde degradado animado PCM alrededor del card del modal */}
        <div className="pcm-borde-animado">
          {/* Contenido real del modal dentro del borde animado */}
          <div
            className="
              pcm-borde-animado-contenido             /* Aplica el recorte del borde animado.                 */
              bg-pcm-surface                          /* Fondo de tarjeta PCM para modales internos.          */
              rounded-[var(--radius-pcm-xl,1.5rem)]   /* Radio grande PCM coherente con el resto del sistema. */
              shadow-pcm-profunda                     /* Sombra profunda para resaltar el modal.              */
              border border-pcm-borderSoft            /* Borde suave PCM para el contorno del modal.          */
              text-pcm-text                           /* Texto en color principal PCM.                        */
              px-5 py-5 sm:px-6 sm:py-6               /* Padding interno adaptable a tamaños de pantalla.     */
            "
          >
            {/* Encabezado con información básica del material */}
            <div
              className="
                flex flex-col lg:flex-row lg:items-center justify-between
                mb-8 pb-6 gap-4
                border-b                                 /* Línea inferior como separador visual.               */
              "
              style={{
                borderBottomColor: 'var(--pcm-color-acento-border)', // Borde inferior según el color de acento del rol.
              }}
            >
              {/* Bloque con ícono y nombre del material */}
              <div className="flex items-center space-x-4">
                {/* Ícono del material dentro de un fondo coloreado por rol */}
                <div
                  className="
                    w-16 h-16
                    rounded-2xl
                    flex items-center justify-center
                    shadow-pcm-suave
                  "
                  style={{
                    backgroundColor: 'var(--pcm-color-acento)', // Fondo del ícono según el color de acento del rol.
                  }}
                >
                  <Package size={32} className="text-white" />  {/* Ícono de caja blanco para representar el material. */}
                </div>

                {/* Textos del encabezado: nombre del material y subtítulo */}
                <div>
                  <h3
                    id="modal-movimientos-material-titulo"     // Id enlazado con aria-labelledby en el contenedor raíz.
                    className="text-3xl font-bold mb-1"
                    style={{
                      color: 'var(--pcm-color-acento-strong)', // Título en color de acento fuerte del rol.
                    }}
                  >
                    {tituloMaterial}
                  </h3>
                  <p className="text-pcm-muted text-sm">       {/* Subtítulo con el contexto de la sección. */}
                    Historial de movimientos
                  </p>
                </div>
              </div>
            </div>

            {/* Sección de información general del material */}
            <div
              className="
                bg-pcm-surfaceSoft/70 backdrop-blur-sm
                rounded-2xl p-6
                border border-pcm-borderSoft
                mb-8
              "
            >
              <h4
                className="text-xl font-bold mb-6 flex items-center gap-2"
                style={{
                  color: 'var(--pcm-color-acento)',          // Título de sección en color de acento por rol.
                }}
              >
                <Warehouse size={22} />                       {/* Ícono de almacén para la ficha del material. */}
                Información del material
              </h4>

              {/* Grid con datos básicos (categoría, unidad, precio, stock) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                {/* Campo: Categoría */}
                <div>
                  <p
                    className="
                      font-semibold text-xs uppercase tracking-wider mb-1.5
                    "
                    style={{
                      color: 'var(--pcm-color-acento)',      // Etiqueta en color de acento.
                    }}
                  >
                    Categoría
                  </p>
                  <p className="text-pcm-text text-base capitalize">
                    {materialSeleccionado.categoria || 'Sin categoría'} {/* Fallback si no hay categoría. */}
                  </p>
                </div>

                {/* Campo: Unidad */}
                <div>
                  <p
                    className="
                      font-semibold text-xs uppercase tracking-wider mb-1.5
                    "
                    style={{
                      color: 'var(--pcm-color-acento)',      // Etiqueta en color de acento.
                    }}
                  >
                    Unidad
                  </p>
                  <p className="text-pcm-text text-base">
                    {materialSeleccionado.unidad || 'unidad'} // Fallback a “unidad” si no se define.
                  </p>
                </div>

                {/* Campo: Precio unitario */}
                <div>
                  <p
                    className="
                      font-semibold text-xs uppercase tracking-wider mb-1.5
                    "
                    style={{
                      color: 'var(--pcm-color-acento)',      // Etiqueta en color de acento.
                    }}
                  >
                    Precio unitario
                  </p>
                  <p className="text-pcm-text text-base flex items-center gap-2">
                    <DollarSign
                      size={16}
                      style={{ color: 'var(--pcm-color-acento)' }} // Ícono en color de acento.
                    />
                    $
                    {materialSeleccionado.precioUnitario
                      ? materialSeleccionado.precioUnitario.toLocaleString('es-CO') // Formato local colombiano.
                      : '0'}
                  </p>
                </div>

                {/* Campo: Stock actual */}
                <div>
                  <p
                    className="
                      font-semibold text-xs uppercase tracking-wider mb-1.5
                    "
                    style={{
                      color: 'var(--pcm-color-acento)',      // Etiqueta en color de acento.
                    }}
                  >
                    Stock actual
                  </p>
                  <p className="text-pcm-text text-base">
                    {materialSeleccionado.cantidad}{' '}
                    {materialSeleccionado.unidad || 'unidad'} // Muestra cantidad + unidad.
                  </p>
                </div>
              </div>
            </div>

            {/* Sección del historial de movimientos de inventario */}
            <div
              className="
                bg-pcm-surfaceSoft/70 backdrop-blur-sm
                rounded-2xl p-6
                border border-pcm-borderSoft
              "
            >
              <h4
                className="text-xl font-bold mb-6 flex items-center gap-2"
                style={{
                  color: 'var(--pcm-color-acento)',          // Título en color de acento por rol.
                }}
              >
                <ClipboardList size={22} />                   {/* Ícono de lista. */}
                Movimientos del inventario
              </h4>

              {/* Control de estados: cargando, error, lista con datos o vacía */}
              {estaCargando ? (
                // Estado: cargando movimientos desde la API.
                <div className="flex flex-col items-center justify-center py-10">
                  <Loader2
                    className="animate-spin mb-3"
                    size={36}
                    style={{
                      color: 'var(--pcm-color-acento)',      // Spinner en color de acento por rol.
                    }}
                  />
                  <p className="text-pcm-muted">
                    Cargando movimientos...
                  </p>
                </div>
              ) : mensajeError ? (
                // Estado: ocurrió un error al cargar los movimientos.
                <div className="text-center py-10 text-red-400">
                  <AlertCircle size={48} className="mx-auto mb-3" />
                  <p>{mensajeError}</p>
                </div>
              ) : movimientos.length > 0 ? (
                // Estado: hay movimientos para mostrar.
                <div className="space-y-4 max-h-96 pr-2 pcm-scroll-y">
                  {/* Recorre y pinta cada movimiento en una tarjeta */}
                  {movimientos.map((movimiento, indice) => {
                    const esEntrada = movimiento.tipo === 'entrada'; // true para entrada, false para salida.

                    // Texto de fecha legible en formato es-CO.
                    const textoFecha = movimiento.fecha
                      ? new Date(movimiento.fecha).toLocaleDateString('es-CO')
                      : 'Sin fecha';

                    // Determina el nombre del almacén (objeto o string).
                    const nombreAlmacen =
                      typeof movimiento.almacen === 'object' &&
                      movimiento.almacen !== null
                        ? movimiento.almacen.nombre
                        : movimiento.almacen;

                    // Determina el nombre/resumen del usuario responsable.
                    const nombreUsuario =
                      typeof movimiento.usuario === 'object' &&
                      movimiento.usuario !== null
                        ? movimiento.usuario.nombre ||
                          movimiento.usuario.email ||
                          'Usuario'
                        : movimiento.usuario;

                    return (
                      <div
                        key={indice}                          // Usa índice como key en este contexto controlado.
                        className="
                          bg-pcm-bg/60
                          rounded-xl p-5
                          border border-pcm-borderSoft
                          hover:bg-pcm-surfaceSoft/80
                          transition-all
                        "
                        style={{
                          borderColor: 'rgba(148,163,184,0.4)', // Borde base neutro suave.
                        }}
                      >
                        {/* Fila superior: tipo, descripción, cantidad y fecha */}
                        <div className="flex justify-between items-start mb-4">
                          {/* Lado izquierdo: ícono y tipo de movimiento */}
                          <div className="flex items-center gap-3">
                            {esEntrada ? (
                              <ArrowDownCircle
                                size={24}
                                className="text-green-400 shrink-0" // Ícono verde para entradas (shrink-0 permitido).
                              />
                            ) : (
                              <ArrowUpCircle
                                size={24}
                                className="text-red-400 shrink-0"   // Ícono rojo para salidas.
                              />
                            )}

                            <div>
                              <h5 className="text-white font-semibold text-lg mb-1 capitalize">
                                {movimiento.tipo}              {/* Tipo: entrada/salida/ajuste, etc. */}
                              </h5>
                              <p className="text-pcm-muted text-sm">
                                {movimiento.descripcion ||
                                  'Movimiento sin descripción'} // Fallback descriptivo.
                              </p>
                            </div>
                          </div>

                          {/* Lado derecho: cantidad movida y fecha */}
                          <div className="text-right">
                            <p
                              className={`
                                font-bold text-xl
                                ${esEntrada ? 'text-green-400' : 'text-red-400'}
                              `}
                            >
                              {movimiento.cantidad}{' '}
                              {materialSeleccionado.unidad || 'unidad'}
                            </p>
                            <p className="text-pcm-muted text-xs flex items-center justify-end gap-1 mt-1">
                              <Calendar
                                size={14}
                                style={{
                                  color: 'var(--pcm-color-acento)', // Ícono de calendario con color de acento.
                                }}
                              />
                              {textoFecha}
                            </p>
                          </div>
                        </div>

                        {/* Información adicional: almacén asociado */}
                        {nombreAlmacen && (
                          <p className="text-pcm-muted text-sm mt-1">
                            <strong
                              style={{
                                color: 'var(--pcm-color-acento)', // Etiqueta en color de acento.
                              }}
                            >
                              Almacén:
                            </strong>{' '}
                            {nombreAlmacen}
                          </p>
                        )}

                        {/* Información adicional: usuario responsable */}
                        {nombreUsuario && (
                          <p className="text-pcm-muted text-sm mt-1">
                            <strong
                              style={{
                                color: 'var(--pcm-color-acento)', // Etiqueta en color de acento.
                              }}
                            >
                              Responsable:
                            </strong>{' '}
                            {nombreUsuario}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Estado: no se encontraron movimientos para este material.
                <div className="text-center py-10">
                  <AlertCircle
                    size={48}
                    className="mx-auto text-pcm-muted mb-3"
                  />
                  <p className="text-pcm-muted text-lg">
                    No se registran movimientos para este material.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Exporta el componente por defecto para poder utilizarlo en otras vistas del panel.
export default ModalMovimientosMaterial;
