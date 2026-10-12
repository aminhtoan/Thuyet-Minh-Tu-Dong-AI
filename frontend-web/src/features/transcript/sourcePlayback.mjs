export function activeTranscriptSegment(segments, time) {
  if (!Number.isFinite(time)) return null;
  return segments.find(s => time >= s.startTime && time < s.endTime)?.id ?? null;
}
export async function seekSourceMedia(player, time) {
  if (!player || player.readyState < 1 || !Number.isFinite(time) || time < 0 || !Number.isFinite(player.duration) || time >= player.duration) return false;
  player.currentTime = time;
  await player.play();
  return true;
}
export function sourceMediaError(error) {
  if (error?.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (error?.status === 403 || error?.code === 'PROJECT_NOT_FOUND') return 'Bạn không có quyền truy cập phương tiện của dự án này.';
  if (error?.status === 404) return 'Không tìm thấy tệp phương tiện nguồn.';
  if (error?.status === 415) return 'Định dạng này chưa được hỗ trợ phát. Vui lòng dùng MP3 hoặc MP4.';
  return 'Không thể tải phương tiện nguồn. Vui lòng kiểm tra kết nối và thử lại.';
}

// Single in-flight authenticated load, with late-result and object URL cleanup.
export function createSourceMediaLoader(fetchBlob, createUrl, revokeUrl) {
  let pending = null; let url = null; let disposed = false;
  return {
    load() {
      if (disposed) return Promise.resolve(null);
      if (url) return Promise.resolve(url);
      if (pending) return pending;
      pending = fetchBlob().then(blob => {
        if (disposed) return null;
        if (!['audio/mpeg', 'video/mp4'].includes(blob.type)) throw Object.assign(new Error('Unsupported'), { status: 415 });
        url = createUrl(blob); return url;
      }).finally(() => { pending = null; });
      return pending;
    },
    dispose() { disposed = true; if (url) { revokeUrl(url); url = null; } },
  };
}
