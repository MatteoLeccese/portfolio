// src/domains/education/content/education.ts
import type { EducationEntry } from "@/domains/education/types";

/** The education entries, taken verbatim from the CV. */
export const education: readonly EducationEntry[] = [
  {
    id: "urbe-informatics-engineering",
    degree: { en: "Informatics Engineering", es: "Ingeniería en Informática" },
    institution: "Universidad Rafael Belloso Chacín",
    institutionShort: "URBE",
    location: "Zulia, Venezuela",
    year: 2021,
  },
];
