export async function executeProjectUpload(input, dependencies) {
  let projectId = input.retryProjectId ?? null;
  const createdNow = !projectId;
  try {
    if (projectId) await dependencies.updateProject(projectId, input.project);
    else projectId = await dependencies.createProject(input.project);
    await dependencies.uploadFile(projectId);
    await dependencies.refreshProjects();
    return { ok: true, projectId };
  } catch (error) {
    let retryProjectId = projectId;
    if (createdNow && projectId) {
      try {
        await dependencies.deleteProject(projectId);
        retryProjectId = null;
      } catch {
        // Keep only this newly created project ID so retry reuses it instead of creating a duplicate.
      }
    }
    return { ok: false, error, retryProjectId };
  }
}
