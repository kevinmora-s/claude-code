@echo off
REM ============================================================
REM  UN CLIC: abre Edge (perfil de automatizacion) con depuracion,
REM  espera a que responda y corre la descarga de los 5 CSVs.
REM  Si Midway pide login, hazlo en la ventana (PIN + YubiKey).
REM ============================================================
setlocal
set "DBG_PORT=9222"
set "PROFILE=%USERPROFILE%\EdgeAutomation"
set "URL=https://far-annotations.gamma.harmony.a2z.com/far-annotations/audit"
set "HERE=%~dp0"

REM Ubicaciones tipicas de Edge; usa la primera que exista.
set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=msedge.exe"

echo Abriendo Edge (puerto %DBG_PORT%) ...
start "" "%EDGE%" --remote-debugging-port=%DBG_PORT% --user-data-dir="%PROFILE%" "%URL%"

echo Esperando a que Edge responda ...
powershell -NoProfile -Command "for($i=0;$i -lt 40;$i++){try{$r=Invoke-WebRequest -UseBasicParsing http://127.0.0.1:%DBG_PORT%/json/version -TimeoutSec 2; if($r.StatusCode -eq 200){exit 0}}catch{}; Start-Sleep 1}; exit 1"
if errorlevel 1 (
  echo No pude confirmar que Edge quedo escuchando en el puerto %DBG_PORT%.
  echo Cierra todas las ventanas de Edge y vuelve a intentar.
  goto :fin
)

echo Corriendo la descarga ...
python "%HERE%download_csvs.py" %*

:fin
endlocal
