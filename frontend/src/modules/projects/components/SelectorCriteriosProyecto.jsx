// File: frontend/src/modules/projects/components/SelectorCriteriosProyecto.jsx
// Description: Selector de criterios de avance para proyectos en ProCivil Manager.
//              Permite al usuario visualizar y marcar criterios como cumplidos
//              durante la creación o edición de un proyecto. Cada criterio
//              tiene asociado un porcentaje de contribución al avance total.
//              Al marcar o desmarcar criterios, el componente calcula el
//              porcentaje de avance basado exclusivamente en estos criterios
//              (suma de porcentajes cumplidos sobre suma total) y lo expone
//              a través de un callback.

import React, { useEffect, useState } from 'react';
import { CheckCircle, Circle, Info } from 'lucide-react';

// Plantillas base de criterios según el tipo de proyecto. Estas plantillas
// reflejan la configuración que también existe en el backend. Si en el
// futuro se añaden más tipos o prioridades específicas, estas plantillas
// pueden ampliarse o cargarse desde una fuente externa.
const PLANTILLAS_CRITERIOS = {
  // Plantilla genérica por defecto. Representa proyectos tipo "obra civil"
  // u otros tipos cuando no se puede determinar una plantilla específica.
  default: [
    {
      codigo: 'ALCANCE_DEFINIDO',
      nombre: 'Alcance del proyecto definido',
      descripcion:
        'Acta o documento de alcance del proyecto acordado con el cliente.',
      porcentaje: 10,
    },
    {
      codigo: 'DISENO_APROBADO',
      nombre: 'Diseño aprobado',
      descripcion:
        'Planos y memorias de diseño aprobados por las partes involucradas.',
      porcentaje: 20,
    },
    {
      codigo: 'PRESUPUESTO_APROBADO',
      nombre: 'Presupuesto aprobado',
      descripcion:
        'Presupuesto firmado/aprobado por el cliente o la administración.',
      porcentaje: 15,
    },
    {
      codigo: 'PERMISOS_Y_LICENCIAS',
      nombre: 'Permisos y licencias',
      descripcion:
        'Trámites con curaduría, IDU, alcaldía u otras entidades según aplique.',
      porcentaje: 15,
    },
    {
      codigo: 'INICIO_OBRA',
      nombre: 'Inicio de obra',
      descripcion:
        'Acta de inicio firmada y recursos mínimos disponibles en obra.',
      porcentaje: 15,
    },
    {
      codigo: 'AVANCE_FISICO_50',
      nombre: 'Avance físico ≥ 50%',
      descripcion:
        'Ejecución física de la obra igual o superior al 50% del alcance contratado.',
      porcentaje: 15,
    },
    {
      codigo: 'ENTREGA_FINAL',
      nombre: 'Entrega final',
      descripcion:
        'Acta de entrega final firmada y pendientes menores cerrados.',
      porcentaje: 10,
    },
  ],
  // Plantilla para proyectos viales. Adecuada para proyectos de espacio público o
  // infraestructuras lineales (vías, andenes, etc.).
  vial: [
    {
      codigo: 'LEVANTAMIENTO_TOP',
      nombre: 'Levantamiento topográfico',
      descripcion: 'Levantamiento topográfico y diagnóstico de estado actual.',
      porcentaje: 15,
    },
    {
      codigo: 'DISENO_GEOMETRICO',
      nombre: 'Diseño geométrico y estructural',
      descripcion: 'Diseño geométrico, estructural de pavimento y drenaje definido.',
      porcentaje: 20,
    },
    {
      codigo: 'PMT_APROBADO',
      nombre: 'PMT aprobado',
      descripcion: 'Plan de Manejo de Tránsito (PMT) aprobado por la autoridad competente.',
      porcentaje: 15,
    },
    {
      codigo: 'PERMISOS_INTERVENCION',
      nombre: 'Permisos de intervención',
      descripcion: 'Permisos de intervención de espacio público, redes y arborización.',
      porcentaje: 15,
    },
    {
      codigo: 'EJECUCION_CAPAS_BASE',
      nombre: 'Ejecución de capas base',
      descripcion: 'Capas de estructura de pavimento ejecutadas al menos al 50%.',
      porcentaje: 20,
    },
    {
      codigo: 'ENTREGA_VIAL',
      nombre: 'Entrega y señalización',
      descripcion: 'Señalización, demarcación y entrega formal de la vía.',
      porcentaje: 15,
    },
  ],
  // Plantilla para proyectos residenciales o edificaciones (no lineales).
  residencial: [
    {
      codigo: 'DISENO_ARQ',
      nombre: 'Diseño arquitectónico',
      descripcion: 'Diseño arquitectónico revisado y aprobado.',
      porcentaje: 15,
    },
    {
      codigo: 'DISENO_ESTRUC',
      nombre: 'Diseño estructural',
      descripcion:
        'Diseño estructural aprobado, incluyendo memorias y planos.',
      porcentaje: 20,
    },
    {
      codigo: 'LICENCIA_CONSTRUCCION',
      nombre: 'Licencia de construcción',
      descripcion:
        'Licencia de construcción expedida por la curaduría o entidad competente.',
      porcentaje: 15,
    },
    {
      codigo: 'CIMENTACION_COMPLETA',
      nombre: 'Cimentación completa',
      descripcion:
        'La cimentación y la estructura están construidas y recibidas a satisfacción.',
      porcentaje: 15,
    },
    {
      codigo: 'INSTALACIONES_COMPLETAS',
      nombre: 'Instalaciones completas',
      descripcion:
        'Instalaciones eléctricas e hidrosanitarias ejecutadas en su totalidad y probadas.',
      porcentaje: 20,
    },
    {
      codigo: 'ACABADOS_COMPLETOS',
      nombre: 'Acabados completos',
      descripcion:
        'Acabados arquitectónicos principales finalizados (pisos, muros, carpintería, etc.).',
      porcentaje: 15,
    },
  ],
};

/**
 * Dado un tipo de proyecto retornado por el usuario (texto libre), intenta
 * normalizarlo a una de las plantillas conocidas. Si no coincide con
 * ninguno de los patrones conocidos, se devuelve 'default'.
 *
 * @param {string} tipo Tipo de proyecto definido por el usuario.
 * @returns {string} Clave de plantilla (default, vial, residencial).
 */
function normalizarTipo(tipo) {
  const valor = (tipo || '').toString().trim().toLowerCase();
  // Busca coincidencias con palabras clave comunes.
  if (valor.includes('vial') || valor.includes('via')) return 'vial';
  if (valor.includes('resid') || valor.includes('edif') || valor.includes('residencial'))
    return 'residencial';
  // Por defecto, usa la plantilla genérica.
  return 'default';
}

/**
 * Dado un tipo de proyecto, devuelve una copia de los criterios base con
 * la propiedad adicional 'cumplido' inicializada en false. Esto se separa
 * para evitar modificar la plantilla original.
 *
 * @param {string} tipo Tipo de proyecto (se normaliza internamente).
 * @returns {Array} Arreglo de criterios con estructura { codigo, nombre, descripcion, porcentaje, cumplido }.
 */
function generarCriteriosPorTipo(tipo) {
  const clave = normalizarTipo(tipo);
  const base = PLANTILLAS_CRITERIOS[clave] || PLANTILLAS_CRITERIOS.default;
  // Devuelve una copia profunda de cada criterio con la propiedad cumplido.
  return base.map((c) => ({ ...c, cumplido: false, fechaCumplimiento: null }));
}

/**
 * Calcula el porcentaje de avance en función de los criterios. Suma los
 * porcentajes de criterios cumplidos y los divide por el total de
 * porcentajes para obtener un porcentaje entre 0 y 100. Si no hay criterios
 * válidos, se devuelve 0.
 *
 * @param {Array} criterios Arreglo de criterios con porcentaje y cumplido.
 * @returns {number} Porcentaje de avance de 0 a 100.
 */
function calcularAvancePorCriterios(criterios) {
  if (!Array.isArray(criterios) || criterios.length === 0) return 0;
  let sumaTotal = 0;
  let sumaCumplidos = 0;
  for (const criterio of criterios) {
    const porcentaje = Number(criterio.porcentaje);
    if (!Number.isFinite(porcentaje) || porcentaje <= 0) continue;
    sumaTotal += porcentaje;
    if (criterio.cumplido) {
      sumaCumplidos += porcentaje;
    }
  }
  if (sumaTotal <= 0) return 0;
  const pct = (sumaCumplidos / sumaTotal) * 100;
  // Normaliza entre 0 y 100 y redondea al entero más cercano.
  const pctNormalizado = Math.max(0, Math.min(100, Math.round(pct)));
  return pctNormalizado;
}

/**
 * Componente SelectorCriteriosProyecto. Permite visualizar y marcar
 * criterios de avance de acuerdo al tipo de proyecto. Informa al padre
 * cuando se modifican los criterios, entregando tanto el arreglo
 * actualizado como el porcentaje calculado.
 *
 * Props:
 * - tipo: string que define el tipo de proyecto (ej. "obra civil", "vial", etc.).
 * - criteriosIniciales: arreglo opcional de criterios ya existentes (modo edición).
 *   Si se omite, se generan a partir del tipo.
 * - onCriteriosChange: función callback que recibe (criterios, progreso)
 *   cada vez que cambian los criterios.
 */
const SelectorCriteriosProyecto = ({
  tipo = 'default',
  criteriosIniciales = null,
  onCriteriosChange = () => {},
}) => {
  // Estado local con el arreglo de criterios. Si se pasan criteriosIniciales,
  // se utilizan como estado inicial; de lo contrario, se generan por tipo.
  const [criterios, setCriterios] = useState(() => {
    if (Array.isArray(criteriosIniciales) && criteriosIniciales.length > 0) {
      // Copia profunda para evitar mutaciones.
      return criteriosIniciales.map((c) => ({ ...c }));
    }
    return generarCriteriosPorTipo(tipo);
  });

  // Cuando cambia el tipo de proyecto, si no tenemos criterios iniciales
  // proporcionados (lo que implica un modo edición), regeneramos la lista.
  useEffect(() => {
    if (!criteriosIniciales || criteriosIniciales.length === 0) {
      const nuevos = generarCriteriosPorTipo(tipo);
      setCriterios(nuevos);
      const avance = calcularAvancePorCriterios(nuevos);
      onCriteriosChange(nuevos, avance);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  // Efecto para informar al padre cuando los criterios cambian.
  useEffect(() => {
    const avance = calcularAvancePorCriterios(criterios);
    onCriteriosChange(criterios, avance);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criterios]);

  // Maneja el clic en un criterio para alternar su estado cumplido.
  const toggleCriterio = (indice) => {
    setCriterios((prev) =>
      prev.map((c, i) =>
        i === indice
          ? {
              ...c,
              cumplido: !c.cumplido,
              fechaCumplimiento: !c.cumplido ? new Date().toISOString() : null,
            }
          : c
      )
    );
  };

  // Renderiza la lista de criterios con checkboxes y descripciones.
  return (
    <section className="space-y-4">
      <h4 className="text-sm font-semibold text-pcm-primary flex items-center gap-2">
        <Info size={16} /> Criterios de avance
      </h4>
      {criterios.length === 0 ? (
        <p className="text-xs text-pcm-muted">No hay criterios definidos para este tipo de proyecto.</p>
      ) : (
        <ul className="space-y-3">
          {criterios.map((criterio, index) => (
            <li
              key={criterio.codigo || index}
              className="flex items-start gap-3 p-3 rounded-lg bg-pcm-bg/60 border border-white/10"
            >
              <button
                type="button"
                onClick={() => toggleCriterio(index)}
                className="mt-1"
              >
                {criterio.cumplido ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Circle className="w-5 h-5 text-pcm-muted" />
                )}
              </button>
              <div className="flex-1">
                <p className="text-sm font-semibold text-pcm-text">
                  {criterio.nombre}
                  <span className="text-xs text-pcm-accent ml-1">({criterio.porcentaje}%)</span>
                </p>
                <p className="text-[11px] text-pcm-muted">
                  {criterio.descripcion}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default SelectorCriteriosProyecto;