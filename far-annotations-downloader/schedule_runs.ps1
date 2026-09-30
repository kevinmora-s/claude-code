# =============================================================================
#  schedule_runs.ps1  ->  Programa el Dashboard MRO para correr varias veces al dia
#  con el Programador de tareas de Windows (Task Scheduler).
#
#  Ejemplo (3 veces al dia):
#    powershell -ExecutionPolicy Bypass -File .\schedule_runs.ps1 -Times "07:00","12:00","16:00"
#
#  OJO: NO usa "Run All.bat" porque ese .bat termina con `pause` y colgaria la tarea.
#       Llama directo a run_all.py (sin pause).
#
#  PYTHON: usa el MISMO interprete que corre bien a mano (`python run_all.py`), porque el
#  refresh de Excel necesita pywin32 (que suele estar en el Python del SISTEMA, NO en el
#  empaquetado de KNIME). Se autodetecta resolviendo `python`; puedes forzarlo con -PythonExe.
#  Ese Python debe tener: pandas, openpyxl, calamine, playwright (extractores + FAR) + pywin32.
#
#  Por defecto la tarea corre "solo cuando el usuario esta logueado" (LogonType Interactive)
#  para que el drive W: siga existiendo. Si quieres que corra aunque nadie este logueado,
#  usa -RunAlways (necesitaras rutas UNC en vez de W: en los extractores).
# =============================================================================
param(
    [string[]]$Times = @("07:00","12:00","16:00"),            # horas del dia (24h)
    [string]$RunAllDir = "$env:USERPROFILE\Desktop\Knime-Run-All",  # carpeta que EJECUTA
    [string]$TaskName = "MRO Dashboard - Run All",
    [string]$PythonExe = "",                                  # forzar interprete; vacio = autodetectar
    [switch]$RunAlways                                        # correr aunque no haya sesion iniciada
)

$ErrorActionPreference = "Stop"

# --- Normaliza -Times: acepta un arreglo real O un solo string "07:00,12:00,16:00" ---
# (Al invocar con `powershell -File`, un arreglo llega como un unico string con comas.)
$Times = @($Times | ForEach-Object { $_ -split '[,; ]+' } | ForEach-Object { $_.Trim() } | Where-Object { $_ })
if (-not $Times) { throw "No se recibieron horas validas en -Times (ej. -Times '07:00','12:00','16:00')." }

$runAllPy = Join-Path $RunAllDir "run_all.py"
if (-not (Test-Path $runAllPy)) { throw "No encontre run_all.py en: $runAllPy  (ajusta -RunAllDir)" }

# --- Resolver el Python a usar (mismo que a mano; necesita pywin32 para el refresh) ---
if (-not $PythonExe) {
    $cmd = Get-Command python -ErrorAction SilentlyContinue
    if ($cmd) { $PythonExe = $cmd.Source }   # ruta completa del `python` del PATH
}
if (-not $PythonExe) {
    $PythonExe = Join-Path $env:LOCALAPPDATA "Programs\KNIME\bundling\org_knime_pythonscripting\.pixi\envs\default\python.exe"
    Write-Host "AVISO: usando el Python de KNIME como fallback; si falla por pywin32/playwright, pasa -PythonExe con tu Python del sistema." -ForegroundColor Yellow
}
if (-not (Test-Path $PythonExe)) { throw "No encontre Python: $PythonExe  (usa -PythonExe con la ruta correcta)" }

Write-Host "Programando '$TaskName'"
Write-Host "  run_all.py : $runAllPy"
Write-Host "  python     : $PythonExe"
Write-Host "  horas      : $($Times -join ', ')"
Write-Host "  modo       : $(if($RunAlways){'aunque NO haya sesion (necesita UNC, no W:)'}else{'solo con sesion iniciada (W: disponible)'})"

# Accion: correr run_all.py desde su carpeta.
$action = New-ScheduledTaskAction -Execute $PythonExe -Argument "`"$runAllPy`"" -WorkingDirectory $RunAllDir

# Un trigger diario por cada hora indicada.
$triggers = foreach ($t in $Times) { New-ScheduledTaskTrigger -Daily -At $t }

# Ajustes: si la maquina estaba apagada a la hora, arranca en cuanto pueda; no correr en paralelo.
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable `
    -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit (New-TimeSpan -Hours 2) `
    -DontStopOnIdleEnd

if ($RunAlways) {
    $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Password -RunLevel Limited
} else {
    $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
}

# Registra (reemplaza si ya existia).
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $triggers `
    -Settings $settings -Principal $principal -Force | Out-Null

Write-Host "`nListo. Tarea '$TaskName' registrada." -ForegroundColor Green
Write-Host "Verla:      Get-ScheduledTask -TaskName '$TaskName'"
Write-Host "Probarla:   Start-ScheduledTask -TaskName '$TaskName'   (dispara una corrida ya)"
Write-Host "Borrarla:   Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
