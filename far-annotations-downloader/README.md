# FAR Annotations - Descarga automatica de CSVs

Automatiza la descarga de los 5 CSV de la seccion **Audit** y los guarda, ya
renombrados, en su carpeta correspondiente.

## Que descarga

| # | Seccion | Queue | Archivo | Carpeta |
|---|---------|-------|---------|---------|
| 1 | Job Queues | XDoF Bbox | `Annotations-<fecha>.csv` | `CSVs\XDOF BBOX\` |
| 2 | Job Queues | PCS Concept BBox | `Annotations-<fecha>.csv` | `CSVs\PCS Concept BBOX\` |
| 3 | Review Queues | XDoF Bbox | `Audits-<fecha>.csv` | `CSVs\XDOF BBOX\` |
| 4 | Review Queues | PCS Concept BBox | `Audits-<fecha>.csv` | `CSVs\PCS Concept BBOX\` |
| 5 | Job Queues | PCS Concept Polarity | `Annotations-<fecha>.csv` | `CSVs\Polarity\` |

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
  carpetas ya existentes (`XDOF BBOX`, `PCS Concept BBOX`, `Polarity`).

## Uso con Midway / AEA (recomendado: modo --attach)

El sitio exige la extension **AEA** y login **Midway** (PIN + YubiKey), que viven
en tu Edge real. Por eso el script se **conecta a un Edge ya autenticado** en vez
de abrir uno nuevo:

1. Doble clic a **`launch_edge_debug.bat`**. Abre Edge (perfil de automatizacion)
   en el puerto 9222, en la pagina de Audit.
2. En esa ventana, inicia sesion en Midway (PIN + YubiKey). Si te pide instalar la
   extension AEA, instalala **una vez** en ese perfil. **Deja la ventana abierta.**
3. En PowerShell, corre el script con `--attach`:

```bat
python download_csvs.py --attach --discover   :: primero: listar enlaces (afinar)
python download_csvs.py --attach --only 1      :: probar un archivo
python download_csvs.py --attach               :: descargar los 5
```

El modo `--attach` reutiliza tu sesion, no cierra tu navegador y solo cierra la
pestana que abrio.

> Nota: la primera vez que corras `launch_edge_debug.bat`, ese perfil dedicado
> pedira login/AEA. Despues queda guardado y las siguientes veces es directo.

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
