// Developer/test-only scenario. No production controls, randomness or polling.
export const adminDashboardScenario: { mode: 'success' | 'error' | 'empty'; latencyMs: number } = {
  mode: 'success', latencyMs: 350,
};
