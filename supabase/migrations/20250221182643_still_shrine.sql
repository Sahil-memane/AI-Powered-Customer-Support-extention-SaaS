/*
  # Fix Storage and Profiles Schema

  1. Changes
    - Add foreign key relationship between profiles and auth.users
    - Update storage bucket configuration
    - Add missing indexes
    - Fix RLS policies

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for storage access
*/

-- Fix profiles table foreign key
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Create index for faster joins
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Update storage configuration
DO $$
BEGIN
  -- Create bucket if it doesn't exist
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('ticket-attachments', 'ticket-attachments', false)
  ON CONFLICT (id) DO NOTHING;

  -- Update file size limits and allowed types
  UPDATE storage.buckets
  SET file_size_limit = 5242880,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf']::text[]
  WHERE id = 'ticket-attachments';
END $$;

-- Recreate storage policies
DROP POLICY IF EXISTS "Users can upload ticket attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own ticket attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own ticket attachments" ON storage.objects;

CREATE POLICY "Users can upload ticket attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ticket-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read own ticket attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'ticket-attachments' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'agent')
    )
  )
);

CREATE POLICY "Users can delete own ticket attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ticket-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Add agent status tracking
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_seen timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS status text DEFAULT 'offline',
ADD CONSTRAINT profiles_status_check 
  CHECK (status IN ('online', 'offline', 'away'));

-- Update ticket status constraint
ALTER TABLE tickets
DROP CONSTRAINT IF EXISTS valid_status;

ALTER TABLE tickets
ADD CONSTRAINT valid_status 
CHECK (status IN ('open', 'in_progress', 'resolved', 'completed'));