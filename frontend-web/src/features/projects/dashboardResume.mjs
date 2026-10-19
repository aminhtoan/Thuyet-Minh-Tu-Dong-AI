const projectDetailPath = (projectId) => `/projects/${projectId}`
export const DASHBOARD_RESUME_TIMEOUT_MS = 8_000

function fallback(projectId, notice) {
  return {
    path: projectId ? projectDetailPath(projectId) : '/projects',
    label: 'Xem chi tiết',
    resumed: false,
    notice,
  }
}

/**
 * Reloads the project before resolving its route so Dashboard never resumes
 * from a stale list-row status. `getAction` is the shared projectAction helper,
 * which remains the single source of workflow route rules.
 */
export async function resolveDashboardResume(projectId, loadProject, getAction, options = {}) {
  const normalizedId = typeof projectId === 'string' ? projectId.trim() : ''
  if (!normalizedId) {
    return fallback('', 'Không thể xác định dự án cần mở.')
  }

  const controller = new AbortController()
  const externalSignal = options.signal
  const timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0
    ? options.timeoutMs
    : DASHBOARD_RESUME_TIMEOUT_MS
  let timedOut = false
  let timeoutId
  const forwardAbort = () => controller.abort(externalSignal?.reason)

  if (externalSignal?.aborted) controller.abort(externalSignal.reason)
  else externalSignal?.addEventListener('abort', forwardAbort, { once: true })

  try {
    const project = await Promise.race([
      loadProject(normalizedId, controller.signal),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          timedOut = true
          controller.abort(new DOMException('Dashboard resume timed out', 'TimeoutError'))
          reject(new DOMException('Dashboard resume timed out', 'TimeoutError'))
        }, timeoutMs)
      }),
    ])
    if (!project || project.id !== normalizedId) {
      return fallback(normalizedId, 'Không thể xác minh dữ liệu dự án từ máy chủ.')
    }

    const action = getAction(project)
    const canResume = project.workflow?.canResume === true
      && action.available === true
      && action.step !== 'unknown'

    if (canResume) {
      return { path: action.path, label: 'Tiếp tục', resumed: true, notice: null }
    }

    return fallback(
      normalizedId,
      action.reason ?? 'Quy trình hiện chưa sẵn sàng để tiếp tục an toàn.',
    )
  } catch (error) {
    if (externalSignal?.aborted) throw error
    return fallback(
      normalizedId,
      timedOut
        ? 'Máy chủ phản hồi quá lâu. Đã mở trang chi tiết dự án để bạn kiểm tra và thử lại.'
        : 'Không thể xác định bước tiếp theo từ máy chủ. Đã mở trang chi tiết dự án để bạn kiểm tra.',
    )
  } finally {
    clearTimeout(timeoutId)
    externalSignal?.removeEventListener('abort', forwardAbort)
  }
}
