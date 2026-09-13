
import { MapPin, Calendar, ArrowRight, CheckCircle } from "lucide-react";

const JobCard = ({
  title,
  location,
  pay,
  date,
  status,
  onApply,
  onView,
}) => {
  const isApplied = status === "applied";

  return (
    <div
      className="w-100rem min-w-0 overflow-hidden p-4 border border-border rounded-2xl bg-card press cursor-pointer hover:border-primary/30 transition-colors"
      onClick={onView}
    >
      {/* Header */}
      <div className="flex justify-between items-start gap-3 mb-3 min-w-0">
        <p
          className="min-w-0 flex-1 text-base font-bold leading-snug text-foreground whitespace-normal break-words "
          title={title}
        >
          {title}
        </p>

        {/* Pay */}
        <span className="bg-success/10 text-success text-sm font-extrabold px-3 py-1.5 rounded-xl shrink-0 whitespace-nowrap">
          ₹{pay}
        </span>
      </div>

      {/* Location & Date */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-bold uppercase tracking-wider min-w-0">
        <span className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-lg min-w-0 max-w-full">
          <MapPin size={12} className="shrink-0" />

          <span className="truncate">
            {location}
          </span>
        </span>

        <span className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-lg shrink-0">
          <Calendar size={12} className="shrink-0" />
          {date}
        </span>
      </div>

      {/* Actions */}
      {isApplied ? (
        <div className="mt-3 flex items-center justify-center gap-2 text-sm font-bold text-success py-2">
          <CheckCircle size={16} />
          Applied
        </div>
      ) : onApply ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onApply();
          }}
          className="mt-4 w-full min-w-0 h-11 bg-primary text-primary-foreground font-bold rounded-xl active:scale-[0.97] transition-all text-xs flex items-center justify-between gap-2 px-3.5"
        >
          <span className="flex items-center gap-1.5 min-w-0">
            Apply Now
            <ArrowRight size={14} />
          </span>

          <span className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] line-through opacity-70">
              ₹50
            </span>

            <span className="text-[9px] font-black bg-white/20 px-1.5 py-0.5 rounded-md">
              80% OFF
            </span>

            <span className="text-sm font-black">
              ₹10
            </span>
          </span>
        </button>
      ) : (
        <div className="mt-3 flex items-center justify-end text-xs font-bold text-primary">
          View details
          <ArrowRight size={14} className="ml-1" />
        </div>
      )}
    </div>
  );
};

export default JobCard;