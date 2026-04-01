-- Add temperature_unit preference to profiles
ALTER TABLE public.profiles
ADD COLUMN temperature_unit TEXT DEFAULT 'fahrenheit'
  CHECK (temperature_unit IN ('fahrenheit', 'celsius'));
