# Kaem Kaar
This is the original repo for the complete code of Kaem Kaar Private Limited.

## Authentication setup

Authentication uses Supabase OAuth with Google and Facebook. Enable both providers in the Supabase dashboard and configure their provider credentials there. Add the exact deployed app URL and `http://localhost:5173/` to Supabase **Authentication > URL Configuration > Redirect URLs**.

The client uses the PKCE flow and never collects or stores passwords. Apply `supabase/new.sql` to create the profile trigger that provisions a profile for each new OAuth user. The provider redirect URL is the current app origin followed by `/`.

# Caution
Use of code for republishing or any other use without the authorization of the Kaem Kaar officials is illegal and can result in legal holds
