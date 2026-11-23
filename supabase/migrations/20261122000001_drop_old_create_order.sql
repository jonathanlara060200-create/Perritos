-- La versión de create_order de 11 parámetros (antes de los colores de letras y zonas) nunca se borró:
-- seguía llamable y se saltaba la validación de colores. La app solo usa la de 13 parámetros.
drop function if exists public.create_order(uuid, uuid, text, text, text, jsonb, text, text, text, text, text);
