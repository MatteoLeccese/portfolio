import { FC, useMemo } from "react";
import Image from "next/image";
import { IWorkCardProps } from "./WorkCard.interface";
import { getMonthAndYear } from "@/app/utils/date.utils";
import "./index.css";

export const WorkCard: FC<IWorkCardProps> = ({ workData: { workDetails, workTime, jobDetails } }) => {

  const workTimeline: string = useMemo(() => `${getMonthAndYear(workTime.timeStart)} - ${getMonthAndYear(workTime.timeEnd)}`, [ workTime ]);

  return (
    <div className="work-card">
      <div className="image-container">
        <Image
          className="work-logo"
          src={workDetails.imageSource}
          width={60}
          height={60}
          alt="work-logo"
          quality={100}
          loading="lazy"
          priority={false}
        />
        <span>{workDetails.workplaceName}</span>
      </div>
      <div className="work-container">
        <p className="job-title">
          {jobDetails.jobTitle}
        </p>
        <ul>
            {
              jobDetails.jobTasks && Array.isArray(jobDetails.jobTasks) && jobDetails.jobTasks.length !== 0 ? jobDetails.jobTasks.map((jobTask, index) => (
                <li className="job-task" key={`${jobDetails.jobTitle.toLowerCase()}-${index}`}>
                  {jobTask}
                </li>
              )) : null
            }
        </ul>
      </div>
      <div className="time-container">
        <p>
          {workTimeline}
        </p>
      </div>
    </div>
  );
};
