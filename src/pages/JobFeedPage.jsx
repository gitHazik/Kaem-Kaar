import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import JobCard from "@/components/JobCard";
import AppShell from "@/components/AppShell";
import PaymentSheet from "@/components/PaymentSheet";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Briefcase,
  Users,
  ClipboardList,
  Loader2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { isActiveJobStatus, isCompletedJobStatus } from "@/lib/job-status";

const APPLICATION_FEE = 10;

const statusConfig = {
  pending: { label: "Pending", classes: "bg-yellow-100 text-yellow-800" },
  accepted: { label: "Accepted", classes: "bg-green-100 text-green-800" },
  rejected: { label: "Rejected", classes: "bg-red-100 text-red-800" },
};

const MyApplications = ({ userId }) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) {
      setApplications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("applications")
      .select(`
        id,
        status,
        job_id,
        created_at,
        jobs (
          id,
          title,
          pay_amount,
          location_name,
          profiles:hirer_id ( full_name )
        )
      `)
      .eq("worker_id", userId)
      .order("created_at", { ascending: false });

    if (!error) setApplications(data || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleWithdraw = async (appId) => {
    const { error } = await supabase
      .from("applications")
      .delete()
      .eq("id", appId);

    if (error) {
      toast.error("Could not withdraw application");
    } else {
      toast.success("Application withdrawn");
      setApplications(prev => prev.filter(a => a.id !== appId));
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      {applications.map((app, i) => {
        const status = statusConfig[app.status] ?? statusConfig.pending;
        const isPending = app.status === "pending";

        return (
          <motion.div
            key={app.id}
            className="bg-card border rounded-2xl p-4 space-y-3"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="font-bold text-sm">{app.jobs?.title}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  {app.jobs?.profiles?.full_name}
                </p>
              </div>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${status.classes}`}>
                {status.label}
              </span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-border/50">
              <span className="text-xs font-bold text-primary">₹{app.jobs?.pay_amount}</span>
              
              {isPending && (
                <button
                  onClick={() => handleWithdraw(app.id)}
                  className="text-[10px] font-bold text-destructive hover:underline press"
                >
                  Undo Application
                </button>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

const JobFeedPage = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const isHirer = profile?.role === "hirer";

  const [tab, setTab] = useState(isHirer ? "jobs" : "browse");
  const [jobs, setJobs] = useState([]);
  const [appliedJobIds, setAppliedJobIds] = useState(new Set());
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applyingJob, setApplyingJob] = useState(null); // job currently being paid for

  const visibleJobs = jobs.filter((job) => {
    if (!isHirer) return true;
    return tab === "completed" ? isCompletedJobStatus(job.status) : isActiveJobStatus(job.status);
  });

  const fetchJobs = useCallback(async () => {
    if (!profile?.id && isHirer) {
      setJobs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let query = supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });

    if (isHirer) {
      query = query.eq("hirer_id", profile.id);
    } else {
      query = query.eq("status", "open");
    }

    const { data, error } = await query;
    if (error) toast.error("Failed to load jobs");
    else setJobs(data || []);

    if (!isHirer && user) {
      const { data: apps } = await supabase
        .from("applications")
        .select("job_id")
        .eq("worker_id", user.id);
      setAppliedJobIds(new Set(apps?.map((a) => a.job_id) || []));
    }
    setLoading(false);
  }, [isHirer, profile?.id, user]);

  /* FUTURE_FEATURE: Worker Availability Fetch
  const fetchWorkers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("worker_availability")
      .select("*, profiles(full_name, avatar_url)")
      .eq("is_active", true);
    if (!error) setWorkers(data || []);
    setLoading(false);
  };
  */

  useEffect(() => {
    if (!profile?.role) return;
    if (profile.role === "hirer" && tab === "browse") {
      setTab("jobs");
      return;
    }
    if (profile.role !== "hirer" && tab === "jobs") {
      setTab("browse");
    }
  }, [profile?.role, tab]);

  useEffect(() => {
    if (tab === "browse" || tab === "jobs" || tab === "completed") {
      fetchJobs();
    }
  }, [tab, fetchJobs]);

  // Called only after the server has verified the Razorpay payment signature and
  // created the application record — nothing here is trusted client-side.
  const handleApplicationPaid = (result, jobId) => {
    setApplyingJob(null);
    setAppliedJobIds((prev) => new Set(prev).add(jobId));
    toast.success("Applied successfully!");
  };

  return (
    <AppShell
      header={
        <div className="flex items-center justify-between w-full">
          <h2 className="font-bold text-foreground">
            {isHirer
              ? tab === "jobs"
                ? "My Postings"
                : "Find Workers"
              : tab === "browse"
                ? "Job Feed"
                : "Applications"}
          </h2>
          {isHirer && tab === "jobs" && (
            <Button
              size="sm"
              onClick={() => navigate("/post-job")}
              className="rounded-xl h-9"
            >
              <Plus size={16} className="mr-1" /> Post Job
            </Button>
          )}
          {/* FUTURE_FEATURE: Worker "I'm Available" button
          {!isHirer && tab === "browse" && (
            <Button size="sm" onClick={() => navigate("/post-availability")} className="rounded-xl h-9">
               <Plus size={16} className="mr-1" /> I'm Available
            </Button>
          )}
          */}
        </div>
      }
    >
      {/* --- TAB TOGGLE --- */}
      <div className="flex gap-1 mx-4 mt-4 bg-muted/50 p-1 rounded-xl border border-border/50">
        {isHirer ? (
          <>
            <button
              onClick={() => setTab("jobs")}
              className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tab === "jobs" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
            >
              Active Jobs
            </button>
            <button
              onClick={() => setTab("completed")}
              className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tab === "completed" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
            >
              Completed
            </button>
            {/* FUTURE_FEATURE: Workers Tab
            <button onClick={() => setTab("workers")} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tab === "workers" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>
              Browse Workers
            </button>
            */}
          </>
        ) : (
          <>
            <button
              onClick={() => setTab("browse")}
              className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tab === "browse" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
            >
              Find Work
            </button>
            <button
              onClick={() => setTab("applications")}
              className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tab === "applications" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
            >
              My Apps
            </button>
          </>
        )}
      </div>

      <div className="px-4 py-4 space-y-4">
        {!isHirer && tab === "applications" ? (
          <MyApplications userId={user?.id} />
        ) : loading ? (
          <div className="space-y-4 pt-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 w-full bg-muted/40 animate-pulse rounded-2xl"
              />
            ))}
          </div>
        ) : visibleJobs.length === 0 ? (
          <div className="text-center py-20 opacity-40">
            <Search size={48} className="mx-auto mb-4" />
            <p className="font-bold">No jobs found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleJobs.map((job) => (
              <JobCard
                key={job.id}
                title={job.title}
                location={job.location_name}
                pay={job.pay_amount}
                date={job.job_date || "Today"}
                status={
                  !isHirer && appliedJobIds.has(job.id) ? "applied" : job.status
                }
                onApply={
                  !isHirer && !appliedJobIds.has(job.id)
                    ? () => setApplyingJob(job)
                    : undefined
                }
                onView={() => navigate(`/jobs/${job.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {applyingJob && (
        <PaymentSheet
          amount={APPLICATION_FEE}
          label={`Application fee — ${applyingJob.title}`}
          verifyFunctionName="verify-application-payment"
          verifyPayload={{ jobId: applyingJob.id }}
          onClose={() => setApplyingJob(null)}
          onPaid={(result) => handleApplicationPaid(result, applyingJob.id)}
        />
      )}
    </AppShell>
  );
};

export default JobFeedPage;
