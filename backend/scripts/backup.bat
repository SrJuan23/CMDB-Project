@echo off
REM Backup automático de base de datos SQLite para Windows
REM Se recomienda ejecutar desde Task Scheduler

setlocal enabledelayedexpansion

set BACKUP_DIR=%~dp0backups
set DB_PATH=%~dp0data\cmdb.sqlite
set MAX_BACKUPS=30

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

if not exist "%DB_PATH%" (
  echo ERROR: Base de datos no encontrada en %DB_PATH%
  exit /b 1
)

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%_%datetime:~8,2%-%datetime:~10,2%-%datetime:~12,2%

set BACKUP_FILE=%BACKUP_DIR%\cmdb-backup-%TIMESTAMP%.sqlite

copy "%DB_PATH%" "%BACKUP_FILE%" >nul

if %errorlevel% neq 0 (
  echo ERROR: Fallo al crear backup
  exit /b 1
)

echo Backup exitoso: %BACKUP_FILE%

set count=0
for %%F in ("%BACKUP_DIR%\cmdb-backup-*.sqlite") do set /a count+=1

echo Backups actuales: %count%

endlocal
