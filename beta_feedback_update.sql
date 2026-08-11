ALTER TABLE beta_feedbacks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
ALTER TABLE beta_feedbacks ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
