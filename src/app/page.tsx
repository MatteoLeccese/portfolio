import { About } from "@/app/components/About/About";
import { FrontPage } from "@/app/components/FrontPage/FrontPage";
import { Projects } from "@/app/components/Projects/Projects";
import { Skills } from "@/app/components/Skills/Skills";
import { Work } from "@/app/components/Work/Work";

export default function Home() {
  return (
    <main>
      <FrontPage />
      <Work />
      <Projects />
      <Skills />
      <About />
    </main>
  );
}
