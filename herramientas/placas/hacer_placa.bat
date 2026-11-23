@echo off
chcp 65001 >nul
title Placas AJolote ID
echo.
echo  === Placa nueva ===
echo  1) Arrastra aqui la FOTO del perro (o el DIBUJO de Gemini) y presiona Enter.
set /p ARCHIVO=  Archivo: 
set /p NOMBRE=  2) Nombre del perro: 
echo.
set /p ESDIBUJO=  3) Es un dibujo ya hecho por Gemini? (s/n): 
if /i "%ESDIBUJO%"=="s" (
  python "%~dp0pedido.py" --imagen %ARCHIVO% "%NOMBRE%"
) else (
  python "%~dp0pedido.py" %ARCHIVO% "%NOMBRE%"
)
echo.
start "" "%~dp0pedidos"
pause
