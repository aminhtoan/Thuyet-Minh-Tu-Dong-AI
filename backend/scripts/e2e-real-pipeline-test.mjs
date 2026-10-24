import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://localhost:8080/api';

async function main() {
  console.log('=== KIỂM THỬ LUỒNG DỊCH + TẠO MP3 ===\n');

  // 1. Đăng nhập
  console.log('[1/6] Đăng nhập...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@example.com', password: 'User123456' }),
  });
  const loginData = await loginRes.json();
  if (!loginData.success) throw new Error('Đăng nhập thất bại: ' + JSON.stringify(loginData.error));
  const token = loginData.data.accessToken;
  console.log(`✓ Đăng nhập OK - ${loginData.data.user.email}`);

  const h = (extra = {}) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...extra });

  // 2. Tạo dự án
  console.log('\n[2/6] Tạo dự án...');
  const projRes = await fetch(`${BASE_URL}/projects`, {
    method: 'POST', headers: h(),
    body: JSON.stringify({ name: 'E2E Test ' + Date.now(), sourceLanguage: 'vi' }),
  });
  const projData = await projRes.json();
  if (!projData.success) throw new Error('Tạo dự án thất bại: ' + JSON.stringify(projData.error));
  const projectId = projData.data.project.id;
  console.log(`✓ Project ID: ${projectId}`);

  // 3. Upload MP3 nguồn
  console.log('\n[3/6] Upload MP3...');
  const samplePath = path.resolve(__dirname, 'sample_speech.mp3');
  const fileBytes = fs.readFileSync(samplePath);
  const form = new FormData();
  form.append('file', new Blob([fileBytes], { type: 'audio/mpeg' }), 'sample_speech.mp3');
  const uploadRes = await fetch(`${BASE_URL}/projects/${projectId}/media`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
  });
  const uploadData = await uploadRes.json();
  if (!uploadData.success) throw new Error('Upload thất bại: ' + JSON.stringify(uploadData.error));
  console.log(`✓ Upload OK - ${uploadData.data.media?.originalName}`);

  // 4. STT bóc băng
  console.log('\n[4/6] Bóc băng (STT)...');
  const sttRes = await fetch(`${BASE_URL}/projects/${projectId}/transcription`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` },
  });
  const sttData = await sttRes.json();
  if (!sttData.success) throw new Error('STT thất bại: ' + JSON.stringify(sttData.error));
  console.log(`✓ STT OK - "${sttData.data.transcript?.fullText}"`);
  console.log(`  Segments: ${sttData.data.transcript?.segments?.length || 0}`);

  // 5. Dịch sang tiếng Anh (Gemini)
  console.log('\n[5/6] Dịch sang tiếng Anh (Gemini)...');
  const transRes = await fetch(`${BASE_URL}/projects/${projectId}/translations`, {
    method: 'POST', headers: h(),
    body: JSON.stringify({ targetLanguage: 'en', format: 'DIRECT_GROUPS_V1' }),
  });
  const transData = await transRes.json();
  if (!transData.success) throw new Error('Dịch thất bại: ' + JSON.stringify(transData.error));
  const fullText = transData.data.translation?.fullText || transData.data.translation?.groups?.map(g => g.translatedText).join(' ');
  console.log(`✓ Dịch OK - "${fullText}"`);
  console.log(`  Status: ${transData.data.project?.status}`);

  // 6. TTS tạo MP3
  console.log('\n[6/6] Tạo MP3 thuyết minh (TTS)...');
  const ttsRes = await fetch(`${BASE_URL}/projects/${projectId}/narrations`, {
    method: 'POST', headers: h(),
    body: JSON.stringify({ targetLanguage: 'en' }),
  });
  const ttsData = await ttsRes.json();
  if (!ttsData.success) throw new Error('TTS thất bại: ' + JSON.stringify(ttsData.error));
  const narration = ttsData.data.narration;
  console.log(`✓ TTS OK!`);
  console.log(`  Narration ID: ${narration.id}`);
  console.log(`  Voice: ${narration.voice.name} (${narration.provider})`);
  console.log(`  File size: ${narration.fileSize} bytes`);
  console.log(`  Project status: ${ttsData.data.project.status}`);

  // Tải file audio
  const audioRes = await fetch(`http://localhost:8080${narration.audioUrl}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!audioRes.ok) throw new Error('Tải audio thất bại! HTTP ' + audioRes.status);
  const buf = Buffer.from(await audioRes.arrayBuffer());
  const outPath = path.resolve(__dirname, 'output_narration.mp3');
  fs.writeFileSync(outPath, buf);

  console.log(`\n${'='.repeat(50)}`);
  console.log(' ✅ HOÀN THÀNH! MP3 đã tạo thành công!');
  console.log(`  Kích thước: ${buf.length} bytes (${(buf.length / 1024).toFixed(1)} KB)`);
  console.log(`  Lưu tại: ${outPath}`);
  console.log('='.repeat(50));
}

main().catch((err) => {
  console.error('\n❌ LỖI:', err.message ?? err);
  process.exit(1);
});
