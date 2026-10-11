import { createDemoProjects } from '../projects/projectDemo.ts'
export function isHistoryDemoEnabled(development: boolean, flag: unknown) {
  return development === true && flag === 'true'
}
export function createHistoryDemo(now = new Date()) {
  return createDemoProjects(now).map(project => ({ ...project, id: project.id.replace('ui-demo-project-', 'ui-demo-history-') }))
}
