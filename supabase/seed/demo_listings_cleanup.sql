-- Removes ONLY the demo companies, their jobs and their placeholder users.
delete from public.jobs where company_id in (select id from public.companies where slug like 'demo-%');
delete from public.companies where slug like 'demo-%';
delete from auth.users where email like '%@demo.studojob.invalid';
