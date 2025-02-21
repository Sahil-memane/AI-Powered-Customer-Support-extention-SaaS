/*
  # Add completed status to tickets

  1. Updates
    - Add 'completed' as a valid status for tickets
  
  2. Security
    - Update existing constraints
*/

-- Update the status constraint to include 'completed'
ALTER TABLE tickets
DROP CONSTRAINT IF EXISTS valid_status;

ALTER TABLE tickets
ADD CONSTRAINT valid_status 
CHECK (status IN ('open', 'in_progress', 'resolved', 'completed'));