@echo off
title Rzeczy od Reki - Edytor Bazy Produktow

echo ========================================================
echo   Rzeczy od Reki - Kreator i Edytor Bazy Produktow
echo ========================================================
echo.
echo Sciezka skryptu: "%~dp0"
echo.

:: 1. Sprawdzenie czy folder edytora istnieje
if exist "%~dp0edytor_bazy" goto folder_ok
echo [BLAD] Nie odnaleziono folderu "edytor_bazy" w katalogu ze skryptem!
echo Oczekiwana lokalizacja: "%~dp0edytor_bazy"
echo.
echo Upewnij sie, ze plik uruchom.bat jest w tym samym folderze co folder "edytor_bazy".
echo.
pause
exit /b

:folder_ok

:: 2. Sprawdzenie instalacji Node.js
where node >nul 2>nul
if %errorlevel% equ 0 goto node_ok
echo [BLAD] Node.js nie jest zainstalowany lub nie zostal dodany do zmiennej PATH!
echo Program wymaga Node.js do dzialania wbudowanej synchronizacji Git i bazy.
echo.
echo KROKI DO NAPRAWY:
echo 1. Pobierz Node.js z oficjalnej strony: https://nodejs.org/ [wybierz wersje LTS]
echo 2. Zainstaluj go na komputerze [zaznacz opcje "Add to PATH" podczas instalacji].
echo 3. Po instalacji zrestartuj komputer i sprobuj uruchomic ten plik ponownie.
echo.
pause
exit /b

:node_ok

:: 3. Sprawdzenie instalacji npm
where npm >nul 2>nul
if %errorlevel% equ 0 goto npm_ok
echo [BLAD] Menedzer pakietow npm nie zostal odnaleziony!
echo Sprobuj przeinstalowac Node.js z oficjalnej strony.
echo.
pause
exit /b

:npm_ok

:: 4. Wejscie do folderu edytora
cd /d "%~dp0edytor_bazy"
if %errorlevel% equ 0 goto cd_ok
echo [BLAD] Nie mozna wejsc do folderu "edytor_bazy" lub odnalezc dysku!
echo Ściezka: "%~dp0edytor_bazy"
echo.
pause
exit /b

:cd_ok

:: 5. Instalacja pakietow jesli nie istnieja
if exist node_modules goto npm_installed
echo [System] Nie znaleziono folderu node_modules. Instalowanie pakietow npm [npm install]...
echo To moze zajac chwile przy pierwszym uruchomieniu...
echo.
call npm install
if %errorlevel% equ 0 goto npm_installed
echo.
echo [BLAD] Instalacja pakietow npm nie powiodla sie.
echo Sprobuj uruchomic ten plik jako Administrator lub sprawdz polaczenie z internetem.
echo.
pause
exit /b

:npm_installed

:: 6. Otwarcie przegladarki i start serwera
echo [System] Uruchamianie przegladarki z adresem http://localhost:3000 ...
start http://localhost:3000

echo [System] Uruchamianie serwera Node.js...
echo Jesli chcesz wylaczyc edytor, po prostu zamknij to czarne okno.
echo.
node server.js

if %errorlevel% equ 0 goto server_ended_ok
echo.
echo [BLAD] Serwer Node.js ulegl awarii lub zostal nieoczekiwanie zamkniety.
echo.
pause
exit /b

:server_ended_ok
echo.
echo [System] Serwer zostal wylaczony poprawnie.
pause
