import Image from "next/image";
import "./index.css";

const skills = [
  { name: "Javascript", link: "https://developer.mozilla.org/en-US/docs/Web/JavaScript", source: "/icons/icon-javascript.svg" },
  { name: "Typescript", link: "https://www.typescriptlang.org/", source: "/icons/icon-typescript.svg" },
  { name: "React", link: "https://react.dev/", source: "/icons/icon-react.svg" },
  { name: "Next.js", link: "https://nextjs.org/", source: "/icons/icon-nextjs.svg" },
  { name: "Node.js", link: "https://nodejs.org/en", source: "/icons/icon-nodejs.svg" },
  { name: "Express.js", link: "https://expressjs.com/", source: "/icons/icon-express.svg" },
  { name: "PostgreSQL", link: "https://www.postgresql.org/", source: "/icons/icon-postgresql.svg" },
  { name: "Sass/Scss", link: "https://sass-lang.com/", source: "/icons/icon-sass.svg" },
  { name: "Tailwindcss", link: "https://tailwindcss.com/", source: "/icons/icon-tailwindcss.svg" },
  { name: "Git", link: "https://git-scm.com/", source: "/icons/icon-git.svg" }
];

export const Skills = () => {
  return (
    <div id="Skills" className="page-section light-page">
      <div className="section-content">
        <div className="section-presentation">
          <p className="section-text">
            Skills
          </p>
        </div>
        <p className="section-description">
          The skills, tools, and technologies I am really good at:
        </p>
        <div className="skills-section">
          {skills.map(({ name, link, source }) => (
            <div key={name} className="flex flex-col items-center gap-2">
              <a target="_blank" rel="noopener noreferrer" href={link}>
                <Image
                  className="skill-icon"
                  src={source}
                  width={64}
                  height={64}
                  alt={name}
                  quality={60}
                  loading="lazy"
                  priority={false}
                />
              </a>
              <p className="text-normal text-base md:text-lg">{name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
