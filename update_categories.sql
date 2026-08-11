-- Vider la table actuelle et réinsérer les bonnes catégories
-- On utilise ON CONFLICT DO NOTHING pour éviter les erreurs avec les contraintes existantes
INSERT INTO categories (name, slug) VALUES 
('Design & Graphisme', 'design-graphisme'),
('Marketing digital', 'marketing-digital'),
('Business', 'business'),
('Audiovisuel', 'audiovisuel'),
('Site & Développement', 'site-developpement'),
('Rédaction', 'redaction'),
('Réseaux sociaux', 'reseaux-sociaux'),
('Formations & Coaching', 'formations-coaching'),
('Vie quotidienne', 'vie-quotidienne')
ON CONFLICT (slug) DO NOTHING;
