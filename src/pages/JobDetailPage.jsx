import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppShell from "@/components/AppShell";
import PaymentSheet from "@/components/PaymentSheet";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Trash2,
  MapPin,
  CheckCircle2,
  XCircle,
  FileText,
  Loader2,
  Send,
  Undo2,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { CATEGORY_OPTIONS, normalizeCategory } from "@/lib/categories";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const APPLICATION_FEE = 10;

const JobLocationMap = ({ lat, lng, title }) => (
  <div className="space-y-2">
    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
      <MapPin size={12} className="text-primary" /> Job Location
    </label>
    <div className="h-48 w-full rounded-2xl overflow-hidden border border-border">
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© OpenStreetMap'
        />
        <Marker position={[lat, lng]}>
          <Popup>{title}</Popup>
        </Marker>
      </MapContainer>
    </div>
    <a
      href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-primary hover:underline mt-2"
    >
      <MapPin size={11} /> Open in Google Maps
    </a>
  </div>
);

const getReviewCategory = (jobCategory, skill) => {
  const normalizedJobCategory = normalizeCategory(jobCategory);
  if (CATEGORY_OPTIONS.some((category) => category.id === normalizedJobCategory)) return normalizedJobCategory;
  const normalizedSkill = String(skill || "").toLowerCase();
  const skillCategory = {
    repair: ["plumber", "electrician", "painter", "carpenter", "mason", "gardener"],
    homehelp: ["cleaner", "helper"],
    cooking: ["cook"],
    delivery: ["driver"],
    education: ["tutor", "teacher"],
    labor: ["labor", "helper", "mason"],
  };
  return Object.entries(skillCategory).find(([, skills]) => skills.some((term) => normalizedSkill.includes(term)))?.[0] || "other";
};

const JobDetailPage = () => {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [userApplication, setUserApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [acceptedWorkerId, setAcceptedWorkerId] = useState(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewCategory, setReviewCategory] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [showApplyPayment, setShowApplyPayment] = useState(false);

  const isHirer = job?.hirer_id === user?.id;

  const fetchJobAndApplicants = useCallback(async () => {
    if (!id) return;

    try {
      const { data: jobData, error: jobError } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", id)
        .single();

      if (jobError) throw jobError;
      setJob(jobData);
      setAcceptedWorkerId(null);

      const { data: review } = await supabase
        .from("worker_reviews")
        .select("rating, category")
        .eq("job_id", id)
        .maybeSingle();
      setReviewSubmitted(Boolean(review));
      if (review) {
        setReviewRating(review.rating);
        setReviewCategory(review.category);
      }

      if (jobData?.hirer_id === user?.id) {
        const { data: appData } = await supabase
          .from("applications")
          .select(`id, worker_id, status, profiles:worker_id (full_name, avatar_url, skills)`)
          .eq("job_id", id);
        setApplicants(appData || []);

        const acceptedApplication = (appData || []).find((app) => app.status === "accepted");
        if (acceptedApplication?.worker_id) {
          setAcceptedWorkerId(acceptedApplication.worker_id);
        }
      }

      if (jobData?.hirer_id !== user?.id && user) {
        const { data: myAppData } = await supabase
          .from("applications")
          .select("*")
          .eq("job_id", id)
          .eq("worker_id", user.id)
          .maybeSingle();
        setUserApplication(myAppData);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    fetchJobAndApplicants();

    const channel = supabase
      .channel(`job-updates-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "applications", filter: `job_id=eq.${id}` },
        () => fetchJobAndApplicants()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchJobAndApplicants, id]);

  // Called only after the server has verified the Razorpay payment signature and
  // created the application record — nothing here is trusted client-side.
  const handleApplicationPaid = (result) => {
    setUserApplication(result.application);
    setShowApplyPayment(false);
    toast.success("Applied!");
  };

  const handleWithdraw = async () => {
    setActionLoading(true);
    try {
      await supabase.from("applications").delete().eq("id", userApplication.id);
      setUserApplication(null);
      toast.success("Withdrawn");
    } catch (error) {
      toast.error("Error withdrawing");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptWorker = async (workerId, workerName) => {
    setActionLoading(true);
    try {
      const { error: acceptError } = await supabase
        .from("applications")
        .update({ status: "accepted" })
        .eq("job_id", id)
        .eq("worker_id", workerId);
      if (acceptError) throw acceptError;

      const { error: deleteError } = await supabase
        .from("applications")
        .delete()
        .eq("job_id", id)
        .neq("worker_id", workerId);
      if (deleteError) throw deleteError;

      const { data: updatedJob, error: jobError } = await supabase
        .from("jobs")
        .update({ status: "in_progress", assigned_worker_id: workerId })
        .eq("id", id)
        .select()
        .single();
      if (jobError) throw jobError;

      setJob(updatedJob);
      setAcceptedWorkerId(workerId);
      await fetchJobAndApplicants();
      toast.success(`Hired ${workerName}!`);
    } catch (error) {
      console.error("Hire error:", error);
      toast.error(error?.message || "Error hiring");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteJob = async () => {
    if (!job?.id || applicants.length > 0) return;

    setActionLoading(true);
    try {
      const { error } = await supabase.from("jobs").delete().eq("id", id);
      if (error) throw error;
      toast.success("Job deleted");
      navigate("/jobs");
    } catch (error) {
      console.error("Delete job error:", error);
      toast.error("Could not delete job");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateJobStatus = async (newStatus) => {
    setActionLoading(true);
    try {
      const { data: updatedJob } = await supabase.from("jobs").update({ status: newStatus }).eq("id", id).select().single();
      setJob(updatedJob);
      toast.success("Job status updated.");
      if (newStatus === "completed" && acceptedWorkerId && !reviewSubmitted) {
        const worker = applicants.find((app) => app.worker_id === acceptedWorkerId);
        setReviewCategory(getReviewCategory(updatedJob.category, worker?.profiles?.skills?.[0]));
        setReviewRating(0);
        setShowReviewDialog(true);
      }
    } catch (error) {
      toast.error("Update failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewRating || !reviewCategory || !acceptedWorkerId) {
      toast.error("Choose a category and rating first");
      return;
    }

    setActionLoading(true);
    const { error } = await supabase.from("worker_reviews").insert({
      job_id: job.id,
      hirer_id: user.id,
      worker_id: acceptedWorkerId,
      category: reviewCategory,
      rating: reviewRating,
    });
    setActionLoading(false);

    if (error) {
      toast.error(error.code === "23505" ? "This job has already been reviewed" : error.message);
      return;
    }

    setReviewSubmitted(true);
    setShowReviewDialog(false);
    toast.success("Worker rating saved");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  if (!job) {
    return (
      <AppShell header={<h2 className="font-bold">Job Portal</h2>}>
        <div className="px-4 py-10 text-center">
          <p className="text-base font-bold text-foreground">This job is no longer available.</p>
          <Button className="mt-4" onClick={() => navigate("/jobs")}>Back to jobs</Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell header={<h2 className="font-bold">Job Portal</h2>}>
      <div className="px-4 py-6 space-y-6 pb-24">
        
        {/* JOB INFO CARD */}
        <section className="bg-card p-6 rounded-[2rem] border border-border shadow-sm space-y-5">
          <div className="flex justify-between items-start">
            <h1 className="text-2xl font-black tracking-tighter leading-tight">{job?.title}</h1>
            <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${job?.status === "open" ? "bg-success/10 text-success border-success/20" : "bg-primary/10 text-primary border-primary/20"}`}>
              {job?.status}
            </div>
          </div>
          <p className="text-muted-foreground text-sm">"{job?.description}"</p>
          <div className="flex gap-6 pt-4 border-t border-border/50 text-sm font-bold">
            <div className="flex items-center gap-1.5 text-muted-foreground"><MapPin size={16} className="text-primary" /> {job?.location_name}</div>
            <div className="text-foreground bg-primary/10 px-3 py-1 rounded-lg">₹{job?.pay_amount}</div>
          </div>
          {job?.latitude && job?.longitude && <JobLocationMap lat={job.latitude} lng={job.longitude} title={job.title} />}
        </section>

        {/* HIRER VIEW */}
        {isHirer && (
          <div className="space-y-4">
            {job?.status === "open" ? (
              <>
                {applicants.length === 0 && (
                  <Button variant="outline" className="w-full rounded-2xl border-destructive/30 text-destructive" onClick={handleDeleteJob} disabled={actionLoading}>
                    <Trash2 size={16} className="mr-2" /> Delete Posting
                  </Button>
                )}
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Current Applicants ({applicants.length})</h3>
                <AnimatePresence>
                  {applicants.map((app) => (
                    <motion.div key={app.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-card border border-border p-4 rounded-2xl flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary">{app.profiles?.full_name?.charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm truncate">{app.profiles?.full_name}</h4>
                      </div>
                      <div className="flex gap-2">
                        <Button size="icon" variant="outline" className="rounded-xl" onClick={() => navigate(`/chat/${id}/${app.worker_id}`)}><MessageCircle size={18} /></Button>
                        <Button size="sm" className="bg-success text-white rounded-xl" onClick={() => handleAcceptWorker(app.worker_id, app.profiles?.full_name)} disabled={actionLoading}>Hire</Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </>
            ) : job?.status === "in_progress" && (
              <div className="bg-primary/5 border-2 border-primary/20 p-8 rounded-[2.5rem] text-center space-y-4">
                <CheckCircle2 className="text-primary mx-auto" size={32} />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 h-16 rounded-2xl" onClick={() => navigate(`/chat/${id}/${acceptedWorkerId}`)} disabled={!acceptedWorkerId || actionLoading}>Chat with Worker</Button>
                  <Button className="flex-1 h-16 rounded-2xl bg-primary text-white font-black" onClick={() => handleUpdateJobStatus("completed")} disabled={actionLoading}>MARK COMPLETED</Button>
                </div>
              </div>
            )}
            {job?.status === "completed" && acceptedWorkerId && (
              <div className="bg-primary/5 border border-primary/20 p-5 rounded-2xl flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-sm">{reviewSubmitted ? "Worker rated" : "Rate this worker"}</p>
                  {reviewSubmitted && <p className="text-xs text-muted-foreground mt-1">{reviewRating}/5 stars</p>}
                </div>
                {!reviewSubmitted && <Button size="sm" onClick={() => setShowReviewDialog(true)}><Star size={15} /> Rate worker</Button>}
              </div>
            )}
          </div>
        )}

        {/* WORKER VIEW */}
        {!isHirer && (
          <div className="space-y-4">
            {job?.status === "in_progress" ? (
              <div className="bg-muted/50 p-8 rounded-[2rem] text-center border-border">
                <p className="font-black text-lg">Work Started! 🎉</p>
                <Button variant="link" onClick={() => navigate(`/chat/${id}/${job.hirer_id}`)}>Chat with Employer</Button>
              </div>
            ) : job?.status === "open" ? (
              userApplication ? (
                <div className="bg-primary/5 p-6 rounded-[2rem] border border-primary/10 space-y-4">
                  <p className="font-bold text-sm text-center">Applied & Pending</p>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 rounded-xl text-destructive" onClick={handleWithdraw} disabled={actionLoading}><Undo2 size={18} className="mr-2" /> Undo</Button>
                    <Button className="flex-1 rounded-xl" onClick={() => navigate(`/chat/${id}/${job.hirer_id}`)}><MessageCircle size={18} className="mr-2" /> Chat</Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowApplyPayment(true)}
                  disabled={actionLoading}
                  className="w-full h-16 rounded-2xl bg-primary text-white shadow-xl flex items-center justify-between px-6 disabled:opacity-60"
                >
                  <span className="flex items-center gap-2 font-black text-lg">
                    APPLY NOW <Send size={20} />
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-xs line-through opacity-70">₹50</span>
                    <span className="text-[10px] font-black bg-white/20 px-1.5 py-0.5 rounded">80% OFF</span>
                    <span className="text-base font-black">₹{APPLICATION_FEE}</span>
                  </span>
                </button>
              )
            ) : (
              <p className="text-center text-muted-foreground py-10">Applications closed.</p>
            )}
          </div>
        )}
      </div>
      {showReviewDialog && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center p-4">
          <div className="w-full max-w-[480px] bg-background rounded-3xl p-6 space-y-5">
            <div>
              <h2 className="text-xl font-black">Rate the worker</h2>
              <p className="text-sm text-muted-foreground mt-1">Your rating helps other hirers choose confidently.</p>
            </div>
            <select value={reviewCategory} onChange={(event) => setReviewCategory(event.target.value)} className="w-full h-12 rounded-xl border border-border bg-card px-4 text-sm font-bold outline-none">
              <option value="">Choose category</option>
              {CATEGORY_OPTIONS.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
            </select>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button key={rating} onClick={() => setReviewRating(rating)} aria-label={`${rating} stars`} className="p-1">
                  <Star size={32} fill={rating <= reviewRating ? "currentColor" : "none"} className={rating <= reviewRating ? "text-amber-500" : "text-muted-foreground"} />
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowReviewDialog(false)}>Later</Button>
              <Button className="flex-1" onClick={handleSubmitReview} disabled={actionLoading || !reviewRating || !reviewCategory}>Save rating</Button>
            </div>
          </div>
        </div>
      )}

      {showApplyPayment && (
        <PaymentSheet
          amount={APPLICATION_FEE}
          label={`Application fee — ${job.title}`}
          verifyFunctionName="verify-application-payment"
          verifyPayload={{ jobId: job.id }}
          onClose={() => setShowApplyPayment(false)}
          onPaid={handleApplicationPaid}
        />
      )}
    </AppShell>
  );
};

export default JobDetailPage;
