# Nota sobre integridad referencial (2025-10-02)

## Lo que queda garantizado
- **FKs válidas:** `proyectos.owner`, `proyectos.client` y `proyectos.team[]` siempre referencian `users._id` **válidos**.
- **Unicidad lógica:** `{ owner, title }` con **collation ES (case-insensitive)** — pre-chequeo **409** en API + **índice unique** en BD.
- **Status validado** contra el **enum real del modelo** (en inglés): `planning | in_progress | paused | completed | cancelled`.
- **Validaciones de datos:** fechas (`startDate <= endDate`), numéricos (`budget >= 0`, `duration >= 0`), `progress (0..100)`. Respuestas enriquecidas con `populate`.
- **Seguridad:** rutas protegidas por **JWT** y **roles**; smoke **E2E OK** en la última corrida.

## Orden recomendado para re-ejecutar
```bash
node scripts/2025-10-02_fix_users_email_collation.js --apply
node scripts/2025-10-02_fix_indexes.js --apply
node scripts/2025-10-02_migrar_proyectos_fk.js
node scripts/2025-10-02_smoke_integridad_fk.js
```