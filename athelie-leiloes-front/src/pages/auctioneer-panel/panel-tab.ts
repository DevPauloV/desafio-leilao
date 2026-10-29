export const PanelTab = { LOTS: 'lots', NEW: 'new' } as const;
export type PanelTab = (typeof PanelTab)[keyof typeof PanelTab];
export const isPanelTab = (value: string): value is PanelTab => Object.values(PanelTab).some((tab) => tab === value);
