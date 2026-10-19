CREATE INDEX IF NOT EXISTS admin_audit_log_created_at_idx
  ON public.admin_audit_log (created_at);

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

DO $$
DECLARE
  existing_job RECORD;
BEGIN
  FOR existing_job IN
    SELECT jobid
    FROM cron.job
    WHERE jobname = 'cleanup-admin-audit-log'
  LOOP
    PERFORM cron.unschedule(existing_job.jobid);
  END LOOP;

  PERFORM cron.schedule(
    'cleanup-admin-audit-log',
    '0 3 * * *',
    $command$
      DELETE FROM public.admin_audit_log
      WHERE created_at < now() - interval '3 months'
    $command$
  );
END
$$;
