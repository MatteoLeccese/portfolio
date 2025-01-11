import { WorkCard } from "../WorkCard/WorkCard";
import { IWorkData } from "../WorkCard/WorkCard.interface";
import "./index.css";

const workExperience: IWorkData[] = [
  {
    workDetails: {
      imageSource: '/bitnat-logo.png',
      workplaceName: 'Bitnat - Redes y Sistemas'
    },
    workTime: {
      timeStart: '2023-12-01T04:00:00.000Z',
      timeEnd: null
    },
    jobDetails: {
      jobTitle: 'Frontend Developer',
      jobTasks: [
        'Designed scalable, optimized, and maintainable architecture for large-scale applications.',
        'Integrated complex RESTful APIs into the applications.',
        'Collaborated with cross-functional teams, including back-end developers, UI/UX designers, and product managers, to ensure seamless integration of features and optimal user experience.',
        'Collaborated closely with UX designers to translate designs and prototypes into functional components.',
        'Integrated third-party APIs and services, enhancing application functionality and user experience.',
        'Conducted code reviews, ensuring adherence to best practices and high code quality standards.',
        'Developed and maintained comprehensive documentation, including project specifications, technical guidelines, and user manuals.'
      ]
    }
  },
  {
    workDetails: {
      imageSource: '/soustitreur-logo.png',
      workplaceName: 'SousTitreur'
    },
    workTime: {
      timeStart: '2023-02-02T04:00:00.000Z',
      timeEnd: '2023-08-28T04:00:00.000Z'
    },
    jobDetails: {
      jobTitle: 'Full Stack Web Developer',
      jobTasks: [
        'Developed and maintained responsive, user-friendly, and visually appealing web applications using React.js with Redux, and PHP Slim on the backend.',
        'Develop and maintain a REST API that provides data to various web applications.',
        'Collaborate with coworkers to optimize the user experience, application performance, and code quality using agile methodologies and best practices.'
      ]
    }
  },
  {
    workDetails: {
      imageSource: '/servieduca-logo.png',
      workplaceName: 'SERVIEDUCA'
    },
    workTime: {
      timeStart: '2021-10-01T04:00:00.000Z',
      timeEnd: '2023-02-01T04:00:00.000Z'
    },
    jobDetails: {
      jobTitle: 'Frontend Developer',
      jobTasks: [
        'Conceptualize, design, implement, and maintain web applications using Angular and RxJS following the agile methodology.',
        'Collaborated with team members and clients to launch projects, receive feedback, and make improvements.',
        'Develop and deploy mobile applications using React Native and other frameworks, designed user interfaces, and published them on the Play Store.'
      ]
    }
  }
];

export const Work = () => {
  return (
    <div id="Work" className="page-section light-page">
      <div className="section-content">
        <div className="section-presentation">
          <p className="section-text">
            Work Experience
          </p>
        </div>
        <p className="section-description">
          Here is a quick summary of my most recent experiences:
        </p>
        <div className="work-section">
          {
            workExperience.map((experience, index) => (
              <div key={`workplace-${index}`}>
                <WorkCard workData={experience} />
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
};
