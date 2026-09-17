@echo off
REM Borra las 3 tareas programadas creadas por instalar_tareas.bat.
schtasks /delete /f /tn "FAR CSV 0700"
schtasks /delete /f /tn "FAR CSV 1200"
schtasks /delete /f /tn "FAR CSV 1600"
echo.
echo Tareas eliminadas (las que existieran).
pause
