export const Step = { ROLE: 0, DATA: 1 } as const;
export type Step = (typeof Step)[keyof typeof Step];
