interface IWorkDetails {
  imageSource: string;
  workplaceName: string;
}

interface IJobDetails {
  jobTitle: string;
  jobTasks: string[];
}

interface IWorkTime {
  timeStart: string; // ISOString Expected
  timeEnd?: string | null; // ISOString or empty Expected
}

export interface IWorkData {
  workDetails: IWorkDetails;
  workTime: IWorkTime;
  jobDetails: IJobDetails;
}

export interface IWorkCardProps {
  workData: IWorkData;
}
