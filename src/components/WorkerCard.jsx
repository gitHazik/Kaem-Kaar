import { MapPin, Calendar, ArrowRight, Star, Wrench } from "lucide-react";
const WorkerCard = ({
  name,
  skill,
  location,
  pay,
  date,
  avatarUrl,
  rating = 0,
  ratingCount = 0,
  onContact, // now triggers the booking/payment sheet, not a direct message
}) => {
  return (
    <div className="p-4 border border-border rounded-2xl bg-card hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-base font-extrabold text-primary">
              {name?.[0]?.toUpperCase() || "?"}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <h3 className="text-base font-bold text-foreground truncate">
              {name}
            </h3>
            <span className="bg-success/10 text-success text-[10px] font-bold px-2 py-1 rounded-lg shrink-0">
              ₹{pay}/day
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
              <Wrench size={10} /> {skill}
            </span>
            <span className="flex items-center gap-1 text-xs font-bold text-amber-600">
              <Star size={12} fill="currentColor" /> {rating ? rating.toFixed(1) : "New"}
              {ratingCount > 0 && <span className="text-muted-foreground">({ratingCount})</span>}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground font-bold uppercase tracking-wider">
        <span className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-lg">
          <MapPin size={12} /> {location}
        </span>
        {date && (
          <span className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-lg">
            <Calendar size={12} /> {date}
          </span>
        )}
      </div>
      {onContact && (
        <button
          onClick={onContact}
          className="mt-4 w-full h-11 bg-primary text-primary-foreground font-bold rounded-xl active:scale-[0.97] transition-all text-xs flex items-center justify-between px-3.5"
        >
          <span className="flex items-center gap-1.5">
            Book <ArrowRight size={14} />
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-[10px] line-through opacity-70">₹50</span>
            <span className="text-[9px] font-black bg-white/20 px-1.5 py-0.5 rounded-md">
              80% OFF
            </span>
            <span className="text-sm font-black">₹10</span>
          </span>
        </button>
      )}
    </div>
  );
};
export default WorkerCard;
