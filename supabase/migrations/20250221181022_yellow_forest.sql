/*
  # Add storage configuration for ticket attachments

  1. Storage
    - Create bucket for ticket attachments
    - Set up storage policies for authenticated users
*/

-- Create storage bucket for ticket attachments if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS for the bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to upload files
CREATE POLICY "Users can upload ticket attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ticket-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow authenticated users to read their own files
CREATE POLICY "Users can read own ticket attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'ticket-attachments' AND
  (
    -- Allow access if user owns the ticket folder
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Or if user is an agent/admin (checking profiles table)
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'agent')
    )
  )
);

-- Policy to allow authenticated users to delete their own files
CREATE POLICY "Users can delete own ticket attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ticket-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);