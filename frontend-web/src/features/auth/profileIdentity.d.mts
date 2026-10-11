export type ProfileUser = { fullName?: string | null; email?: string | null } | null | undefined;
export type ProfileIdentity = { name: string; email: string; initial: string };
export function getProfileIdentity(user: ProfileUser): ProfileIdentity;
