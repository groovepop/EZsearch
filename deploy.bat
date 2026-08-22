@echo off
echo Building frontend assets...
call npm run build

echo Creating deployment archive app.zip...
call tar -a -c -f app.zip --exclude="node_modules" --exclude=".git" --exclude="app.zip" --exclude="scratch" *

echo Ensuring Azure Web App ezsearch-hub exists...
call az webapp create --name ezsearch-hub --resource-group EZsearch-rg --plan EZsearch-plan --runtime "NODE|22-lts"

echo Setting startup command...
call az webapp config set --resource-group EZsearch-rg --name ezsearch-hub --startup-file "node server/index.js"

echo Loading environment variables from .env...
for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
    if "%%a"=="AZURE_OPENAI_ENDPOINT" set AZURE_OPENAI_ENDPOINT=%%b
    if "%%a"=="AZURE_OPENAI_KEY" set AZURE_OPENAI_KEY=%%b
    if "%%a"=="AZURE_OPENAI_DEPLOYMENT" set AZURE_OPENAI_DEPLOYMENT=%%b
    if "%%a"=="AZURE_OPENAI_API_VERSION" set AZURE_OPENAI_API_VERSION=%%b
    if "%%a"=="AZURE_GROK_ENDPOINT" set AZURE_GROK_ENDPOINT=%%b
    if "%%a"=="AZURE_GROK_KEY" set AZURE_GROK_KEY=%%b
    if "%%a"=="AZURE_GROK_AGENT_NAME" set AZURE_GROK_AGENT_NAME=%%b
    if "%%a"=="AZURE_GROK_AGENT_VERSION" set AZURE_GROK_AGENT_VERSION=%%b
    if "%%a"=="AZURE_DEEPSEEK_AGENT_NAME" set AZURE_DEEPSEEK_AGENT_NAME=%%b
    if "%%a"=="AZURE_DEEPSEEK_AGENT_VERSION" set AZURE_DEEPSEEK_AGENT_VERSION=%%b
    if "%%a"=="GROOVEPOP_ENGINE_URL" set GROOVEPOP_ENGINE_URL=%%b
    if "%%a"=="GROOVEPOP_API_KEY" set GROOVEPOP_API_KEY=%%b
    if "%%a"=="OMDB_API_KEY" set OMDB_API_KEY=%%b
    if "%%a"=="TMDB_API_READ_ACCESS_TOKEN" set TMDB_API_READ_ACCESS_TOKEN=%%b
    if "%%a"=="TMDB_API_KEY" set TMDB_API_KEY=%%b
    if "%%a"=="RAWG_API_KEY" set RAWG_API_KEY=%%b
    if "%%a"=="GENIUS_CLIENT_ID" set GENIUS_CLIENT_ID=%%b
    if "%%a"=="GENIUS_CLIENT_SECRET" set GENIUS_CLIENT_SECRET=%%b
    if "%%a"=="GENIUS_CLIENT_ACCESS_TOKEN" set GENIUS_CLIENT_ACCESS_TOKEN=%%b
    if "%%a"=="AZURE_POPCULTURE_DEPLOYMENT" set AZURE_POPCULTURE_DEPLOYMENT=%%b
)

echo Configuring app settings on Azure Web App...
call az webapp config appsettings set --resource-group EZsearch-rg --name ezsearch-hub --settings ^
  AZURE_OPENAI_ENDPOINT="%AZURE_OPENAI_ENDPOINT%" ^
  AZURE_OPENAI_KEY="%AZURE_OPENAI_KEY%" ^
  AZURE_OPENAI_DEPLOYMENT="%AZURE_OPENAI_DEPLOYMENT%" ^
  AZURE_OPENAI_API_VERSION="%AZURE_OPENAI_API_VERSION%" ^
  AZURE_GROK_ENDPOINT="%AZURE_GROK_ENDPOINT%" ^
  AZURE_GROK_KEY="%AZURE_GROK_KEY%" ^
  AZURE_GROK_AGENT_NAME="%AZURE_GROK_AGENT_NAME%" ^
  AZURE_GROK_AGENT_VERSION="%AZURE_GROK_AGENT_VERSION%" ^
  AZURE_DEEPSEEK_AGENT_NAME="%AZURE_DEEPSEEK_AGENT_NAME%" ^
  AZURE_DEEPSEEK_AGENT_VERSION="%AZURE_DEEPSEEK_AGENT_VERSION%" ^
  GROOVEPOP_ENGINE_URL="%GROOVEPOP_ENGINE_URL%" ^
  GROOVEPOP_API_KEY="%GROOVEPOP_API_KEY%" ^
  OMDB_API_KEY="%OMDB_API_KEY%" ^
  TMDB_API_READ_ACCESS_TOKEN="%TMDB_API_READ_ACCESS_TOKEN%" ^
  TMDB_API_KEY="%TMDB_API_KEY%" ^
  RAWG_API_KEY="%RAWG_API_KEY%" ^
  GENIUS_CLIENT_ID="%GENIUS_CLIENT_ID%" ^
  GENIUS_CLIENT_SECRET="%GENIUS_CLIENT_SECRET%" ^
  GENIUS_CLIENT_ACCESS_TOKEN="%GENIUS_CLIENT_ACCESS_TOKEN%" ^
  AZURE_POPCULTURE_DEPLOYMENT="%AZURE_POPCULTURE_DEPLOYMENT%" ^
  GROOVEPOP_AZURE_OPENAI_ENDPOINT="https://green-mos1tune-eastus2.openai.azure.com" ^
  GROOVEPOP_AZURE_OPENAI_KEY="%AZURE_GROK_KEY%" ^
  GROOVEPOP_AZURE_IMAGE_DEPLOYMENT="gpt-image-2"

echo Deploying code zip to Azure Web App...
call az webapp deploy --resource-group EZsearch-rg --name ezsearch-hub --src-path app.zip --type zip

echo Deployment complete!
