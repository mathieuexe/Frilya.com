-- =====================================================================
-- Tunnel de vente, commandes et porte-monnaie Frilya
-- À exécuter dans l'éditeur SQL de Supabase :
-- https://app.supabase.com/project/bkrfulpstfhpnlrwocdt/sql
--
-- Cycle de vie d'une commande :
--   pending      commande créée, paiement non confirmé
--   in_progress  payée (fonds séquestrés), le vendeur doit livrer
--   delivered    livrée par le vendeur, en attente de validation acheteur
--   completed    validée : le vendeur est crédité de (montant - commission)
--   cancelled / disputed
-- =====================================================================

-- 1. PORTE-MONNAIE
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS balance NUMERIC NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    -- credit (entrée) / debit (sortie)
    direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    balance_after NUMERIC NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wallet_transactions_user_idx ON public.wallet_transactions(user_id, created_at DESC);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Lecture de son propre historique ; écriture réservée aux fonctions SECURITY DEFINER
DROP POLICY IF EXISTS "Users read their wallet history" ON public.wallet_transactions;
CREATE POLICY "Users read their wallet history" ON public.wallet_transactions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins read all wallet history" ON public.wallet_transactions;
CREATE POLICY "Admins read all wallet history" ON public.wallet_transactions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );


-- 2. COMMANDES : informations du tunnel de vente
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS package_id UUID;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS package_snapshot JSONB;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS requirements_answers JSONB;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_due_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;

-- Les commandes sont créées côté serveur (api/create-order.ts) mais l'acheteur
-- et le vendeur doivent pouvoir faire avancer leur commande.
DROP POLICY IF EXISTS "Buyers can insert their orders" ON public.orders;
CREATE POLICY "Buyers can insert their orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Buyers can update their orders" ON public.orders;
CREATE POLICY "Buyers can update their orders" ON public.orders
    FOR UPDATE USING (auth.uid() = buyer_id) WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Sellers can update their orders" ON public.orders;
CREATE POLICY "Sellers can update their orders" ON public.orders
    FOR UPDATE USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
CREATE POLICY "Admins can manage all orders" ON public.orders
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );


-- 3. PAIEMENT PAR LE SOLDE (atomique : verrou + vérification + débit + écriture)
CREATE OR REPLACE FUNCTION public.pay_order_with_balance(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order   RECORD;
    v_balance NUMERIC;
    v_new     NUMERIC;
BEGIN
    -- Verrouille la commande pour éviter tout double paiement concurrent
    SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;

    IF v_order IS NULL THEN
        RAISE EXCEPTION 'Commande introuvable';
    END IF;
    IF v_order.buyer_id <> auth.uid() THEN
        RAISE EXCEPTION 'Cette commande ne vous appartient pas';
    END IF;
    IF v_order.status <> 'pending' THEN
        RAISE EXCEPTION 'Cette commande a déjà été réglée';
    END IF;

    SELECT balance INTO v_balance FROM profiles WHERE id = auth.uid() FOR UPDATE;

    IF v_balance IS NULL OR v_balance < v_order.amount THEN
        RAISE EXCEPTION 'Solde insuffisant : % € disponibles pour % € requis',
            COALESCE(v_balance, 0), v_order.amount;
    END IF;

    v_new := v_balance - v_order.amount;

    UPDATE profiles SET balance = v_new WHERE id = auth.uid();

    INSERT INTO wallet_transactions (user_id, order_id, direction, amount, balance_after, reason)
    VALUES (auth.uid(), p_order_id, 'debit', v_order.amount, v_new, 'Paiement de la commande');

    UPDATE orders
       SET status = 'in_progress',
           payment_method = 'balance',
           paid_at = NOW(),
           updated_at = NOW()
     WHERE id = p_order_id;

    RETURN jsonb_build_object('order_id', p_order_id, 'balance_after', v_new);
END;
$$;

REVOKE ALL ON FUNCTION public.pay_order_with_balance(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pay_order_with_balance(UUID) TO authenticated;


-- 4. VALIDATION DE LA LIVRAISON : l'acheteur libère les fonds au vendeur
CREATE OR REPLACE FUNCTION public.complete_order(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order  RECORD;
    v_payout NUMERIC;
    v_new    NUMERIC;
BEGIN
    SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;

    IF v_order IS NULL THEN
        RAISE EXCEPTION 'Commande introuvable';
    END IF;
    IF v_order.buyer_id <> auth.uid() THEN
        RAISE EXCEPTION 'Seul l''acheteur peut valider cette commande';
    END IF;
    IF v_order.status NOT IN ('delivered', 'in_progress') THEN
        RAISE EXCEPTION 'Cette commande ne peut pas être validée (statut %)', v_order.status;
    END IF;

    -- Le vendeur reçoit le montant hors commission de la plateforme
    v_payout := GREATEST(v_order.amount - COALESCE(v_order.platform_fee, 0), 0);

    SELECT balance + v_payout INTO v_new FROM profiles WHERE id = v_order.seller_id FOR UPDATE;

    UPDATE profiles SET balance = v_new WHERE id = v_order.seller_id;

    INSERT INTO wallet_transactions (user_id, order_id, direction, amount, balance_after, reason)
    VALUES (v_order.seller_id, p_order_id, 'credit', v_payout, v_new, 'Commande validée par l''acheteur');

    UPDATE orders SET status = 'completed', updated_at = NOW() WHERE id = p_order_id;

    RETURN jsonb_build_object('order_id', p_order_id, 'seller_payout', v_payout);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_order(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_order(UUID) TO authenticated;


-- 5. CRÉDITER UN SOLDE DEPUIS L'ADMINISTRATION (remboursement, geste commercial, test)
CREATE OR REPLACE FUNCTION public.admin_adjust_wallet(p_user_id UUID, p_amount NUMERIC, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new NUMERIC;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Réservé aux administrateurs';
    END IF;
    IF p_amount = 0 THEN
        RAISE EXCEPTION 'Montant nul';
    END IF;

    SELECT GREATEST(balance + p_amount, 0) INTO v_new FROM profiles WHERE id = p_user_id FOR UPDATE;

    IF v_new IS NULL THEN
        RAISE EXCEPTION 'Utilisateur introuvable';
    END IF;

    UPDATE profiles SET balance = v_new WHERE id = p_user_id;

    INSERT INTO wallet_transactions (user_id, direction, amount, balance_after, reason)
    VALUES (
        p_user_id,
        CASE WHEN p_amount > 0 THEN 'credit' ELSE 'debit' END,
        ABS(p_amount),
        v_new,
        COALESCE(p_reason, 'Ajustement administrateur')
    );

    RETURN jsonb_build_object('user_id', p_user_id, 'balance_after', v_new);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_adjust_wallet(UUID, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_adjust_wallet(UUID, NUMERIC, TEXT) TO authenticated;


-- 6. Rafraîchir le cache de schéma de l'API
NOTIFY pgrst, 'reload schema';
