export function createSessionRevision() {
  let current = 0;
  return Object.freeze({
    current: () => current,
    advance: () => ++current,
    isCurrent: (revision) => revision === current,
  });
}
