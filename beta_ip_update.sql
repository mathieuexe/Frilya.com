ALTER TABLE beta_applications ADD COLUMN IF NOT EXISTS ip_address TEXT;

CREATE POLICY "Lecture des demandes par IP" 
    ON beta_applications FOR SELECT 
    USING (true);