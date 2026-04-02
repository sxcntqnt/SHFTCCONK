-- Skene Growth: allowlisted triggers insert into event_log (Shadow Mirror)
-- Generated at 2026-03-31T18:29:37.683436
-- Depends on: 20260201000000_skene_growth_schema.sql (run skene init first)

-- Trigger functions
CREATE OR REPLACE FUNCTION skene_growth_fn_per_event_escrow_records_UPDATE_compliance_ledger_gate_monetisation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, skene_growth
AS $$
BEGIN

BEGIN
  INSERT INTO skene_growth.event_log (entity_id, event_type, metadata)
  VALUES (NEW."id"::uuid, 'per_event_escrow_records.update', jsonb_build_object('id', NEW."id", 'org_id', NEW."org_id", 'booking_id', NEW."booking_id", 'agreed_fare', NEW."agreed_fare", 'escrow_fee_kes', NEW."escrow_fee_kes", 'completed_at', NEW."completed_at", 'mpesa_receipt_number', NEW."mpesa_receipt_number"));
EXCEPTION WHEN invalid_text_representation OR OTHERS THEN
  INSERT INTO skene_growth.event_log (entity_id, event_type, metadata)
  VALUES (NULL, 'per_event_escrow_records.update', jsonb_build_object('id', NEW."id", 'org_id', NEW."org_id", 'booking_id', NEW."booking_id", 'agreed_fare', NEW."agreed_fare", 'escrow_fee_kes', NEW."escrow_fee_kes", 'completed_at', NEW."completed_at", 'mpesa_receipt_number', NEW."mpesa_receipt_number"));
END;
RETURN NULL;

$$;

CREATE OR REPLACE FUNCTION skene_growth_fn_trip_events_INSERT_gps_broadcast_ledger_depth_flywheel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, skene_growth
AS $$
BEGIN

BEGIN
  INSERT INTO skene_growth.event_log (entity_id, event_type, metadata)
  VALUES (NEW."id"::uuid, 'trip_events.insert', jsonb_build_object('id', NEW."id", 'vehicle_id', NEW."vehicle_id", 'operator_id', NEW."operator_id", 'latitude', NEW."latitude", 'longitude', NEW."longitude", 'accuracy', NEW."accuracy", 'accuracy_flag', NEW."accuracy_flag", 'route_corridor', NEW."route_corridor", 'created_at', NEW."created_at"));
EXCEPTION WHEN invalid_text_representation OR OTHERS THEN
  INSERT INTO skene_growth.event_log (entity_id, event_type, metadata)
  VALUES (NULL, 'trip_events.insert', jsonb_build_object('id', NEW."id", 'vehicle_id', NEW."vehicle_id", 'operator_id', NEW."operator_id", 'latitude', NEW."latitude", 'longitude', NEW."longitude", 'accuracy', NEW."accuracy", 'accuracy_flag', NEW."accuracy_flag", 'route_corridor', NEW."route_corridor", 'created_at', NEW."created_at"));
END;
RETURN NULL;

$$;

-- Triggers

DROP TRIGGER IF EXISTS skene_growth_trg_per_event_escrow_records_UPDATE_compliance_ledger_gate_monetisation ON public.per_event_escrow_records;
CREATE TRIGGER skene_growth_trg_per_event_escrow_records_UPDATE_compliance_ledger_gate_monetisation
  AFTER UPDATE ON public.per_event_escrow_records
  FOR EACH ROW
  EXECUTE FUNCTION skene_growth_fn_per_event_escrow_records_UPDATE_compliance_ledger_gate_monetisation();


DROP TRIGGER IF EXISTS skene_growth_trg_trip_events_INSERT_gps_broadcast_ledger_depth_flywheel ON public.trip_events;
CREATE TRIGGER skene_growth_trg_trip_events_INSERT_gps_broadcast_ledger_depth_flywheel
  AFTER INSERT ON public.trip_events
  FOR EACH ROW
  EXECUTE FUNCTION skene_growth_fn_trip_events_INSERT_gps_broadcast_ledger_depth_flywheel();