import { FC } from "react";
import Image from "next/image";
import { IProjectCardProps } from "./ProjectCard.interface";
import "./index.css";

export const ProjectCard: FC<IProjectCardProps> = ({ projectData: { title, description, technologies, imageSource, githubUrl } }) => {
  return (
    <div className="project-card">
      <div className="image-container">
        <Image
          className="project-logo"
          src={imageSource}
          width={500}
          height={500}
          alt={`${title.toLowerCase()}-logo`}
          quality={100}
          loading="lazy"
          priority={false}
        />
      </div>
      <div className="project-container">
        <p className="project-title">
          {title}
        </p>
        <p className="project-description">
          {description}
        </p>
        <div className="technologies-container">
          {
            technologies && Array.isArray(technologies) && technologies.length !== 0 && technologies.map((technology, index) => (
              <div key={`${title.slice(0, 3)}-${technology}-${index}`} className="technology-container">
                <p className="technology-text">
                  {technology}
                </p>
              </div>
            ))
          }
        </div>
        {
          githubUrl ? (
            <a href={githubUrl}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" x2="21" y1="14" y2="3"></line></svg>
            </a>
          ) : null
        }
      </div>
    </div>
  );
};
