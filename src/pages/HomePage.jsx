import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import NotificationBell from "@/components/NotificationBell";
import {
  Wrench,
  Plus,
  ArrowRight,
  Search,
  BookOpen,
  ChefHat,
  Truck,
  MapPin,
  Briefcase,
  Loader2,
  LayoutGrid,
  Home,
  Hammer,
  MoreHorizontal,
  X 
} from "lucide-react";
import { motion } from "framer-motion";
import { CATEGORY_OPTIONS, normalizeCategory, getCategoryLabel } from "@/lib/categories";

const CATEGORIES = [
  { id: "all", label: "All", icon: LayoutGrid },
  ...CATEGORY_OPTIONS.map((option) => ({
    id: option.id,
    label: option.label,
    icon: option.id === "repair" ? Wrench : option.id === "homehelp" ? Home : option.id === "cooking" ? ChefHat : option.id === "delivery" ? Truck : option.id === "education" ? BookOpen : option.id === "labor" ? Hammer : MoreHorizontal,
  })),
];

const HomePage = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isHirer = profile?.role === "hirer";
  
  const [activeCategoryId, setActiveCategoryId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const firstName = profile?.full_name?.split(" ")[0] || "there";

  const fetchJobs = async (category, search) => {
    try {
      setLoading(true);
      let query = supabase
        .from("jobs")
        .select(`
          id, title, description, location_name, pay_amount, category, status,
          profiles:hirer_id ( full_name )
        `)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(20);

      if (category !== "all") {
        query = query.eq("category", normalizeCategory(category));
      }

      if (search.trim()) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,location_name.ilike.%${search}%`);
      }

      const { data, error } = await query;

      if (error?.message?.includes("column") && error.message.includes("category")) {
        let fallbackQuery = supabase
          .from("jobs")
          .select(`
            id, title, description, location_name, pay_amount, status,
            profiles:hirer_id ( full_name )
          `)
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(20);

        if (search.trim()) {
          fallbackQuery = fallbackQuery.or(`title.ilike.%${search}%,description.ilike.%${search}%,location_name.ilike.%${search}%`);
        }

        const fallbackResult = await fallbackQuery;
        if (fallbackResult.error) throw fallbackResult.error;
        setJobs(fallbackResult.data || []);
        return;
      }

      if (error) throw error;
      setJobs(data || []);
    } catch (err) {
      console.error("Error fetching jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchJobs(activeCategoryId, searchQuery);
    }, 300); 

    return () => clearTimeout(handler);
  }, [activeCategoryId, searchQuery]);

  return (
    <AppShell header={null}>
      <div className="flex flex-col min-h-full">
        {/* Dark Hero Section */}
        <div className="px-5 pt-6 pb-12 bg-[hsl(25,90%,10%)] text-[hsl(38,71%,93%)]">
          <div className="flex items-center gap-3 mb-6">
            <h1 className="text-xl font-black tracking-tighter">Kaem Kaar</h1>
            <div className="ml-auto"><NotificationBell /></div>
            <div 
              onClick={() => navigate("/profile")}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold border border-white/20 cursor-pointer"
            >
              {profile?.full_name?.[0]?.toUpperCase() || "U"}
            </div>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Salam, {firstName}</p>
          <h2 className="text-3xl font-black mt-2 leading-tight">
            {isHirer ? "Manage your posts\n& find workers" : "Find skilled jobs\nnear you today"}
          </h2>

          <div className="mt-6 relative">
            <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 shadow-xl opacity-95">
              <Search size={18} className="text-muted-foreground text-4xl " />
              <input 
                className="bg-transparent border-none outline-none text-sm font-bold text-black w-full placeholder:text-muted-foreground/100"
                placeholder="Try 'plumber' or 'lal chowk'..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && <X size={18} className="text-muted-foreground" onClick={() => setSearchQuery("")} />}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-background rounded-t-[2.5rem] -mt-6 px-5 pt-8 pb-24 space-y-8">
          
          {/* CATEGORIES SECTION */}
          <section>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Categories</p>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategoryId(cat.id)}
                    className={`flex-shrink-0 flex flex-col items-center gap-2 p-4 rounded-2xl transition-all min-w-[80px] ${
                      isActive 
                      ? "bg-amber-100 border-primary text-amber-900 shadow-lg" 
                      : "bg-card border-transparent text-foreground"
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-[10px] font-bold">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* JOBS LIST SECTION */}
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ">
                {activeCategoryId === 'all' ? 'Latest Openings' : `${activeCategoryId} Results`}
              </p>
              <button onClick={() => navigate("/jobs")} className="text-[10px] font-bold text-primary">SEE ALL →</button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 w-full bg-muted animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="grid gap-3">
                {jobs.length === 0 ? (
                  <div className="text-center py-12 opacity-50 border-2 border-dashed rounded-3xl">
                    <Search size={32} className="mx-auto mb-2" />
                    <p className="text-xs font-bold">No jobs found in this category</p>
                  </div>
                ) : (
                  jobs.map((job) => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={job.id}
                      onClick={() => navigate(`/jobs/${job.id}`)}
                      className="p-4 bg-card border rounded-2xl flex items-center justify-between press shadow-sm"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <Briefcase size={18} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm truncate">{job.title}</h4>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                            <MapPin size={10} className="text-primary" />
                            <span className="truncate">{job.location_name}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-sm font-black text-primary">₹{job.pay_amount}</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">{getCategoryLabel(job.category || "other")}</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </section>

          {isHirer && (
            <button
              onClick={() => navigate("/post-job")}
              className="w-full h-14 bg-primary text-amber-900 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-primary/10 press"
            >
              <Plus size={20} /> POST A NEW JOB
            </button>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default HomePage;