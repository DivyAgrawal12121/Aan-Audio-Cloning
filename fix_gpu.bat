@echo off
echo ============================================================
echo      Resound Studio - GPU Fix (CUDA for PyTorch)
echo ============================================================
echo.
echo This script will install the CORRECT version of PyTorch
echo that supports your NVIDIA GPU (CUDA 12.1).
echo.
echo This will fix:
echo - "CUDA=False" warnings
echo - "NVML Error" in monitoring
echo - "Model not loading on GPU"
echo.
set /p confirm="Continue with reinstall (approx 2.5GB download)? (y/n): "
if /i "%confirm%" neq "y" exit /b

echo.
echo [1/3] Closing any active backend processes...
taskkill /IM python.exe /F 2>nul
taskkill /IM uvicorn.exe /F 2>nul

echo.
echo [2/3] Activating Virtual Environment...
cd apps\api
if not exist "venv" (
    echo [ERROR] venv not found.
    pause
    exit /b
)
call venv\Scripts\activate

echo.
echo [3/3] Installing CUDA-enabled PyTorch & Drivers...
echo This may take a few minutes. Please wait...
python -m pip install nvidia-ml-py
python -m pip install torch torchaudio torchvision --index-url https://download.pytorch.org/whl/cu121 --force-reinstall

echo.
echo ============================================================
echo FIX COMPLETE!
echo You can now use 'run.bat' to start the system.
echo ============================================================
pause
