$ErrorActionPreference = 'Stop'
# A dedicated cwd prevents dotenv from loading backend/.env (Atlas).
Push-Location $PSScriptRoot
try {
    if (!(Test-Path -LiteralPath './secrets/backend.env')) {
        throw 'Configure the ignored secrets/backend.env first.'
    }
    if (!(Test-Path -LiteralPath '../../backend/dist/server.js')) {
        throw 'Build backend first using npm run build.'
    }
    if (Test-Path -LiteralPath './.env') {
        throw 'Remove ambiguity: this directory must not contain .env.'
    }
    # --env-file does not override inherited environment; reject stale configuration.
    foreach ($variable in @('MONGODB_URI', 'PORT', 'NODE_ENV', 'CORS_ORIGINS', 'UPLOAD_DIR', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'JWT_ACCESS_EXPIRES_IN', 'JWT_REFRESH_EXPIRES_IN', 'OPENAI_API_KEY')) {
        if ([Environment]::GetEnvironmentVariable($variable)) {
            throw "Use a clean terminal without inherited $variable."
        }
    }
    node --env-file=./secrets/backend.env ./run-backend.mjs
} finally { Pop-Location }
