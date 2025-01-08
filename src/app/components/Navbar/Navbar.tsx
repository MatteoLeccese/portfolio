import Image from "next/image";
import "./index.css";

export const Navbar = () => {
  return (
    <header>
      <nav>
        <Image
          className="nav-logo"
          src="/ml_logo_no_background.png"
          width={64}
          height={64}
          alt="logo"
          quality={50}
          loading="lazy"
          priority={false}
        />
        <ul>
          <li>
            <a href="#Home">
              Home
            </a>
          </li>
          <li>
            <a href="#Work">
              Work
            </a>
          </li>
          <li>
            <a href="#Projects">
              Projects
            </a>
          </li>
          <li>
            <a href="#About">
              About
            </a>
          </li>
          <li>
            <button className="pdf-button">
              Download PDF
            </button>
          </li>
        </ul>
      </nav>
    </header>
  );
};
