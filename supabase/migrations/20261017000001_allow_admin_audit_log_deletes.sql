DO $$
DECLARE
  audit_trigger RECORD;
BEGIN
  FOR audit_trigger IN
    SELECT trigger_row.tgname
    FROM pg_trigger AS trigger_row
    JOIN pg_proc AS trigger_function
      ON trigger_function.oid = trigger_row.tgfoid
    WHERE trigger_row.tgrelid = 'public.admin_audit_log'::regclass
      AND NOT trigger_row.tgisinternal
      AND position(
        'Admin audit log entries are immutable'
        IN trigger_function.prosrc
      ) > 0
  LOOP
    EXECUTE format(
      'DROP TRIGGER %I ON public.admin_audit_log',
      audit_trigger.tgname
    );
  END LOOP;
END
$$;

CREATE OR REPLACE FUNCTION public.prevent_admin_audit_log_updates()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Admin audit log entries are immutable';
END
$$;

CREATE TRIGGER admin_audit_log_prevent_updates
BEFORE UPDATE ON public.admin_audit_log
FOR EACH ROW
EXECUTE FUNCTION public.prevent_admin_audit_log_updates();
