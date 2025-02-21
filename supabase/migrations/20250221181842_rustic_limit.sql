/*
  # Add agent status tracking

  1. Updates
    - Add last_seen column to profiles table
    - Add status column to profiles table
  
  2. Security
    - Update RLS policies to allow status updates
*/

-- Add columns for agent status tracking
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_seen timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS status text DEFAULT 'offline'
  CHECK (status IN ('online', 'offline', 'away'));

-- Update RLS policies
CREATE POLICY "Agents can update their own status"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to update agent status
CREATE OR REPLACE FUNCTION update_agent_status()
RETURNS trigger AS $$
BEGIN
  UPDATE profiles
  SET last_seen = now()
  WHERE user_id = auth.uid()
  AND role = 'agent';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;