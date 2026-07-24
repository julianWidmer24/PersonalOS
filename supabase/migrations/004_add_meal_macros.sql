-- Add carbs and fat macro columns to meals so the classify function can
-- persist all four macros (calories, protein, carbs, fat) per logged meal.
ALTER TABLE meals
  ADD COLUMN IF NOT EXISTS carbs_grams numeric,
  ADD COLUMN IF NOT EXISTS fat_grams numeric;
