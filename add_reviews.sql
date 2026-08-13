-- Table des avis (reviews)
CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(order_id) -- Un seul avis par commande
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les avis
DROP POLICY IF EXISTS "Public read reviews" ON reviews;
CREATE POLICY "Public read reviews" ON reviews FOR SELECT USING (true);

-- Les acheteurs peuvent ajouter un avis pour leurs propres commandes (uniquement livrées ou terminées)
DROP POLICY IF EXISTS "Buyers insert reviews" ON reviews;
CREATE POLICY "Buyers insert reviews" ON reviews FOR INSERT WITH CHECK (
    auth.uid() = buyer_id 
    AND EXISTS (
        SELECT 1 FROM orders 
        WHERE orders.id = order_id 
        AND orders.buyer_id = auth.uid()
        AND orders.status IN ('delivered', 'completed')
    )
);

-- Les acheteurs peuvent modifier leurs propres avis
DROP POLICY IF EXISTS "Buyers update own reviews" ON reviews;
CREATE POLICY "Buyers update own reviews" ON reviews FOR UPDATE USING (auth.uid() = buyer_id);

-- Rafraîchir le cache
NOTIFY pgrst, 'reload schema';