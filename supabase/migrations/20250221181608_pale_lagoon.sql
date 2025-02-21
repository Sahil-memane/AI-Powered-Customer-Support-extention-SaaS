/*
  # Storage setup for ticket attachments

  1. New Storage
    - Creates ticket-attachments bucket
    - Sets up file size limits and allowed MIME types
  
  2. Security
    - Enables RLS on storage.objects
    - Adds policies for upload, read, and delete operations
    - Restricts access based on user ownership and roles
*/

-- Create storage bucket for ticket attachments if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'ticket-attachments',
    'ticket-attachments',
    false,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf']::text[]
  )
  ON CONFLICT (id) DO UPDATE
  SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
END $$;

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