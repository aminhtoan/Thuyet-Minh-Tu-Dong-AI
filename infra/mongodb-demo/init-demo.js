// Runs only during the official image's first initialization of an empty volume.
const fs = require('fs');
const password = fs.readFileSync('/run/secrets/mongo-app-password', 'utf8').trim();
if (password.length < 24) throw new Error('Demo application password must contain at least 24 characters.');
db.getSiblingDB('multilingual_ai_narration_ui_demo').createUser({
  user: 'demo-app',
  pwd: password,
  roles: [{ role: 'readWrite', db: 'multilingual_ai_narration_ui_demo' }],
});
