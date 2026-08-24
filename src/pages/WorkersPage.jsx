import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Search, Users, X, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import WorkerCard from "@/components/WorkerCard";
import PaymentSheet from "@/components/PaymentSheet";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORY_OPTIONS, getCategoryLabel, normalizeCategory } from "@/lib/categories";

const SKILL_CATEGORIES = {
  repair: ["plumber", "electrician", "painter", "carpenter", "mason", "gardener"],
  homehelp: ["cleaner", "helper"],
  cooking: ["cook"],
  delivery: ["driver"],
  education: ["tutor", "teacher"],
  labor: ["labor", "helper", "mason"],
};

const matchesCategory = (worker, category) => {
  if (category === "all") return true;
  const hasKnownMatch = (worker.skills || []).some((skill) => {
    const normalizedSkill = String(skill).toLowerCase();
    return SKILL_CATEGORIES[category]?.some((term) => normalizedSkill.includes(term));
  });
  if (hasKnownMatch) return true;
  if (category !== "other") return false;
  return (worker.skills || []).some((skill) => !Object.values(SKILL_CATEGORIES).flat().some((term) => String(skill).toLowerCase().includes(term)));
};

const BOOKING_TITLE_PREFIX = "⚡ Direct Booking:";
const BOOKING_FEE = 10;

const statusBadge = {
  in_progress: { label: "In progress", classes: "bg-primary/10 text-primary" },
  completed: { label: "Completed", classes: "bg-success/10 text-success" },
  open: { label: "Pending", classes: "bg-yellow-100 text-yellow-800" },
};

const WorkersPage = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [workers, setWorkers] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [minimumRating, setMinimumRating] = useState("0");

  const [tab, setTab] = useState("find"); // "find" | "bookings"
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const [bookingWorker, setBookingWorker] = useState(null); // worker currently being booked/paid for

  useEffect(() => {
    if (profile?.role !== "hirer") {
      navigate("/", { replace: true });
      return;
    }

    const fetchWorkers = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, skills, expected_pay_per_day, avatar_url, location_name")
        .eq("role", "worker")
        .order("created_at", { ascending: false });

      const { data: reviews, error: reviewsError } = await supabase
        .from("worker_reviews")
        .select("worker_id, category, rating");

      if (error || reviewsError) toast.error("Failed to load workers");
      else {
        const ratingsByWorker = (reviews || []).reduce((result, review) => {
          const key = `${review.worker_id}:${review.category}`;
          result[key] = result[key] || { total: 0, count: 0 };
          result[key].total += review.rating;
          result[key].count += 1;
          return result;
        }, {});
        setWorkers((data || []).map((worker) => ({ ...worker, ratingsByCategory: ratingsByWorker })));
      }
      setLoading(false);
    };

    fetchWorkers();
  }, [navigate, profile?.role]);

  const fetchBookings = useCallback(async () => {
    if (!profile?.id) return;
    setBookingsLoading(true);
    const { data, error } = await supabase
      .from("jobs")
      .select("id, title, status, pay_amount, location_name, assigned_worker_id, profiles:assigned_worker_id (full_name, avatar_url)")
      .eq("hirer_id", profile.id)
      .like("title", `${BOOKING_TITLE_PREFIX}%`)
      .order("created_at", { ascending: false });

    if (error) toast.error("Failed to load bookings");
    else setBookings(data || []);
    setBookingsLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    if (tab === "bookings") fetchBookings();
  }, [tab, fetchBookings]);

  const filteredWorkers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return workers.filter((worker) => {
      const searchableText = [worker.full_name, worker.location_name, ...(worker.skills || [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const categoryRatings = activeCategory === "all"
        ? Object.entries(worker.ratingsByCategory || {}).filter(([key]) => key.startsWith(`${worker.id}:`)).map(([, value]) => value)
        : [worker.ratingsByCategory?.[`${worker.id}:${activeCategory}`]].filter(Boolean);
      const ratingCount = categoryRatings.reduce((sum, rating) => sum + rating.count, 0);
      const averageRating = ratingCount
        ? categoryRatings.reduce((sum, rating) => sum + rating.total, 0) / ratingCount
        : 0;
      worker.averageRating = averageRating;
      worker.ratingCount = ratingCount;
      return matchesCategory(worker, activeCategory) && averageRating >= Number(minimumRating) && (!query || searchableText.includes(query));
    }).sort((first, second) => second.averageRating - first.averageRating);
  }, [activeCategory, minimumRating, searchQuery, workers]);

  const categoryPills = [{ id: "all", label: "All" }, ...CATEGORY_OPTIONS];

  const handleBookingConfirmed = async () => {
    const worker = bookingWorker;
    if (!worker || !user) return;

    const category = normalizeCategory(worker.skills?.[0] || activeCategory);
    const jobPayload = {
      hirer_id: user.id,
      title: `${BOOKING_TITLE_PREFIX} ${worker.full_name || "Worker"}`,
      description: `Direct booking. Booking fee of ₹${BOOKING_FEE} paid via UPI.`,
      location_name: worker.location_name || "Not specified",
      pay_amount: worker.expected_pay_per_day || 0,
      status: "in_progress",
      category,
      assigned_worker_id: worker.id,
    };

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .insert(jobPayload)
      .select()
      .single();

    if (jobError) {
      toast.error(jobError.message || "Could not create booking");
      return;
    }

    const { error: appError } = await supabase.from("applications").insert({
      job_id: job.id,
      worker_id: worker.id,
      status: "accepted",
    });

    if (appError) {
      toast.error("Booking created but couldn't link the worker — check Applications table");
    }

    toast.success(`Booked ${worker.full_name || "worker"}!`);
    setBookingWorker(null);
    navigate(`/jobs/${job.id}`);
  };

  return (
    <AppShell header={<h2 className="font-bold text-foreground">Find Workers</h2>}>
      <div className="px-5 py-6 space-y-4">
        <section>
          <h1 className="text-2xl font-semibold tracking-tight">Find the right hands.</h1>
        </section>

        <div className="flex gap-1 bg-muted/50 p-1 rounded-xl border border-border/50">
          <button
            onClick={() => setTab("find")}
            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tab === "find" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
          >
            Find Workers
          </button>
          <button
            onClick={() => setTab("bookings")}
            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tab === "bookings" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
          >
            My Bookings
          </button>
        </div>

        {tab === "find" ? (
          <>
            <div className="flex items-center gap-2 bg-card border border-border rounded-full px-3 py-2">
              <Search size={16} className="text-muted-foreground shrink-0" />
              <input
                className="bg-transparent border-none outline-none text-xs font-normal text-foreground w-full placeholder:text-muted-foreground"
                placeholder="Search name, skill, or location"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              {searchQuery && <X size={16} className="text-muted-foreground cursor-pointer shrink-0" onClick={() => setSearchQuery("")} />}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5" style={{ scrollbarWidth: "none" }}>
              {categoryPills.map((category) => {
                const isActive = activeCategory === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium border transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border"
                    }`}
                  >
                    {category.label}
                  </button>
                );
              })}
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" size={28} /></div>
            ) : filteredWorkers.length > 0 ? (
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{filteredWorkers.length} available profiles</p>
                <div className="grid grid-cols-2 gap-3">
                  {filteredWorkers.map((worker) => (
                    <WorkerCard
                      key={worker.id}
                      name={worker.full_name || "Unnamed worker"}
                      skill={worker.skills?.[0] || getCategoryLabel(activeCategory)}
                      location={worker.location_name || "Location not listed"}
                      pay={worker.expected_pay_per_day || "Ask"}
                      avatarUrl={worker.avatar_url}
                      rating={worker.averageRating}
                      ratingCount={worker.ratingCount}
                      onContact={() => setBookingWorker(worker)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 border-2 border-dashed border-border rounded-3xl">
                <Users size={32} className="mx-auto mb-3 text-muted-foreground" />
                <p className="font-bold">No workers found</p>
                <p className="text-xs text-muted-foreground mt-1">Try another category or search.</p>
              </div>
            )}
          </>
        ) : bookingsLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" size={28} /></div>
        ) : bookings.length > 0 ? (
          <div className="space-y-3">
            {bookings.map((booking) => {
              const badge = statusBadge[booking.status] || statusBadge.open;
              return (
                <button
                  key={booking.id}
                  onClick={() => navigate(`/jobs/${booking.id}`)}
                  className="w-full text-left bg-card border border-border rounded-2xl p-4 flex items-center gap-3 hover:border-primary/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 overflow-hidden">
                    {booking.profiles?.avatar_url ? (
                      <img src={booking.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      booking.profiles?.full_name?.[0]?.toUpperCase() || "?"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{booking.profiles?.full_name || "Worker"}</p>
                    <p className="text-xs text-muted-foreground truncate">{booking.location_name}</p>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg shrink-0 flex items-center gap-1 ${badge.classes}`}>
                    {booking.status === "completed" ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                    {badge.label}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed border-border rounded-3xl">
            <Clock size={32} className="mx-auto mb-3 text-muted-foreground" />
            <p className="font-bold">No bookings yet</p>
            <p className="text-xs text-muted-foreground mt-1">Book a worker to see them here.</p>
          </div>
        )}
      </div>

      {bookingWorker && (
        <PaymentSheet
          amount={BOOKING_FEE}
          workerName={bookingWorker.full_name || "Worker"}
          onClose={() => setBookingWorker(null)}
          onConfirmed={handleBookingConfirmed}
        />
      )}
    </AppShell>
  );
};

export default WorkersPage;
