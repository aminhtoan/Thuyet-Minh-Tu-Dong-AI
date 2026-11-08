export function assertStagingFrontend(mode: string, environment: Record<string, string | undefined>, admin?: boolean): void;
export function stagingRoutingBase(mode: string, environment: Record<string, string | undefined>): {
  name: string;
  renderChunk(code: string): { code: string; map: null } | null;
};
