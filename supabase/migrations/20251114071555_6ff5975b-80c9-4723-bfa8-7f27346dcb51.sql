-- Create report_replies table
CREATE TABLE public.report_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.report_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for report_replies
CREATE POLICY "Everyone can view replies"
ON public.report_replies
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create replies"
ON public.report_replies
FOR INSERT
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own replies"
ON public.report_replies
FOR UPDATE
USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own replies"
ON public.report_replies
FOR DELETE
USING (auth.uid() = author_id);

-- Create index for better query performance
CREATE INDEX idx_report_replies_report_id ON public.report_replies(report_id);
CREATE INDEX idx_report_replies_author_id ON public.report_replies(author_id);