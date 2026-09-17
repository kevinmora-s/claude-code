@echo off
REM ============================================================
REM  Crea 3 tareas programadas que corren descargar_todo.bat a
REM  las 7:00 AM, 12:00 MD y 4:00 PM todos los dias.
REM  Corren SOLO cuando tu sesion de Windows esta iniciada (para
REM  que puedas tocar la YubiKey si Midway lo pide).
REM ============================================================
setlocal
set "HERE=%~dp0"
set "BAT=%HERE%descargar_todo.bat"

schtasks /create /f /tn "FAR CSV 0700" /tr "\"%BAT%\"" /sc daily /st 07:00
schtasks /create /f /tn "FAR CSV 1200" /tr "\"%BAT%\"" /sc daily /st 12:00
schtasks /create /f /tn "FAR CSV 1600" /tr "\"%BAT%\"" /sc daily /st 16:00

echo.
echo Tareas creadas: "FAR CSV 0700", "FAR CSV 1200", "FAR CSV 1600".
echo Puedes verlas/editarlas en el Programador de tareas (taskschd.msc).
echo.
echo SUGERENCIA: en cada tarea, en Propiedades, activa
echo   "Ejecutar la tarea lo antes posible tras un inicio programado perdido"
echo para que si la PC estaba apagada a la hora, corra al encender.
echo.
echo Para BORRAR las tareas mas adelante, corre desinstalar_tareas.bat
endlocal
pause
