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
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat participants can view messages"
  ON public.messages FOR SELECT USING (
    auth.uid() = sender_id OR
    auth.uid() IN (SELECT hirer_id FROM public.jobs WHERE id = job_id) OR
    auth.uid() IN (SELECT worker_id FROM public.applications WHERE job_id = messages.job_id)
  );

CREATE POLICY "Auth users can send messages"
  ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can delete messages they are part of"
  ON public.messages FOR DELETE USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  );

-- 5. WORKER AVAILABILITY (future feature — by Hazik, do not remove)
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


-- 8. STORAGE
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


-- 9. REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;