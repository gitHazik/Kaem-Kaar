import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  LogOut,
  Pencil,
  MapPin,
  Wrench,
  IndianRupee,
  Sun,
  Moon,
  User,
  ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";

const ProfilePage = () => {
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <AppShell header={<h2 className="font-bold text-foreground">Profile</h2>}>
      <div className="px-4 py-6 space-y-6 pb-24">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-primary/10 rounded-3xl p-6 flex flex-col items-center"
        >
          <div className="w-20 h-20 rounded-full bg-card border-4 border-background shadow-lg flex items-center justify-center overflow-hidden">
            {profile?.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt="Avatar" 
                className="w-full h-full object-cover" 
              />
            ) : (
              <User size={40} className="text-muted-foreground" />
            )}
          </div>
          <h3 className="font-extrabold text-xl text-foreground mt-3 text-center">
            {profile?.full_name || "New User"}
          </h3>
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary mt-2 bg-primary/20 px-4 py-1 rounded-full border border-primary/20">
            {profile?.role === 'worker' ? "Worker Mode" : "Business Mode"}
          </span>
        </motion.div>

        {/* Info Cards */}
        <div className="space-y-2">
          {profile?.role === 'worker' && (
            <>
              <div className="flex items-center gap-3 border border-border rounded-2xl p-4 bg-card shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Wrench size={18} className="text-primary" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Primary Skill</span>
                  <p className="font-bold text-foreground text-sm">{profile?.skills?.[0] || "Not set"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 border border-border rounded-2xl p-4 bg-card shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                  <IndianRupee size={18} className="text-success" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Daily Expected Pay</span>
                  <p className="font-bold text-foreground text-sm">₹{profile?.expected_pay_per_day || "0"}</p>
                </div>
              </div>
            </>
          )}
          <div className="flex items-center gap-3 border border-border rounded-2xl p-4 bg-card shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <MapPin size={18} className="text-primary" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Base Location</span>
              <p className="font-bold text-foreground text-sm">{profile?.location_name || "Not set"}</p>
            </div>
          </div>
        </div>

        {/* Settings & Actions */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border border-border rounded-2xl p-4 bg-card shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                {theme === "dark" ? <Moon size={18} className="text-primary" /> : <Sun size={18} className="text-primary" />}
              </div>
              <p className="font-bold text-sm">Dark Mode</p>
            </div>
            <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
          </div>

          <Button 
            variant="outline" 
            className="w-full h-12 rounded-xl font-bold press" 
            onClick={() => navigate("/profile/setup")}
          >
            <Pencil size={16} className="mr-2" /> Edit Profile Details
          </Button>

          <Button
            variant="outline"
            className="w-full h-12 rounded-xl font-bold press"
            onClick={() => navigate("/privacy-policy")}
          >
            <ShieldCheck size={16} className="mr-2" /> Privacy Policy
          </Button>

          <Button 
            variant="ghost" 
            className="w-full h-12 text-destructive font-bold hover:bg-destructive/100 mt-4" 
            onClick={() => {
              signOut();
              navigate("/login");
            }}
          >
            <LogOut size={16} className="mr-2" /> Logout Account
          </Button>
        </div>
      </div>
    </AppShell>
  );
};

export default ProfilePage;