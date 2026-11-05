-- StudoJob migration 005: file storage buckets and their access rules.
--
-- Folder convention (the first folder name is the OWNER and is what the policies check):
--   resumes/<student-user-id>/<random>.pdf          private
--   verification-docs/<company-id>/<random>.pdf     private
--   company-logos/<company-id>/<random>.png         public (logos are meant to be seen)
--
-- Bucket size and file-type limits are enforced by the Supabase Storage API.
-- SVG is deliberately NOT allowed for logos because SVG files can carry scripts.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('resumes', 'resumes', false, 5242880,
     array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('verification-docs', 'verification-docs', false, 5242880,
     array['application/pdf', 'image/png', 'image/jpeg']),
  ('company-logos', 'company-logos', true, 2097152,
     array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- resumes: the student owns the folder; an employer may READ a file only through an application
create policy resumes_files_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and private.user_role() = 'student'
  );
create policy resumes_files_select on storage.objects for select to authenticated
  using (
    bucket_id = 'resumes'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or private.employer_can_read_resume_path(name))
  );
create policy resumes_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- verification documents: company owner uploads/reads; admins read
create policy verification_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'verification-docs' and private.owns_company_folder((storage.foldername(name))[1]));
create policy verification_files_select on storage.objects for select to authenticated
  using (
    bucket_id = 'verification-docs'
    and (private.owns_company_folder((storage.foldername(name))[1]) or private.is_admin())
  );

-- logos: anyone can view; only the company owner can add / replace / remove
create policy logos_select on storage.objects for select to anon, authenticated
  using (bucket_id = 'company-logos');
create policy logos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'company-logos' and private.owns_company_folder((storage.foldername(name))[1]));
create policy logos_update on storage.objects for update to authenticated
  using (bucket_id = 'company-logos' and private.owns_company_folder((storage.foldername(name))[1]));
create policy logos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'company-logos' and private.owns_company_folder((storage.foldername(name))[1]));
