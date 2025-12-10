// File: frontend/src/modules/projects/components/CriteriosAvanceProyecto.jsx
// Description: Componente visual para mostrar el progreso de un proyecto
//              en función de varios criterios (tiempo, estado, progreso manual
//              o presupuesto). Pensado para usarse en el detalle del proyecto,
//              el dashboard interno o cualquier vista que necesite explicar
//              de dónde sale el porcentaje de avance general.

// =========================
// Importaciones principales
// =========================
import React from "react";                  // Importa React para definir el componente funcional.
import {                                   // Importa íconos desde lucide-react para apoyo visual.
  Clock,                                   // Ícono para representar el criterio de tiempo.
  Flag,                                    // Ícono para representar el criterio de estado.
  TrendingUp,                              // Ícono para progreso manual/presupuesto.
} from "lucide-react";                     // Librería de íconos usada en todo PCM.

// =========================
// Componente principal
// =========================

/**
 * Componente que muestra el progreso total de un proyecto y el detalle por criterio.
 *
 * Props esperadas:
 * - progresoTotal: número 0–100 con el avance global.
 * - detalle: objeto con posibles claves { tiempo, estado, manual } en 0–100.
 * - titulo: texto opcional para el encabezado del bloque.
 */
const CriteriosAvanceProyecto = ({
  progresoTotal = 0,                       // Progreso global 0–100, con valor por defecto.
  detalle = {},                            // Objeto de detalle (tiempo, estado, manual).
  titulo = "Criterios de avance del proyecto", // Título mostrable en el encabezado del bloque.
}) => {
  // Extrae los valores individuales del detalle usando 0 como respaldo.
  const porcentajeTiempo = Number(detalle.tiempo ?? 0);   // Porcentaje asociado al criterio de tiempo.
  const porcentajeEstado = Number(detalle.estado ?? 0);   // Porcentaje asociado al criterio de estado.
  const porcentajeManual = Number(detalle.manual ?? 0);   // Porcentaje asociado al criterio manual/presupuesto.

  // Función auxiliar para asegurar que el porcentaje mostrado esté entre 0 y 100.
  const sanitizar = (valor) => {
    // Convierte a número.
    const num = Number(valor);
    // Si no es finito, devuelve 0.
    if (!Number.isFinite(num)) return 0;
    // Limita inferiormente a 0.
    if (num < 0) return 0;
    // Limita superiormente a 100.
    if (num > 100) return 100;
    // Redondea al entero más cercano.
    return Math.round(num);
  };

  // Normaliza todos los porcentajes antes de pintarlos.
  const totalNormalizado = sanitizar(progresoTotal);      // Progreso total normalizado.
  const tiempoNormalizado = sanitizar(porcentajeTiempo);  // Progreso por tiempo normalizado.
  const estadoNormalizado = sanitizar(porcentajeEstado);  // Progreso por estado normalizado.
  const manualNormalizado = sanitizar(porcentajeManual);  // Progreso manual/presupuesto normalizado.

  // Retorna la estructura visual usando el tema PCM.
  return (
    // Contenedor principal del bloque, usando la tarjeta PCM.
    <section
      className="
        pcm-card                          /* Tarjeta con fondo y borde PCM */
        w-full                            /* Ocupa todo el ancho disponible */
        flex flex-col                     /* Apila elementos en columna */
        gap-4                             /* Espaciado vertical interno */
      "
    >
      {/* Encabezado del bloque con título y porcentaje grande */}
      <header
        className="
          flex                             /* Distribuye título y número en fila */
          items-center                     /* Centra verticalmente el contenido */
          justify-between                  /* Separa el título del porcentaje */
          gap-3                            /* Espaciado entre elementos */
        "
      >
        {/* Título e información textual */}
        <div className="flex flex-col gap-1">
          <h3
            className="
              text-sm                       /* Tamaño de texto pequeño */
              font-semibold                 /* Peso de fuente semi-negrita */
              text-pcm-text                 /* Color de texto principal del tema PCM */
            "
          >
            {titulo}
          </h3>
          <p
            className="
              text-xs                       /* Texto pequeño para la descripción */
              text-pcm-muted                /* Color de texto atenuado PCM */
            "
          >
            Resumen del avance calculado combinando tiempo, estado y progreso
            manual o presupuestal.
          </p>
        </div>

        {/* Indicador numérico grande del progreso total */}
        <div
          className="
            flex items-center justify-center   /* Centra el círculo y el texto */
            rounded-full                      /* Círculo */
            border                            /* Borde para resaltar */
            border-pcm-primary/60             /* Borde con color principal semitransparente */
            bg-pcm-surfaceSoft                /* Fondo suave PCM */
            px-4 py-3                         /* Relleno interno */
          "
        >
          <span
            className="
              text-2xl                        /* Valor grande */
              font-bold                       /* Negrita fuerte */
              text-pcm-primary                /* Color primario PCM */
              leading-none                    /* Reduce altura de línea */
            "
          >
            {totalNormalizado}%
          </span>
        </div>
      </header>

      {/* Barra de progreso general debajo del encabezado */}
      <div className="flex flex-col gap-1">
        <div
          className="
            h-2                               /* Altura de la barra */
            w-full                            /* Ocupa todo el ancho */
            rounded-full                      /* Bordes redondeados */
            bg-pcm-surfaceSoft                /* Fondo suave PCM */
            overflow-hidden                   /* Oculta el relleno que se salga */
          "
        >
          <div
            className="
              h-full                          /* Misma altura que el contenedor */
              bg-pcm-primary                  /* Color del relleno */
              transition-all                  /* Transición suave en cambios */
              duration-300                    /* Duración estándar PCM */
            "
            style={{
              // Asigna el ancho dinámico según el porcentaje total.
              width: `${totalNormalizado}%`,
            }}
          />
        </div>
        <p
          className="
            text-[11px]                      /* Texto muy pequeño */
            text-pcm-muted                   /* Color atenuado PCM */
          "
        >
          El porcentaje total se calcula combinando criterios configurables en
          el backend. Este bloque solo los muestra de forma visual.
        </p>
      </div>

      {/* Detalle de criterios individuales */}
      <div
        className="
          grid                                /* Usa grid para colocar las tarjetas */
          grid-cols-1                         /* Una columna en pantallas muy pequeñas */
          gap-3                               /* Espacio entre tarjetas */
          sm:grid-cols-3                      /* En pantallas pequeñas: 3 columnas */
        "
      >
        {/* Tarjeta: avance por tiempo */}
        <article
          className="
            flex flex-col                     /* Apila contenido en columna */
            gap-2                             /* Espaciado interno */
            rounded-pcm-xl                    /* Borde redondeado PCM */
            border                            /* Borde sutil */
            border-pcm-surfaceSoft            /* Color de borde suave PCM */
            bg-pcm-surface                    /* Fondo de superficie PCM */
            p-3                               /* Relleno interno */
          "
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* Contenedor del ícono */}
              <div
                className="
                  rounded-full                 /* Ícono dentro de círculo */
                  bg-pcm-primary/10            /* Fondo con leve tinte del primario */
                  p-2                          /* Relleno alrededor del ícono */
                "
              >
                <Clock
                  className="
                    w-4 h-4                   /* Tamaño pequeño del ícono */
                    text-pcm-primary          /* Color primario PCM */
                  "
                />
              </div>
              <div className="flex flex-col">
                <span
                  className="
                    text-xs                    /* Texto pequeño */
                    font-semibold              /* Semi-negrita */
                    text-pcm-text              /* Color principal */
                  "
                >
                  Tiempo
                </span>
                <span
                  className="
                    text-[11px]               /* Texto muy pequeño */
                    text-pcm-muted            /* Color atenuado */
                  "
                >
                  Proporción del tiempo transcurrido entre inicio y fin.
                </span>
              </div>
            </div>
            {/* Valor numérico del criterio */}
            <span
              className="
                text-sm                        /* Tamaño medio */
                font-semibold                  /* Semi-negrita */
                text-pcm-primary               /* Color primario */
              "
            >
              {tiempoNormalizado}%
            </span>
          </div>

          {/* Barra de progreso del criterio */}
          <div
            className="
              h-2                               /* Altura barra */
              w-full                            /* Ocupa ancho completo */
              rounded-full                      /* Bordes redondeados */
              bg-pcm-surfaceSoft                /* Fondo suave */
              overflow-hidden                   /* Oculta relleno extra */
            "
          >
            <div
              className="
                h-full                          /* Misma altura */
                bg-pcm-primary                  /* Color del relleno */
                transition-all                  /* Transición suave */
                duration-300                    /* Duración estándar */
              "
              style={{
                // Ancho proporcional al porcentaje de tiempo.
                width: `${tiempoNormalizado}%`,
              }}
            />
          </div>
        </article>

        {/* Tarjeta: avance por estado */}
        <article
          className="
            flex flex-col
            gap-2
            rounded-pcm-xl
            border
            border-pcm-surfaceSoft
            bg-pcm-surface
            p-3
          "
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div
                className="
                  rounded-full
                  bg-pcm-accent/10
                  p-2
                "
              >
                <Flag
                  className="
                    w-4 h-4
                    text-pcm-accent
                  "
                />
              </div>
              <div className="flex flex-col">
                <span
                  className="
                    text-xs
                    font-semibold
                    text-pcm-text
                  "
                >
                  Estado
                </span>
                <span
                  className="
                    text-[11px]
                    text-pcm-muted
                  "
                >
                  Mapea estados (planificación, en progreso, completado).
                </span>
              </div>
            </div>
            <span
              className="
                text-sm
                font-semibold
                text-pcm-accent
              "
            >
              {estadoNormalizado}%
            </span>
          </div>

          <div
            className="
              h-2
              w-full
              rounded-full
              bg-pcm-surfaceSoft
              overflow-hidden
            "
          >
            <div
              className="
                h-full
                bg-pcm-accent
                transition-all
                duration-300
              "
              style={{
                width: `${estadoNormalizado}%`,
              }}
            />
          </div>
        </article>

        {/* Tarjeta: avance manual / presupuesto */}
        <article
          className="
            flex flex-col
            gap-2
            rounded-pcm-xl
            border
            border-pcm-surfaceSoft
            bg-pcm-surface
            p-3
          "
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div
                className="
                  rounded-full
                  bg-pcm-secondary/10
                  p-2
                "
              >
                <TrendingUp
                  className="
                    w-4 h-4
                    text-pcm-secondary
                  "
                />
              </div>
              <div className="flex flex-col">
                <span
                  className="
                    text-xs
                    font-semibold
                    text-pcm-text
                  "
                >
                  Progreso manual
                </span>
                <span
                  className="
                    text-[11px]
                    text-pcm-muted
                  "
                >
                  Ajuste realizado por el equipo (o según presupuesto).
                </span>
              </div>
            </div>
            <span
              className="
                text-sm
                font-semibold
                text-pcm-secondary
              "
            >
              {manualNormalizado}%
            </span>
          </div>

          <div
            className="
              h-2
              w-full
              rounded-full
              bg-pcm-surfaceSoft
              overflow-hidden
            "
          >
            <div
              className="
                h-full
                bg-pcm-secondary
                transition-all
                duration-300
              "
              style={{
                width: `${manualNormalizado}%`,
              }}
            />
          </div>
        </article>
      </div>
    </section>
  );
};

// Exporta el componente por defecto.
export default CriteriosAvanceProyecto;
