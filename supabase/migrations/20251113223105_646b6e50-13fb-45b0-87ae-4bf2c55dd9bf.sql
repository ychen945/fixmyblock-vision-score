-- Create storage bucket for report photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-photos', 'report-photos', true);

-- Allow authenticated users to upload their own photos
CREATE POLICY "Users can upload report photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'report-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow everyone to view photos
CREATE POLICY "Anyone can view report photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'report-photos');

-- Allow users to delete their own photos
CREATE POLICY "Users can delete own report photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'report-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);