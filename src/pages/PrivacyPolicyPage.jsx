import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";

const PrivacyPolicyPage = () => {
  const navigate = useNavigate();

  return (
    <AppShell
      showNav={false}
      header={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="flex h-8 w-8 items-center justify-center rounded-full text-foreground hover:bg-muted"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="font-bold text-foreground">Privacy Policy</h2>
        </div>
      }
    >
      <article className="px-4 py-6 pb-12 text-sm leading-6 text-muted-foreground">
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-border bg-primary/5 p-4">
          <ShieldCheck className="shrink-0 text-primary" size={24} />
          <p>Your privacy matters to us. This policy explains what Kaem Kaar collects and why.</p>
        </div>

        <div className="space-y-6">
          <section>
            <h3 className="mb-1 font-bold text-foreground">Information we collect</h3>
            <p>
              When you use Kaem Kaar, we may collect your name, email or phone number from your sign-in provider, role, skills, expected pay, location, profile photo, job details, applications, messages, reviews, and notifications.
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-bold text-foreground">How we use it</h3>
            <p>
              We use this information to create your account, show relevant jobs and workers, support applications and messaging, provide notifications, process bookings, improve the app, and keep Kaem Kaar secure.
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-bold text-foreground">What others can see</h3>
            <p>
              Information you add to your public profile, job listings, reviews, or active availability may be visible to other users. Applications, direct messages, and account notifications are limited to the people and services needed to provide those features.
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-bold text-foreground">Service providers</h3>
            <p>
              Kaem Kaar uses Supabase for account and data services, Google or Facebook for sign-in, Razorpay for payments, mapping services for maps, and an AI service for the in-app assistant. These providers process information only to provide their services under their own policies.
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-bold text-foreground">Your choices</h3>
            <p>
              You can update your profile, clear your assistant chat history from the assistant screen, and stop using the app at any time. You can also manage browser permissions such as location and notifications. To request account or data deletion, contact the Kaem Kaar team.
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-bold text-foreground">Security and updates</h3>
            <p>
              We use access controls and security features provided by our service providers. No online service is completely secure. We may update this policy when the app or its practices change.
            </p>
          </section>

          <p className="border-t border-border pt-4 text-xs">Last updated: September 4, 2026</p>
        </div>
      </article>
    </AppShell>
  );
};

export default PrivacyPolicyPage;