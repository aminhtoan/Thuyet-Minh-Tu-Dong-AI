import type { FailureStage } from './types';

// Manual development scenario: set to 'start', 'narration' or 'media'.
// Only the first attempt fails; Retry normally succeeds. No random failures.
export const mockProcessingScenario: { failFirstAttemptAt: FailureStage | null; tickMs: number } = {
  failFirstAttemptAt: null,
  tickMs: 350,
};
