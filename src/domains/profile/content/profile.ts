// src/domains/profile/content/profile.ts
import type { Locale, LocalizedText } from "@/domains/core/types";

/**
 * The one-paragraph professional profile printed at the top of the CV PDF. It carries a
 * `{years}` placeholder, resolved by whoever renders it from
 * yearsOfExperienceAt(SITE.careerStart, now); the count is never written out here.
 */
export const cvProfile: LocalizedText = {
  en: "Full Stack Developer with {years} years of experience building scalable web platforms and backend systems, currently working in financial technology with React, Next.js, Node.js, NestJS, PHP and Laravel. I design REST APIs, integrate third-party payment providers and take applications all the way to production on cloud infrastructure, with a strong focus on data integrity, database performance and architecture that other developers can maintain. I work daily with AI-assisted development tools such as Claude Code and Antigravity, and orchestrate AI agents to move faster without trading away code quality.",
  es: "Desarrollador Full Stack con {years} años de experiencia construyendo plataformas web escalables y sistemas backend, actualmente en el sector de la tecnología financiera con React, Next.js, Node.js, NestJS, PHP y Laravel. Diseño APIs REST, integro proveedores de pago externos y llevo las aplicaciones hasta producción sobre infraestructura en la nube, con especial atención a la integridad de los datos, el rendimiento de base de datos y una arquitectura que otros desarrolladores puedan mantener. Trabajo a diario con herramientas de desarrollo asistidas por IA como Claude Code y Antigravity, y orquesto agentes de IA para avanzar más rápido sin sacrificar la calidad del código.",
};

/** The job title shown when there is no ongoing position. */
export const FALLBACK_JOB_TITLE: Record<Locale, string> = {
  en: "Full Stack Developer",
  es: "Desarrollador Full Stack",
};
