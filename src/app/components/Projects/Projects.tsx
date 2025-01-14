import { ProjectCard } from "../ProjectCard/ProjectCard";
import { IProjectData } from "../ProjectCard/ProjectCard.interface";
import "./index.css";

const projects: IProjectData[] = [
  {
    title: "Github Commit Tracker",
    description: "Github Commit Tracker is a full-stack web application that lets you view the commit history of any GitHub repository. By entering a GitHub username and repository name, you can instantly access a detailed list of all commits made to that project.",
    technologies: ["React.js", "Typescript", "Node.js", "Nest.js", "Tailwind.css", "Redux Toolkit", "react-hook-form"],
    imageSource: "/projects/github-commit-tracker.png",
    githubUrl: "https://github.com/MatteoLeccese/github-commit-tracker",
    siteUrl: null,
  },
  {
    title: "React Fetch - 'News Site'",
    description: "This is an application made to integrate a third party Restful API inside to the application. The objective was to create a 'News Application' using the 'https://jsonplaceholder.typicode.com' API",
    technologies: ["React.js", "Typescript", "Tailwind.css", "Redux Toolkit", "react-hook-form"],
    imageSource: "/projects/react-fetch-example.png",
    githubUrl: "https://github.com/MatteoLeccese/react-fetch-example",
    siteUrl: null,
  },
];

export const Projects = () => {
  return (
    <div id="Projects" className="page-section">
      <div className="section-content">
        <div className="section-presentation">
          <p className="section-text">
            Projects
          </p>
        </div>
        <p className="section-description">
          Some of the significant projects I have developed
        </p>
        <div className="projects-section">
          {
            projects && projects.length !== 0 && projects.map((project, index) => (
              <div key={`project-${index + 1}`} className="project">
                <ProjectCard projectData={project} />
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
};
