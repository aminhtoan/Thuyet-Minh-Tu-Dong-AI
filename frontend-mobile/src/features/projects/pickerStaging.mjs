export const PICKER_STAGE_ACCESS_MESSAGE = 'Không thể truy cập tệp đã chọn. Vui lòng chọn lại tệp.';

function permissionDenied(error) {
  const message = error instanceof Error ? error.message : String(error);
  return /read permission|access|denied|permission|not readable|isn't readable/i.test(message);
}

export async function stageFreshPickerAsset(asset, dependencies) {
  const directory = dependencies.createDirectory();
  const destination = dependencies.destination(directory, asset.name);
  dependencies.diagnose?.('picker-stage:start', { size: asset.size, scheme: dependencies.scheme(asset.uri) });
  try {
    await dependencies.makeDirectory(directory);
    await dependencies.copyExact(asset.uri, destination);
    const info = await dependencies.getInfo(destination);
    if (!info.exists || info.isDirectory) throw new Error('Staged picker file is missing');
    if (typeof asset.size === 'number' && typeof info.size === 'number' && asset.size !== info.size) {
      throw new Error('Staged picker file size mismatch');
    }
    dependencies.diagnose?.('picker-stage:success', { exists: info.exists, size: info.size, destinationCacheLocation: 'app-cache' });
    return {
      asset: { ...asset, uri: destination },
      cleanup: async () => { await dependencies.delete(directory).catch(() => undefined); },
    };
  } catch (error) {
    dependencies.diagnose?.('picker-stage:failure', { error });
    await dependencies.delete(directory).catch(() => undefined);
    throw new Error(permissionDenied(error) ? PICKER_STAGE_ACCESS_MESSAGE : 'Không thể chuẩn bị tệp đã chọn. Vui lòng chọn lại tệp.');
  }
}

export function requiresFreshPickerSelection(message) {
  return /chọn lại tệp/i.test(message);
}
