@echo off
REM Backup automático de base de datos PostgreSQL para Windows
REM Se recomienda ejecutar desde Task Scheduler

setlocal enabledelayedexpansion

set BACKUP_DIR=%~dp0backups
set MAX_BACKUPS=30
set PG_HOST=%PG_HOST%
set PG_PORT=%PG_PORT%
set PG_USER=%PG_USER%
set PG_DATABASE=%PG_DATABASE%
set PGPASSWORD=%PG_PASSWORD%

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%_%datetime:~8,2%-%datetime:~10,2%-%datetime:~12,2%

set BACKUP_FILE=%BACKUP_DIR%\cmdb-backup-%TIMESTAMP%.dump

pg_dump -h "%PG_HOST%" -p "%PG_PORT%" -U "%PG_USER%" -d "%PG_DATABASE%" -Fc -f "%BACKUP_FILE%"

if %errorlevel% neq 0 (
  echo ERROR: Fallo al crear backup
  exit /b 1
)

echo Backup exitoso: %BACKUP_FILE%

set count=0
for %%F in ("%BACKUP_DIR%\cmdb-backup-*.dump") do set /a count+=1

echo Backups actuales: %count%

endlocal
