@echo off
REM ============================================================
REM  Abre Microsoft Edge en modo "depuracion" (puerto 9222) con
REM  un perfil dedicado para la automatizacion. En esta ventana
REM  inicias sesion en Midway UNA vez (PIN + YubiKey). Dejala abierta
REM  y luego corre:  python download_csvs.py --attach
REM ============================================================

set "DBG_PORT=9222"
set "PROFILE=%USERPROFILE%\EdgeAutomation"
set "URL=https://far-annotations.gamma.harmony.a2z.com/far-annotations/audit"

REM Ubicaciones tipicas de Edge; usa la primera que exista.
set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=msedge.exe"

echo.
echo  Abriendo Edge (perfil de automatizacion) en el puerto %DBG_PORT% ...
echo  - Si aparece Midway, inicia sesion normal (PIN + YubiKey).
echo  - Si te pide instalar la extension AEA, instalala en este perfil (solo la primera vez).
echo  - Deja esta ventana de Edge ABIERTA y corre:  python download_csvs.py --attach
echo.

start "" "%EDGE%" --remote-debugging-port=%DBG_PORT% --user-data-dir="%PROFILE%" "%URL%"
