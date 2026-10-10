export function validateProjectEdit(input, supportedLanguages) {
  const name = input.name.trim();
  const description = input.description.trim();
  if (!name) return { valid: false, error: 'Tên dự án là bắt buộc.' };
  if (name.length > 150) return { valid: false, error: 'Tên dự án không được vượt quá 150 ký tự.' };
  if (description.length > 1000) return { valid: false, error: 'Mô tả không được vượt quá 1000 ký tự.' };
  if (!supportedLanguages.includes(input.sourceLanguage)) return { valid: false, error: 'Ngôn ngữ nguồn không được hỗ trợ.' };
  return { valid: true, value: { name, description, sourceLanguage: input.sourceLanguage } };
}

export async function runProjectSaveOnce(lock, operation) {
  if (lock.current) return { started: false };
  lock.current = true;
  try {
    return { started: true, value: await operation() };
  } finally {
    lock.current = false;
  }
}

export function mergeUpdatedProject(projects, updatedProject) {
  return projects.some((project) => project.id === updatedProject.id)
    ? projects.map((project) => project.id === updatedProject.id ? updatedProject : project)
    : [updatedProject, ...projects];
}
