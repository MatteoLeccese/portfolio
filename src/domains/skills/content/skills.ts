// src/domains/skills/content/skills.ts
import type { SkillCategory } from "@/domains/skills/types";

/**
 * The skill categories rendered as logo grids, in render order. Skill names are proper
 * nouns and are never translated; only the category headings live in the message catalog.
 * The "ai" category is absent: it renders as a prose panel rather than a grid.
 *
 * `icon` holds the Simple Icons slug of the logo, so two skills drawn with the same logo
 * carry the same slug.
 */
export const skillCategories: readonly SkillCategory[] = [
  {
    id: "frontend",
    skills: [
      { name: "TypeScript", icon: "typescript" },
      { name: "JavaScript", icon: "javascript" },
      { name: "React", icon: "react" },
      { name: "Next.js", icon: "nextdotjs" },
      { name: "Angular", icon: "angular" },
      { name: "Vue.js", icon: "vuedotjs" },
      { name: "React Native", icon: "react" },
      { name: "Expo", icon: "expo" },
      { name: "RxJS", icon: "reactivex" },
      { name: "Redux", icon: "redux" },
      { name: "Redux Toolkit", icon: "redux" },
      { name: "React Hook Form", icon: "reacthookform" },
      { name: "Tailwind CSS", icon: "tailwindcss" },
      { name: "Sass", icon: "sass" },
    ],
  },
  {
    id: "backend",
    skills: [
      { name: "Node.js", icon: "nodedotjs" },
      { name: "NestJS", icon: "nestjs" },
      { name: "Express", icon: "express" },
      { name: "PHP", icon: "php" },
      { name: "Laravel", icon: "laravel" },
      { name: "Slim", icon: "php" },
      { name: "Python", icon: "python" },
    ],
  },
  {
    id: "data",
    skills: [
      { name: "PostgreSQL", icon: "postgresql" },
      { name: "MySQL", icon: "mysql" },
      { name: "SQLite", icon: "sqlite" },
    ],
  },
  {
    id: "platform",
    skills: [
      { name: "DigitalOcean", icon: "digitalocean" },
      { name: "Laravel Cloud", icon: "laravel" },
      { name: "Git", icon: "git" },
      { name: "GitHub", icon: "github" },
    ],
  },
];
