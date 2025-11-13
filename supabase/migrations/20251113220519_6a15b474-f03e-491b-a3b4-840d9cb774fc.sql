-- Create users table (profiles)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  email TEXT,
  contribution_score INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create blocks table
CREATE TABLE public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  need_score INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create enum for report types
CREATE TYPE public.report_type AS ENUM ('pothole', 'broken_light', 'trash', 'flooding', 'other');

-- Create enum for report status
CREATE TYPE public.report_status AS ENUM ('open', 'resolved');

-- Create reports table
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_url TEXT NOT NULL,
  type public.report_type NOT NULL,
  description TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  block_id UUID REFERENCES public.blocks(id) ON DELETE SET NULL,
  status public.report_status DEFAULT 'open' NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolved_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  ai_metadata JSONB
);

-- Create upvotes table
CREATE TABLE public.upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, report_id)
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upvotes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view all profiles"
  ON public.users FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for blocks table
CREATE POLICY "Everyone can view blocks"
  ON public.blocks FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert blocks"
  ON public.blocks FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for reports table
CREATE POLICY "Everyone can view reports"
  ON public.reports FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create reports"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own reports"
  ON public.reports FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Anyone can mark reports as resolved"
  ON public.reports FOR UPDATE
  USING (true)
  WITH CHECK (status = 'resolved');

-- RLS Policies for upvotes table
CREATE POLICY "Everyone can view upvotes"
  ON public.upvotes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create upvotes"
  ON public.upvotes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own upvotes"
  ON public.upvotes FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_reports_block_id ON public.reports(block_id);
CREATE INDEX idx_reports_created_by ON public.reports(created_by);
CREATE INDEX idx_reports_status ON public.reports(status);
CREATE INDEX idx_upvotes_report_id ON public.upvotes(report_id);
CREATE INDEX idx_upvotes_user_id ON public.upvotes(user_id);
CREATE INDEX idx_blocks_slug ON public.blocks(slug);

-- Function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, display_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Anonymous User'),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update contribution score when user creates a report
CREATE OR REPLACE FUNCTION public.increment_contribution_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET contribution_score = contribution_score + 10
  WHERE id = NEW.created_by;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to increment score on report creation
CREATE TRIGGER on_report_created
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.increment_contribution_score();

-- Function to update block need score based on open reports
CREATE OR REPLACE FUNCTION public.update_block_need_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the need score for the block (count of open reports + upvotes)
  UPDATE public.blocks
  SET need_score = (
    SELECT COUNT(r.id) * 10 + COALESCE(SUM(upvote_count), 0)
    FROM public.reports r
    LEFT JOIN (
      SELECT report_id, COUNT(*) as upvote_count
      FROM public.upvotes
      GROUP BY report_id
    ) u ON r.id = u.report_id
    WHERE r.block_id = COALESCE(NEW.block_id, OLD.block_id)
      AND r.status = 'open'
  )
  WHERE id = COALESCE(NEW.block_id, OLD.block_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers to update block need score
CREATE TRIGGER on_report_change
  AFTER INSERT OR UPDATE OR DELETE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.update_block_need_score();

CREATE TRIGGER on_upvote_change
  AFTER INSERT OR DELETE ON public.upvotes
  FOR EACH ROW EXECUTE FUNCTION public.update_block_need_score();