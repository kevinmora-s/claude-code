# Adaptación del MRO Manipulation Pillar Tool a R2PS (Tron HMI)

Estado: **Fase A implementada** (auto-fill por DOM para Dense). Userscript:
`Script/mro_userscript_fase2-wip.js` (V3.9.7).

## Contexto

El tool ya estaba integrado en **Labelbox** y **Harmony** (far-annotations). El trabajo
migra a **R2PS / Tron HMI** (`https://prod.hmi.tron.robotics.amazon.dev/`). Hoy conviven
las tres plataformas; cuando todo quede en R2PS se podrán retirar las demás.

R2PS es una SPA (AWS Cloudscape/Polaris) con backend propio (Cognito + API key +
telemetría a CloudWatch). El userscript ya tenía el `@match` de Tron, pero **ninguna
lógica**: los jobs caían a modo manual. Esta fase agrega el auto-fill, replicando el
patrón ya probado del módulo de Harmony (`autofillHarmonyPcs` + poll del SPA).

## Taxonomía de R2PS observada

- **`#/job-streams`** → lista de *Job Streams* (colas), con `Name` + `ID` (UUID):
  `Multiview`, `Multiview_Verification`, `STOW_RECONCILIATION`, `Dense_ID`,
  `Dense_ID_verification`, `Nike_Calibration_Prod`. Los `_verification` son las colas de QA.
- **`#/jobs`** → un job abierto. Panel `job-info-wrapper-container` con Stream, Job ID
  (UUID) y usuario de sesión. Verificación por **segmentos** (`Segments Created: N`,
  `Segments Labeled: x/y`), decisión **Accept / Rework** (`seg-accept-modal` /
  `seg-rework-modal`), notas por segmento, y takt: `Takt time: <s>` (respuesta del AA,
  tab `…-vote-1`) + `Takt: hh:mm:ss` (sesión del QA).

## Reglas del programa (WW35) que moldean el diseño

- **Sin batch**: el filtrado pasa a ser **Use Case + Week**. `batchName` queda vacío en R2PS.
- **Sin rework/disputa**: el QA corrige el error y el AA no disputa (al menos en Dense).
  No se tocan `Is Rework` / `Rework Round` / `Rework Status`.
- **Alcance actual**: solo **Dense**. Multiview e InTote entran después (faltan sus
  scripts + SOPs para extraer sus taxonomías y confirmar dónde se trabajan hoy).

## Mapeo campo → fuente en R2PS (Fase A)

| Campo (CSV) | Fuente en R2PS | Estado |
|---|---|---|
| `imageId` | Job ID (UUID) del `job-info` / testid `…-vote-1` | ✅ auto |
| `usecase` | Job Stream → `TRON_JOBSTREAM_MAP` (Dense_ID* → denseID) | ✅ auto |
| `labelCount` (Total Labels) | `Segments Created: N` | ✅ auto |
| takt del AA | `Takt time: <s>` → `tronAaSeconds` (para reporte de tiempos) | ✅ auto |
| takt del QA | cronómetro desde apertura del job (`tronQaStartMs`) | ✅ auto |
| `workWeek` | autocalculado de la fecha (ya existía) | ✅ auto |
| `auditor` | QA logueado (mecanismo QA Login existente) | ✅ existente |
| `jobURL` | `window.location.href` | ✅ auto |
| `batchName` | — (no aplica en R2PS) | ⛔ fuera |
| `isRework`/`reworkRound`/`reworkStatus` | — (no hay rework) | ⛔ fuera |
| `associateLogin` | pendiente de confirmar si está en el DOM/API | ⏳ manual (probe) |
| `isDefective`, `errorClassification`, `rootCause`, correct/incorrect/missing | juicio del QA | ✍️ manual |

## Qué se agregó al script

- Estado por job: `tronAaSeconds`, `tronQaStartMs`, `tronCurrentJob`, `tronPollTimer`.
- `mroIsTron()`, `mroIsTronJob()` (detecta `#/jobs`, no `#/job-streams`).
- `TRON_JOBSTREAM_MAP` (Dense por ahora) + `tronDetect()`.
- Lectores por patrón (robustos al reordenamiento del DOM): `readTronJobInfo()`
  (jobId por UUID/testid, stream por match más específico), `readTronSegmentCount()`,
  `readTronAaSeconds()`.
- `autofillTron()` + `startTronPoll()` **persistente y auto-detenible** (en R2PS la URL
  puede quedar fija en `#/jobs` al pasar de job; el poll detecta el cambio por `jobId`).
- Branch en `loadJob()`: si `mroIsTronJob()` → `setAllInteract()` + `startTronPoll()`.

Validado contra el snapshot real del job: extrae jobId `6fe80371-…`, stream
`Dense_ID_verification`, `Segments Created: 8`, takt AA `1382s`. `node --check` OK.

## Pendientes / próximos pasos

1. **Probe de `associateLogin`** (snippet de consola read-only) para confirmar si el login
   del AA es extraíble del DOM en R2PS. Define la solución de este campo.
2. **Plan B — toggle de Rol (QA / AA)** en un solo script: el AA aporta desde su sesión
   los campos que solo él conoce (su login, takt, use case, week) con `jobId` como clave
   de unión; KNIME hace el join. Aplica a todas las plataformas, empezando por R2PS.
3. **Multiview e InTote**: agregar sus taxonomías y entradas al `TRON_JOBSTREAM_MAP` cuando
   lleguen sus scripts + SOPs.
4. Ocultar en contexto R2PS los bloques de Batch/Rework en la UI (hoy solo se dejan sin
   completar; el ocultado es cosmético y se deja para una fase siguiente).
