/*
  # Add additional fields to tickets table

  1. Changes
    - Add `channel` column to specify the source of the ticket (email, web, voice, etc.)
    - Add `sentiment_score` for AI analysis results
    - Add `attachments` array for file uploads
    - Add `ai_summary` for AI-generated ticket summaries
    - Add `satisfaction_score` for customer feedback
    - Add `response_time` to track SLA metrics

  2. Security
    - Maintain existing RLS policies
*/

ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'web',
ADD COLUMN IF NOT EXISTS sentiment_score float,
ADD COLUMN IF NOT EXISTS attachments text[],
ADD COLUMN IF NOT EXISTS ai_summary text,
ADD COLUMN IF NOT EXISTS satisfaction_score integer,
ADD COLUMN IF NOT EXISTS response_time interval,
ADD CONSTRAINT valid_channel CHECK (channel IN ('email', 'web', 'voice', 'social'));

-- Update the tickets policies to include new columns
DROP POLICY IF EXISTS "Customers can read own tickets" ON tickets;
DROP POLICY IF EXISTS "Customers can create tickets" ON tickets;
DROP POLICY IF EXISTS "Agents and admins can update tickets" ON tickets;

CREATE POLICY "Customers can read own tickets"
  ON tickets
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'agent')
    )
  );

CREATE POLICY "Customers can create tickets"
  ON tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Agents and admins can update tickets"
  ON tickets
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'agent')
    )
  );