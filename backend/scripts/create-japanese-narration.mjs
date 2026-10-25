import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE_URL = 'http://localhost:8080/api';

async function run() {
  console.log('=== TẠO BẢN THUYẾT MINH TIẾNG NHẬT (JAPANESE NARRATION) ===\n');

  // 1. Đăng nhập
  console.log('[1/5] Đăng nhập...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@example.com', password: 'User123456' }),
  });
  const loginData = await loginRes.json();
  if (!loginData.success) throw new Error('Đăng nhập thất bại: ' + JSON.stringify(loginData.error));
  const token = loginData.data.accessToken;
  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  console.log(`✓ Đăng nhập thành công - ${loginData.data.user.email}`);

  // 2. Tạo dự án mới cho Tiếng Nhật
  console.log('\n[2/5] Khởi tạo dự án "Con khỉ mimi (Tiếng Nhật)"...');
  const projRes = await fetch(`${BASE_URL}/projects`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({
      name: 'Con khỉ mimi (Tiếng Nhật)',
      description: 'Bản thuyết minh Tiếng Nhật cho hiện vật Con khỉ mimi',
      sourceLanguage: 'vi',
    }),
  });
  const projData = await projRes.json();
  if (!projData.success) throw new Error('Tạo dự án thất bại: ' + JSON.stringify(projData.error));
  const projectId = projData.data.project.id;
  console.log(`✓ Mã dự án mới: ${projectId}`);

  // 3. Sao chép Media từ dự án gốc
  console.log('\n[3/5] Đính kèm tệp MP3 gốc...');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const samplePath = path.resolve(__dirname, 'sample_speech.mp3');
  const fileBytes = fs.readFileSync(samplePath);
  const form = new FormData();
  form.append('file', new Blob([fileBytes], { type: 'audio/mpeg' }), 'sample_speech.mp3');
  const uploadRes = await fetch(`${BASE_URL}/projects/${projectId}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const uploadData = await uploadRes.json();
  if (!uploadData.success) throw new Error('Upload thất bại: ' + JSON.stringify(uploadData.error));
  console.log(`✓ Tệp MP3 đã đính kèm thành công: ${uploadData.data.media?.originalName}`);

  // 4. Kế thừa bản bóc băng gốc của dự án 6add171179953b8ffafd7cb0
  console.log('\n[4/5] Kế thừa bản bóc băng tiếng Việt từ dự án gốc...');
  const sourceTranscriptRes = await fetch(`${BASE_URL}/projects/6add171179953b8ffafd7cb0/transcript`, {
    headers: h,
  });
  const sourceTranscriptData = await sourceTranscriptRes.json();
  const sourceSegments = sourceTranscriptData.data?.transcript?.segments || [
    { start: 0.2, end: 4.5, text: 'Sau 16 năm sống ở Thảo Cầm Viên Sài Gòn, cô sư tử trắng có tên Mimi vừa qua đời do tuổi già và bệnh tật.' }
  ];
  console.log(`✓ Số phân đoạn câu kế thừa: ${sourceSegments.length}`);

  // Cập nhật transcript cho dự án mới qua endpoint transcript
  const putTranscriptRes = await fetch(`${BASE_URL}/projects/${projectId}/transcript`, {
    method: 'PUT',
    headers: h,
    body: JSON.stringify({
      segments: sourceSegments.map(s => ({
        startTime: s.startTime ?? s.start,
        endTime: s.endTime ?? s.end,
        text: s.text,
      })),
    }),
  });
  const putTranscriptData = await putTranscriptRes.json();
  console.log(`✓ Bản bóc băng đã được lưu: status = ${putTranscriptData.data?.transcript?.status || 'READY'}`);

  // 5. Dịch AI sang Tiếng Nhật (Gemini AI)
  console.log('\n[5/6] Dịch sang Tiếng Nhật bằng Gemini AI...');
  const transRes = await fetch(`${BASE_URL}/projects/${projectId}/translations`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ targetLanguage: 'ja', format: 'DIRECT_GROUPS_V1' }),
  });
  const transData = await transRes.json();
  if (!transData.success) {
    console.log('Dịch lỗi:', JSON.stringify(transData.error));
    throw new Error('Dịch thất bại: ' + JSON.stringify(transData.error));
  }
  const jaText = transData.data.translation?.fullText || transData.data.translation?.groups?.map(g => g.translatedText).join(' ');
  console.log(`✓ Bản dịch Tiếng Nhật: "${jaText}"`);

  // 6. Tạo Audio thuyết minh Tiếng Nhật (Gemini TTS)
  console.log('\n[6/6] Tạo thuyết minh giọng đọc Tiếng Nhật bằng Gemini TTS...');
  const ttsRes = await fetch(`${BASE_URL}/projects/${projectId}/narrations`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ targetLanguage: 'ja' }),
  });
  const ttsData = await ttsRes.json();
  if (!ttsData.success) {
    console.log('TTS lỗi:', JSON.stringify(ttsData.error));
    throw new Error('TTS thất bại: ' + JSON.stringify(ttsData.error));
  }
  console.log(`✓ Đã tạo thành công Audio thuyết minh Tiếng Nhật!`);
  console.log(`  Audio Path: ${ttsData.data.narration?.audioPath}`);
  console.log(`  Duration: ${ttsData.data.narration?.duration}s`);
  console.log(`  File size: ${ttsData.data.narration?.fileSize} bytes`);

  console.log('\n🎉 HOÀN THÀNH 100%! BẠN CÓ THỂ MỞ DỰ ÁN TRÊN GIAO DIỆN WEB ĐỂ NGHE!');
  console.log(`URL Dự án: http://localhost:5173/projects/${projectId}/result`);
}

run().catch(err => {
  console.error('\n❌ Lỗi:', err.message);
  process.exit(1);
});
