import { lazy, Suspense, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Loader2 } from "lucide-react";

const HomePage = lazy(() => import("./pages/HomePage"));
const WorkersPage = lazy(() => import("./pages/WorkersPage"));
const JobFeedPage = lazy(() => import("./pages/JobFeedPage"));
const PostJobPage = lazy(() => import("./pages/PostJobPage"));
const PostAvailabilityPage = lazy(() => import("./pages/PostAvailabilityPage"));
const JobDetailPage = lazy(() => import("./pages/JobDetailPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const MessagesPage = lazy(() => import("./pages/MessagesPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const WorkerProfileSetup = lazy(() => import("./pages/WorkerProfileSetup"));
const RoleSelectionPage = lazy(() => import("./pages/RoleSelectionPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const AIChatbotPage = lazy(() => import("./pages/AIChatbotPage"));
const SplashScreen = lazy(() => import("./pages/SplashScreen"));

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }) => {
  const { user, loading, profile, profileLoaded } = useAuth();
  const location = useLocation();

  if (loading || (user && !profileLoaded)) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (profileLoaded && !profile?.role && location.pathname !== "/profile/setup") {
    return <Navigate to="/profile/setup" replace />;
  }

  return <>{children}</>;
};

const AuthRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const RouteFallback = () => (
  <div className="min-h-svh flex items-center justify-center bg-background">
    <Loader2 className="animate-spin text-primary" size={32} />
  </div>
);

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return (
      <ThemeProvider>
        <Suspense fallback={<RouteFallback />}>
          <SplashScreen onFinish={() => setShowSplash(false)} />
        </Suspense>
      </ThemeProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Sonner position="top-center" />
          <AuthProvider>
            <BrowserRouter>
              <NotificationProvider>
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                  <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />

                  <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
                  <Route path="/workers" element={<ProtectedRoute><WorkersPage /></ProtectedRoute>} />
                  <Route path="/jobs" element={<ProtectedRoute><JobFeedPage /></ProtectedRoute>} />
                  <Route path="/jobs/:id" element={<ProtectedRoute><JobDetailPage /></ProtectedRoute>} />
                  <Route path="/post-job" element={<ProtectedRoute><PostJobPage /></ProtectedRoute>} />
                  <Route path="/post-availability" element={<ProtectedRoute><PostAvailabilityPage /></ProtectedRoute>} />
                  <Route path="/chat/:jobId/:workerId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
                  <Route path="/chat/direct/:workerId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
                  <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
                  <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
                  <Route path="/assistant" element={<ProtectedRoute><AIChatbotPage /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                  <Route path="/profile/setup" element={<ProtectedRoute><WorkerProfileSetup /></ProtectedRoute>} />
                  <Route path="/role-selection" element={<ProtectedRoute><RoleSelectionPage /></ProtectedRoute>} />

                  <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </NotificationProvider>
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
