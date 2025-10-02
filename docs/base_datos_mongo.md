# Base de Datos (MongoDB) — Integridad & Unicidad
## Índices
- `users.email` → unique + collation ES (strength:2).
- `proyectos.{owner,title}` → unique + collation ES.

## Scripts operativos
- `scripts/2025-10-02_fix_users_email_collation.js --apply`
- `scripts/2025-10-02_fix_indexes.js --apply`
- `scripts/2025-10-02_migrar_proyectos_fk.js`
- `scripts/2025-10-02_smoke_integridad_fk.js`

## Reglas validadas en API
- FKs válidas: `owner/client/team` referencian `users._id`.
- Unicidad `{owner,title}` (pre-chequeo 409 + índice).
- `status` contra enum del modelo (`planning|in_progress|paused|completed|cancelled`).
- Fechas (`startDate <= endDate`), numéricos (`budget,duration >= 0`), `progress(0..100)`.
