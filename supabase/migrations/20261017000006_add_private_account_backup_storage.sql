insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'account-backups',
  'account-backups',
  false,
  52428800,
  array['application/zip', 'application/x-zip-compressed']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can upload their own account backups"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'account-backups'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
