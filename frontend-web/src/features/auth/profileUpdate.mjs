export function validateDisplayName(value) {
  const name = value.trim();
  if (name.length < 2) return 'Họ và tên phải có ít nhất 2 ký tự.';
  if (name.length > 100) return 'Họ và tên không được vượt quá 100 ký tự.';
  return null;
}

// Shared in-memory notification only; no credentials or new persistent cache.
const listeners = new Set();
export function subscribeProfileUpdates(listener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function publishProfileUpdate(user) {
  for (const listener of listeners) listener(user);
}

export function createNameSaver(update) {
  let pending = false;
  return async (value) => {
    if (pending) return null;
    const error = validateDisplayName(value);
    if (error) throw new Error(error);
    pending = true;
    try { return await update(value.trim()); }
    finally { pending = false; }
  };
}
