"use client";
import Image from "next/image";
import "./index.css";

const downloadCVPdf = () => {
  const link = document.createElement('a'); 
  link.href = '/pdf/cv_matteo_leccese.pdf';
  link.download = 'cv_matteo_leccese.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

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
            <a href="#Contact">
              Contact
            </a>
          </li>
          <li>
            <button className="pdf-button" onClick={() => downloadCVPdf()}>
              Download PDF
            </button>
          </li>
        </ul>
      </nav>
    </header>
  );
};
