// Never emit credentials or authentication exceptions into healthcheck logs.
try {
  const password = require('fs').readFileSync('/run/secrets/mongo-app-password', 'utf8').trim();
  const connection = new Mongo('mongodb://127.0.0.1:27017');
  const demo = connection.getDB('multilingual_ai_narration_ui_demo');
  if (!demo.auth('demo-app', password) || demo.runCommand({ ping: 1 }).ok !== 1) quit(1);
  quit(0);
} catch { quit(1); }
