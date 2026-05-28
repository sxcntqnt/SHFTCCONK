CREATE OR REPLACE FUNCTION setup_passenger_profile(
  p_intent      text,
  p_first_name  text,
  p_last_name   text,
  p_phone       text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles
    SET full_name  = p_first_name || ' ' || p_last_name,
        kyc_intent = p_intent,
        phone      = p_phone
    WHERE id = auth.uid();

  INSERT INTO actors (profile_id, type, status)
    VALUES (auth.uid(), 'PASSENGER', 'active')
    ON CONFLICT DO NOTHING;
END;
$$;