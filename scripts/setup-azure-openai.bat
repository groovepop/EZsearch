@echo off
echo ================================================================
echo   EZsearch AI Agent Provisioning Script (Azure CLI)
echo   Model: GPT-4o ^| Deployment: ezchat
echo ================================================================
echo.

:: 1. Configuration Variables
set RESOURCE_GROUP=EZsearch-rg
set LOCATION=eastus
set OPENAI_ACCOUNT=ezsearch-openai
set DEPLOYMENT_NAME=ezchat
set MODEL_NAME=gpt-4o
set MODEL_VERSION=2024-08-06
set WEBAPP_NAME=ezsearch-hub

echo [1/4] Checking Azure CLI login status...
call az account show >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] You are not logged into Azure CLI. Launching login...
    call az login
)

echo.
echo [2/4] Creating/Verifying Azure OpenAI Account (%OPENAI_ACCOUNT% in %LOCATION%)...
call az cognitiveservices account create ^
  --name %OPENAI_ACCOUNT% ^
  --resource-group %RESOURCE_GROUP% ^
  --location %LOCATION% ^
  --kind OpenAI ^
  --sku S0 ^
  --yes

echo.
echo [3/4] Deploying GPT-4o Model with Deployment Name '%DEPLOYMENT_NAME%'...
call az cognitiveservices account deployment create ^
  --resource-group %RESOURCE_GROUP% ^
  --name %OPENAI_ACCOUNT% ^
  --deployment-name %DEPLOYMENT_NAME% ^
  --model-name %MODEL_NAME% ^
  --model-version %MODEL_VERSION% ^
  --model-format OpenAI ^
  --sku-name "Standard" ^
  --sku-capacity 10

echo.
echo [4/4] Fetching Endpoint and API Key...
for /f "tokens=*" %%i in ('az cognitiveservices account show --name %OPENAI_ACCOUNT% --resource-group %RESOURCE_GROUP% --query "properties.endpoint" -o tsv') do set AZURE_ENDPOINT=%%i
for /f "tokens=*" %%i in ('az cognitiveservices account keys list --name %OPENAI_ACCOUNT% --resource-group %RESOURCE_GROUP% --query "key1" -o tsv') do set AZURE_KEY=%%i

echo.
echo ================================================================
echo   SUCCESS! Azure OpenAI GPT-4o (%DEPLOYMENT_NAME%) is ready!
echo   Endpoint:   %AZURE_ENDPOINT%
echo   Deployment: %DEPLOYMENT_NAME%
echo ================================================================
echo.

echo Configuring Web App App Settings on %WEBAPP_NAME%...
call az webapp config appsettings set ^
  --resource-group %RESOURCE_GROUP% ^
  --name %WEBAPP_NAME% ^
  --settings ^
    AZURE_OPENAI_ENDPOINT="%AZURE_ENDPOINT%" ^
    AZURE_OPENAI_KEY="%AZURE_KEY%" ^
    AZURE_OPENAI_DEPLOYMENT="%DEPLOYMENT_NAME%" ^
    AZURE_OPENAI_API_VERSION="2024-06-01"

echo.
echo Writing local .env file for local development...
(
  echo AZURE_OPENAI_ENDPOINT=%AZURE_ENDPOINT%
  echo AZURE_OPENAI_KEY=%AZURE_KEY%
  echo AZURE_OPENAI_DEPLOYMENT=%DEPLOYMENT_NAME%
  echo AZURE_OPENAI_API_VERSION=2024-06-01
) > .env

echo.
echo [DONE] Setup complete! You can run 'npm run dev' locally or run 'deploy.bat' to publish.
pause
