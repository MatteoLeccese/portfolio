export interface IProjectData {
  title: string;
  description: string;
  technologies: string[];
  imageSource: string;
  githubUrl?: string | null;
  siteUrl?: string | null;
}

export interface IProjectCardProps {
  projectData: IProjectData;
}
