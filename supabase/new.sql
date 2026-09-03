-- ============================================================
-- KAEM KAAR — Complete Database Schema
-- ============================================================

-- 1. PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  phone_number TEXT UNIQUE,
  full_name TEXT,
  role TEXT CHECK (role IN ('worker', 'hirer')),
  skills TEXT[],
  expected_pay_per_day NUMERIC,
  avatar_url TEXT,
  location_name TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Create a profile for every new OAuth user before the client can query it.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. JOBS
-- ============================================================
CREATE TABLE public.jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hirer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  pay_amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  job_date TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'completed', 'cancelled')),
  assigned_worker_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view open jobs"
  ON public.jobs FOR SELECT USING (true);

CREATE POLICY "Hirers can insert jobs"
  ON public.jobs FOR INSERT WITH CHECK (auth.uid() = hirer_id);

CREATE POLICY "Hirers can update own jobs"
  ON public.jobs FOR UPDATE USING (auth.uid() = hirer_id);

CREATE POLICY "Hirers can delete own jobs"
  ON public.jobs FOR DELETE USING (auth.uid() = hirer_id);


-- 3. APPLICATIONS
-- ============================================================
CREATE TABLE public.applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  worker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(job_id, worker_id)
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers can view own applications"
  ON public.applications FOR SELECT USING (
    auth.uid() = worker_id OR
    auth.uid() IN (SELECT hirer_id FROM public.jobs WHERE id = job_id)
  );

CREATE POLICY "Workers can insert applications"
  ON public.applications FOR INSERT WITH CHECK (auth.uid() = worker_id);

CREATE POLICY "Hirers can update application status"
  ON public.applications FOR UPDATE USING (
    auth.uid() IN (SELECT hirer_id FROM public.jobs WHERE id = job_id)
  );

CREATE POLICY "Hirers can delete applications for their own jobs"
  ON public.applications FOR DELETE USING (
    auth.uid() IN (SELECT hirer_id FROM public.jobs WHERE id = job_id)
  );


-- 4. MESSAGES
-- ============================================================
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat participants can view messages"
  ON public.messages FOR SELECT USING (
    auth.uid() = sender_id OR
    auth.uid() = receiver_id OR
    auth.uid() IN (SELECT hirer_id FROM public.jobs WHERE id = job_id) OR
    auth.uid() IN (SELECT worker_id FROM public.applications WHERE job_id = messages.job_id)
  );

CREATE POLICY "Auth users can send messages"
  ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can delete messages they are part of"
  ON public.messages FOR DELETE USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  );

CREATE POLICY "Receivers can mark messages read"
  ON public.messages FOR UPDATE USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);


-- 4b. NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  data JSONB DEFAULT '{}'::jsonb NOT NULL,
  is_read BOOLEAN DEFAULT false NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX notifications_user_created_idx
  ON public.notifications(user_id, created_at DESC);
CREATE INDEX notifications_unread_idx
  ON public.notifications(user_id, is_read) WHERE is_read = false;

CREATE POLICY "Users can view their notifications"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their notifications"
  ON public.notifications FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.notify_message_recipient()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_name TEXT;
  target_url TEXT;
BEGIN
  IF NEW.receiver_id IS NULL OR NEW.receiver_id = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, 'Someone') INTO sender_name
  FROM public.profiles WHERE id = NEW.sender_id;

  target_url := CASE
    WHEN NEW.job_id IS NULL THEN '/chat/direct/' || NEW.sender_id::text
    ELSE '/chat/' || NEW.job_id::text || '/' || NEW.sender_id::text
  END;

  INSERT INTO public.notifications (user_id, type, title, message, action_url, data)
  VALUES (
    NEW.receiver_id,
    'message',
    'New message from ' || COALESCE(sender_name, 'Someone'),
    LEFT(NEW.content, 180),
    target_url,
    jsonb_build_object('message_id', NEW.id, 'sender_id', NEW.sender_id, 'job_id', NEW.job_id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_message_created
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_message_recipient();

CREATE OR REPLACE FUNCTION public.notify_application_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  job_owner UUID;
  job_title TEXT;
  target_user UUID;
  notification_title TEXT;
  notification_message TEXT;
  target_url TEXT;
BEGIN
  SELECT hirer_id, title INTO job_owner, job_title
  FROM public.jobs WHERE id = NEW.job_id;

  IF TG_OP = 'INSERT' THEN
    target_user := job_owner;
    notification_title := 'New job application';
    notification_message := 'A worker applied for ' || COALESCE(job_title, 'your job');
    target_url := '/jobs/' || NEW.job_id::text;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    target_user := NEW.worker_id;
    notification_title := 'Application ' || NEW.status;
    notification_message := 'Your application for ' || COALESCE(job_title, 'a job') || ' was ' || NEW.status || '.';
    target_url := '/jobs/' || NEW.job_id::text;
  ELSE
    RETURN NEW;
  END IF;

  IF target_user IS NOT NULL AND target_user <> auth.uid() THEN
    INSERT INTO public.notifications (user_id, type, title, message, action_url, data)
    VALUES (target_user, 'application', notification_title, notification_message, target_url,
      jsonb_build_object('application_id', NEW.id, 'job_id', NEW.job_id));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_application_notification
  AFTER INSERT OR UPDATE OF status ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_application_change();


-- 5. WORKER REVIEWS
-- ============================================================
CREATE TABLE public.worker_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL UNIQUE,
  hirer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  worker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.worker_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view worker reviews"
  ON public.worker_reviews FOR SELECT USING (true);

CREATE POLICY "Hirers can review their completed jobs"
  ON public.worker_reviews FOR INSERT WITH CHECK (
    auth.uid() = hirer_id AND
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_id
        AND jobs.hirer_id = auth.uid()
        AND jobs.status = 'completed'
        AND jobs.assigned_worker_id = worker_id
    )
  );

CREATE POLICY "Hirers can update their reviews"
  ON public.worker_reviews FOR UPDATE USING (auth.uid() = hirer_id);

-- 6. WORKER AVAILABILITY (future feature — by Hazik, do not remove)
-- ============================================================
CREATE TABLE public.worker_availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  skill TEXT NOT NULL,
  location_name TEXT NOT NULL,
  pay_per_day NUMERIC NOT NULL,
  available_date TEXT,
  note TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.worker_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active availability"
  ON public.worker_availability FOR SELECT USING (is_active = true);

CREATE POLICY "Workers can insert own availability"
  ON public.worker_availability FOR INSERT WITH CHECK (auth.uid() = worker_id);

CREATE POLICY "Workers can update own availability"
  ON public.worker_availability FOR UPDATE USING (auth.uid() = worker_id);

CREATE POLICY "Workers can delete own availability"
  ON public.worker_availability FOR DELETE USING (auth.uid() = worker_id);


-- 9. STORAGE
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );


-- 10. REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;