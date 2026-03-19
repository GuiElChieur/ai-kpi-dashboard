ALTER TABLE public.cables
  ADD COLUMN IF NOT EXISTS cbl_racc_resp_o text,
  ADD COLUMN IF NOT EXISTS cbl_racc_resp_a text,
  ADD COLUMN IF NOT EXISTS cbl_raccorde_o text,
  ADD COLUMN IF NOT EXISTS cbl_raccorde_a text,
  ADD COLUMN IF NOT EXISTS stt_cbl_be text,
  ADD COLUMN IF NOT EXISTS local_apo text;