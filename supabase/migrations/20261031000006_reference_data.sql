-- StudoJob migration 006: REFERENCE DATA ONLY (category and skill names).
--
-- This is NOT sample content. There are no fake companies, jobs or people here:
-- a real database starts with zero listings until real, reviewed employers post them.

insert into public.job_categories (name, slug) values
  ('Software Engineering', 'software-engineering'),
  ('Data & AI', 'data-ai'),
  ('Design', 'design'),
  ('Product & Project Management', 'product-management'),
  ('Marketing & Growth', 'marketing-growth'),
  ('Sales & Business Development', 'sales-business'),
  ('Finance & Accounting', 'finance-accounting'),
  ('Human Resources', 'human-resources'),
  ('Operations', 'operations'),
  ('Customer Support', 'customer-support'),
  ('Content & Writing', 'content-writing'),
  ('Engineering (Non-software)', 'engineering-other'),
  ('Healthcare & Life Sciences', 'healthcare'),
  ('Education & Research', 'education-research')
on conflict (slug) do nothing;

insert into public.skills (name) values
  ('Python'), ('SQL'), ('JavaScript'), ('TypeScript'), ('React'), ('Node.js'), ('Java'), ('C++'),
  ('HTML'), ('CSS'), ('Tailwind CSS'), ('Git'), ('Linux'), ('Data Structures'), ('Machine Learning'),
  ('Deep Learning'), ('Computer Vision'), ('NumPy'), ('Pandas'), ('PyTorch'), ('Excel'), ('Power BI'),
  ('Statistics'), ('Figma'), ('UX Research'), ('Prototyping'), ('Content Writing'), ('SEO'),
  ('Social Media'), ('Communication'), ('Customer Support'), ('Manual Testing'), ('API Testing')
on conflict do nothing;
