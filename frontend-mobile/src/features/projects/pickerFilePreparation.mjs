export const PICKER_FILE_UNREADABLE_MESSAGE = 'Không thể đọc tệp đã chọn. Vui lòng chọn lại tệp.';
export const PICKER_FILE_ACCESS_MESSAGE = 'Ứng dụng không có quyền đọc tệp đã chọn. Vui lòng chọn lại tệp.';
export const FILESYSTEM_INCOMPATIBLE_MESSAGE = 'Không thể kiểm tra tệp trên thiết bị. Vui lòng chọn lại tệp.';

function accessDenied(error) {
  const message = error instanceof Error ? error.message : String(error);
  return /access|denied|permission|not readable|isn't readable/i.test(message);
}

export async function preparePickerFile(input, fileSystem) {
  let source;
  try {
    fileSystem.diagnose?.('getInfo:start');
    source = await fileSystem.getInfo(input.uri);
    fileSystem.diagnose?.('getInfo:success', { exists: source.exists, isDirectory: source.isDirectory, size: source.size });
  } catch (error) {
    fileSystem.diagnose?.('getInfo:failure', { error });
    throw new Error(accessDenied(error) ? PICKER_FILE_ACCESS_MESSAGE : FILESYSTEM_INCOMPATIBLE_MESSAGE);
  }
  if (!source?.exists || source.isDirectory) throw new Error(PICKER_FILE_UNREADABLE_MESSAGE);

  if (input.uri.startsWith(fileSystem.cacheDirectory)) {
    fileSystem.diagnose?.('prepare:direct-file');
    return {
      uploadUri: input.uri,
      copied: false,
      cleanup: async (succeeded) => {
        if (succeeded && input.uri.startsWith(fileSystem.cacheDirectory)) {
          await fileSystem.delete(input.uri).catch(() => undefined);
        }
      },
    };
  }

  const cacheRoot = fileSystem.cacheDirectory.endsWith('/') ? fileSystem.cacheDirectory : `${fileSystem.cacheDirectory}/`;
  const directory = `${cacheRoot}mobile-uploads/${input.projectId}/`;
  const destination = `${directory}${input.fileName}`;
  await fileSystem.makeDirectory(directory);
  await fileSystem.delete(destination).catch(() => undefined);
  try {
    fileSystem.diagnose?.('materialize:start', { method: 'modern-file-copy' });
    await fileSystem.materialize(input.uri, destination);
    const copied = await fileSystem.getInfo(destination).catch(() => null);
    if (!copied?.exists || copied.isDirectory) throw new Error(PICKER_FILE_UNREADABLE_MESSAGE);
    if (typeof source.size === 'number' && typeof copied.size === 'number' && source.size !== copied.size) {
      throw new Error('Materialized file size mismatch');
    }
    fileSystem.diagnose?.('materialize:success', {
      method: 'modern-file-copy',
      destinationCacheLocation: 'app-cache',
      exists: copied.exists,
      size: copied.size,
    });
  } catch (error) {
    fileSystem.diagnose?.('materialize:failure', { method: 'modern-file-copy', error });
    await fileSystem.delete(directory).catch(() => undefined);
    throw new Error(accessDenied(error) ? PICKER_FILE_ACCESS_MESSAGE : FILESYSTEM_INCOMPATIBLE_MESSAGE);
  }
  return {
    uploadUri: destination,
    copied: true,
    cleanup: async () => { await fileSystem.delete(directory).catch(() => undefined); },
  };
}
