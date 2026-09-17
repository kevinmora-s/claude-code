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
```
(No hace falta `playwright install chromium`: se usa el Microsoft Edge instalado.)

## Uso rapido (un clic)

Con todo instalado, basta con:

1. Doble clic a **`descargar_todo.bat`**. Abre Edge y corre la descarga de los 5.
2. Si Midway pide login, hazlo en la ventana (PIN + YubiKey). Los siguientes usos
   del dia reutilizan esa sesion.

## Corrida automatica (3 veces al dia)

1. Doble clic a **`instalar_tareas.bat`** (crea tareas a las 7:00, 12:00 y 16:00).
2. Listo. Cada dia corren solas **mientras tu sesion de Windows este iniciada**.

Para quitarlas: `desinstalar_tareas.bat`.

> IMPORTANTE (Midway + YubiKey): la autenticacion necesita tu **toque fisico de la
> YubiKey** cada cierto tiempo. Por eso las tareas corren solo con tu sesion abierta
> y la ventana visible: si la sesion de Midway expiro, la corrida abre Edge y espera
> a que toques la llave (hasta 10 min). Tipicamente tocas una vez en la manana (7:00)
> y las de 12:00 y 16:00 reutilizan la sesion sin pedir nada. Esto no se puede volver
> 100% desatendido porque la llave es un paso humano por diseno de seguridad.

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

## Correr en otra PC / PC virtual / la de un companero

El script es portable. En la otra maquina:

1. Copia esta carpeta completa (todos los `.py` y `.bat`).
2. `pip install playwright`.
3. Asegurate de que exista la ruta destino. Si la carpeta base es distinta a la
   de tu PC, **no edites el codigo**: define la variable de entorno `FAR_CSV_BASE`
   con la ruta correcta. Ejemplo (temporal, para probar):
   ```bat
   set "FAR_CSV_BASE=D:\Ruta\A\CSVs"
   descargar_todo.bat
   ```
   Dentro de esa base deben existir las subcarpetas `XDOF BBOX`, `PCS Concept BBOX`
   y `Polarity` (el script las crea si faltan).
4. Esa maquina tambien necesita Edge con la extension **AEA** y poder autenticar
   Midway (por eso funciona en equipos de la empresa).

Los IDs de las colas son los mismos para todos (es la misma app web), asi que no
hay que cambiar nada mas.

## Si algo falla

El script guarda automaticamente un **screenshot + HTML** en la carpeta `debug\`
cada vez que no encuentra algo, y un registro en `debug\run.log`.
Enviame esos archivos y lo ajusto.
