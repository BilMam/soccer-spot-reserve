
-- Activer l'extension pg_trgm pour la recherche floue
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Créer des index GIN pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_fields_search_gin 
ON public.fields USING gin (
  (name || ' ' || location || ' ' || address || ' ' || city) gin_trgm_ops
);

-- Index pour la recherche full-text
CREATE INDEX IF NOT EXISTS idx_fields_fulltext 
ON public.fields USING gin (
  to_tsvector('french', name || ' ' || location || ' ' || address || ' ' || city)
);

-- Ajouter des colonnes pour la géolocalisation (préparation pour Phase 2)
ALTER TABLE public.fields 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Fonction pour calculer la similarité de recherche
CREATE OR REPLACE FUNCTION public.calculate_search_similarity(
  search_term TEXT,
  field_text TEXT
) RETURNS DECIMAL AS $$
BEGIN
  RETURN GREATEST(
    similarity(search_term, field_text),
    word_similarity(search_term, field_text)
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fonction de recherche intelligente avec tolérance aux fautes
CREATE OR REPLACE FUNCTION public.intelligent_field_search(
  search_query TEXT,
  similarity_threshold DECIMAL DEFAULT 0.2
) RETURNS TABLE (
  id UUID,
  name TEXT,
  location TEXT,
  address TEXT,
  city TEXT,
  price_per_hour NUMERIC,
  rating NUMERIC,
  total_reviews INTEGER,
  images TEXT[],
  amenities TEXT[],
  capacity INTEGER,
  field_type TEXT,
  relevance_score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.name,
    f.location,
    f.address,
    f.city,
    f.price_per_hour,
    f.rating,
    f.total_reviews,
    f.images,
    f.amenities,
    f.capacity,
    f.field_type,
    GREATEST(
      -- Recherche exacte (score le plus élevé)
      CASE WHEN (f.name || ' ' || f.location || ' ' || f.address || ' ' || f.city) ILIKE '%' || search_query || '%' 
           THEN 1.0 ELSE 0.0 END,
      
      -- Recherche full-text
      ts_rank(
        to_tsvector('french', f.name || ' ' || f.location || ' ' || f.address || ' ' || f.city),
        plainto_tsquery('french', search_query)
      ),
      
      -- Recherche floue avec pg_trgm
      calculate_search_similarity(
        LOWER(search_query),
        LOWER(f.name || ' ' || f.location || ' ' || f.address || ' ' || f.city)
      )
    ) as relevance_score
  FROM public.fields f
  WHERE f.is_active = true
    AND (
      -- Correspondance exacte
      (f.name || ' ' || f.location || ' ' || f.address || ' ' || f.city) ILIKE '%' || search_query || '%'
      
      -- Correspondance full-text
      OR to_tsvector('french', f.name || ' ' || f.location || ' ' || f.address || ' ' || f.city) 
         @@ plainto_tsquery('french', search_query)
      
      -- Correspondance floue
      OR calculate_search_similarity(
           LOWER(search_query),
           LOWER(f.name || ' ' || f.location || ' ' || f.address || ' ' || f.city)
         ) >= similarity_threshold
    )
  ORDER BY relevance_score DESC, f.rating DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;
