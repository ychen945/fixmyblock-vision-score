-- Add civic_bodies_notified to report_status enum
ALTER TYPE report_status ADD VALUE IF NOT EXISTS 'civic_bodies_notified';

-- Create report_verifications table for "verified by residents"
CREATE TABLE public.report_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(report_id, user_id)
);

-- Enable RLS
ALTER TABLE public.report_verifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Everyone can view verifications"
ON public.report_verifications
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can verify reports"
ON public.report_verifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own verifications"
ON public.report_verifications
FOR DELETE
USING (auth.uid() = user_id);