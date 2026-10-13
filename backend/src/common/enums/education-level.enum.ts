export const EducationLevel = { BACHELOR: 'bachelor', MASTER: 'master', DOCTORATE: 'doctorate' } as const;

export type EducationLevel = (typeof EducationLevel)[keyof typeof EducationLevel];
