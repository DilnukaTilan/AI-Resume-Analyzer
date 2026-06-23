import { Link } from "react-router";
import ScoreCircle from "./ScoreCircle";

const ResumeCard = ({
  resume: { id, companyName, jobTitle, imagePath, feedback },
}: {
  resume: Resume;
}) => {
  return (
    <Link
      to={`/resume/${id}`}
      className="resume-card animate-in fade-in duration-1000"
    >
      <div className="resume-card-heading">
        <div className="resume-card-header">
          <div className="flex flex-col gap-2">
            <h2 className="text-black! font-bold leading-tight wrap-break-word max-sm:text-2xl!">
              {companyName}
            </h2>
            <h3 className="text-lg leading-snug wrap-break-word text-gray-500 max-sm:text-sm">
              {jobTitle}
            </h3>
          </div>
          <div className="shrink-0 -mr-2.5 max-sm:mr-[-7px]">
            <ScoreCircle score={feedback.overallScore} />
          </div>
        </div>
        <div className="resume-card-divider" aria-hidden="true" />
      </div>
      <div className="gradient-border animate-in fade-in duration-1000">
        <div className="w-full h-full">
          <img
            src={imagePath}
            alt="resume"
            className="w-full h-[350px] max-sm:h-[200px] object-cover object-top"
          />
        </div>
      </div>
    </Link>
  );
};

export default ResumeCard;
