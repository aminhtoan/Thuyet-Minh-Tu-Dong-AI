type ProfileUser = { id: string; fullName: string; email: string; role: string };
export function validateDisplayName(value: string): string | null;
export function subscribeProfileUpdates(listener: (user: ProfileUser) => void): () => void;
export function publishProfileUpdate(user: ProfileUser): void;
export function createNameSaver<T>(update: (name: string) => Promise<T>): (value: string) => Promise<T | null>;
