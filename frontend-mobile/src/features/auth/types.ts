export type LoginFormValues = { email: string; password: string };
export type RegisterFormValues = LoginFormValues & { fullName: string; confirmPassword: string };
export type FormErrors<T> = Partial<Record<keyof T, string>>;
