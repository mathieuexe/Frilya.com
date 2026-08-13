-- Check if foreign key exists
ALTER TABLE services DROP CONSTRAINT IF EXISTS services_seller_id_fkey;
ALTER TABLE services ADD CONSTRAINT services_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE CASCADE;
