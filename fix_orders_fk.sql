-- Drop existing foreign keys if they exist (they might be pointing to auth.users)
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_buyer_id_fkey;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_seller_id_fkey;

-- Add correct foreign keys pointing to public.profiles
ALTER TABLE public.orders 
  ADD CONSTRAINT orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.orders 
  ADD CONSTRAINT orders_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Refresh the PostgREST schema cache so the API recognizes the new relations
NOTIFY pgrst, 'reload schema';
