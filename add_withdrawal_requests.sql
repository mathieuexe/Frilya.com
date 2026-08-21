-- 1. Create table
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    rib_iban TEXT,
    payment_platform TEXT DEFAULT 'Stripe',
    transfer_reference TEXT,
    admin_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS withdrawal_requests_seller_idx ON public.withdrawal_requests(seller_id, created_at DESC);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- 2. Policies
DROP POLICY IF EXISTS "Sellers view their own withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Sellers view their own withdrawal requests" ON public.withdrawal_requests
    FOR SELECT USING (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Admins manage all withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Admins manage all withdrawal requests" ON public.withdrawal_requests
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

-- 3. Function to request a withdrawal securely
CREATE OR REPLACE FUNCTION public.request_withdrawal(p_amount NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_balance NUMERIC;
    v_new NUMERIC;
    v_req_id UUID;
    v_iban TEXT;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Le montant doit être supérieur à 0';
    END IF;

    -- Check balance
    SELECT balance, iban INTO v_balance, v_iban FROM profiles WHERE id = auth.uid() FOR UPDATE;
    IF v_balance IS NULL OR v_balance < p_amount THEN
        RAISE EXCEPTION 'Solde insuffisant pour ce retrait';
    END IF;

    -- Deduct balance
    v_new := v_balance - p_amount;
    UPDATE profiles SET balance = v_new WHERE id = auth.uid();

    -- Log transaction
    INSERT INTO wallet_transactions (user_id, direction, amount, balance_after, reason)
    VALUES (auth.uid(), 'debit', p_amount, v_new, 'Demande de retrait');

    -- Create withdrawal request
    INSERT INTO withdrawal_requests (seller_id, amount, rib_iban)
    VALUES (auth.uid(), p_amount, COALESCE(v_iban, ''))
    RETURNING id INTO v_req_id;

    RETURN jsonb_build_object('id', v_req_id, 'balance_after', v_new);
END;
$$;

REVOKE ALL ON FUNCTION public.request_withdrawal(NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(NUMERIC) TO authenticated;

-- 4. Function to process a withdrawal (accept/reject)
CREATE OR REPLACE FUNCTION public.process_withdrawal(
    p_req_id UUID, 
    p_status TEXT, 
    p_platform TEXT, 
    p_reference TEXT, 
    p_note TEXT,
    p_rib TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_req RECORD;
    v_balance NUMERIC;
    v_new NUMERIC;
BEGIN
    -- Check admin
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Réservé aux administrateurs';
    END IF;

    IF p_status NOT IN ('accepted', 'rejected') THEN
        RAISE EXCEPTION 'Statut invalide';
    END IF;

    SELECT * INTO v_req FROM withdrawal_requests WHERE id = p_req_id FOR UPDATE;
    IF v_req IS NULL THEN
        RAISE EXCEPTION 'Demande introuvable';
    END IF;
    IF v_req.status <> 'pending' THEN
        RAISE EXCEPTION 'Cette demande a déjà été traitée';
    END IF;

    IF p_status = 'rejected' THEN
        -- Refund the seller
        SELECT balance INTO v_balance FROM profiles WHERE id = v_req.seller_id FOR UPDATE;
        v_new := v_balance + v_req.amount;
        UPDATE profiles SET balance = v_new WHERE id = v_req.seller_id;
        
        INSERT INTO wallet_transactions (user_id, direction, amount, balance_after, reason)
        VALUES (v_req.seller_id, 'credit', v_req.amount, v_new, 'Remboursement suite à un retrait refusé');
    END IF;

    -- Update request
    UPDATE withdrawal_requests 
    SET status = p_status,
        payment_platform = COALESCE(p_platform, payment_platform),
        transfer_reference = p_reference,
        admin_note = p_note,
        rib_iban = COALESCE(p_rib, rib_iban),
        processed_at = NOW()
    WHERE id = p_req_id;

    RETURN jsonb_build_object('id', p_req_id, 'status', p_status);
END;
$$;

REVOKE ALL ON FUNCTION public.process_withdrawal(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_withdrawal(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
