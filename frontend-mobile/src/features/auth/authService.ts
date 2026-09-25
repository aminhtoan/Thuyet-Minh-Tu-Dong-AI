import type { LoginFormValues, RegisterFormValues } from './types';

const mockDelayMs = 450;

function waitForDemo(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, mockDelayMs));
}

export const authService = {
  async login(_values: LoginFormValues): Promise<void> { await waitForDemo(); },
  async register(_values: RegisterFormValues): Promise<void> { await waitForDemo(); },
};
