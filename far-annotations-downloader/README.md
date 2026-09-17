# FAR Annotations - Descarga automatica de CSVs

Automatiza la descarga de los 5 CSV de la seccion **Audit** y los guarda, ya
renombrados, en su carpeta correspondiente.

## Que descarga

| # | Seccion | Queue | Archivo | Carpeta |
|---|---------|-------|---------|---------|
| 1 | Job Queues | XDoF Bbox | `Annotations-<fecha>.csv` | `CSVs\XDoF Bbox\` |
| 2 | Job Queues | PCS Concept BBox | `Annotations-<fecha>.csv` | `CSVs\PCS Concept BBox\` |
| 3 | Review Queues | XDoF Bbox | `Audits-<fecha>.csv` | `CSVs\XDoF Bbox\` |
| 4 | Review Queues | PCS Concept BBox | `Audits-<fecha>.csv` | `CSVs\PCS Concept BBox\` |
| 5 | Job Queues | PCS Concept Polarity | `Annotations-<fecha>.csv` | `CSVs\PCS Concept Polarity\` |

Fecha = `MMDDYY` (mes sin cero, dia 2 digitos, anio 2 digitos). 17/sep/2026 -> `91726`.

## Instalacion (una sola vez, en la PC de trabajo)

```bat
pip install playwright
playwright install chromium
```

## Antes de la primera corrida: revisar la configuracion

Abre `download_csvs.py` y confirma, arriba en la seccion `CONFIGURACION`:

- `BASE_DIR` -> ruta base (por defecto `W:\My Documents\Dashboard_k2\Far-Annotation Data\CSVs`).
- Los nombres de `folder` en `TARGETS` -> deben coincidir **exactamente** con tus
  carpetas ya existentes (`XDoF Bbox`, `PCS Concept BBox`, `PCS Concept Polarity`).

## Uso

Corrida normal (descarga los 5, con ventana visible):

```bat
python download_csvs.py
```

La primera vez, si apareciera un login, complétalo en la ventana que se abre:
queda guardado en el perfil y las siguientes corridas ya no lo pediran.

> Los exports tardan (7-15 min cada uno). El script espera hasta 25 min por archivo.
> Es normal que la corrida completa tome cerca de una hora; puedes dejarla sola.

## Comandos utiles para afinar / diagnosticar

```bat
python download_csvs.py --discover      :: lista los queues y sus enlaces (sin descargar)
python download_csvs.py --only 3        :: corre solo el objetivo #3 (1..5)
python download_csvs.py --date 2026-09-17  :: forzar la fecha del nombre
python download_csvs.py --keep-open     :: deja el navegador abierto al terminar
```

## Si algo falla

El script guarda automaticamente un **screenshot + HTML** en la carpeta `debug\`
cada vez que no encuentra algo, y un registro en `debug\run.log`.
Enviame esos archivos y ajusto los selectores en una pasada.
