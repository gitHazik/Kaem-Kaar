import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Search, Star, Users, X } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import WorkerCard from "@/components/WorkerCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORY_OPTIONS, getCategoryLabel } from "@/lib/categories";

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

const WorkersPage = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [workers, setWorkers] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [minimumRating, setMinimumRating] = useState("0");

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

  return (
    <AppShell header={<h2 className="font-bold text-foreground">Find Workers</h2>}>
      <div className="px-5 py-6 space-y-4">
        <section>
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">Verified local talent</p>
          <h1 className="text-3xl font-black tracking-tight mt-1">Find the right hands.</h1>
          <p className="text-sm text-muted-foreground mt-2">Browse workers by skill, location, and daily rate.</p>
        </section>

        <div className="flex items-center gap-2 bg-card border border-border rounded-full px-3 py-2">
          <Search size={16} className="text-muted-foreground shrink-0" />
          <input
            className="bg-transparent border-none outline-none text-xs font-bold text-foreground w-full placeholder:text-muted-foreground"
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
                className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold border transition-colors ${
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
                  onContact={() => navigate(`/chat/direct/${worker.id}`)}
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
      </div>
    </AppShell>
  );
};

export default WorkersPage;
