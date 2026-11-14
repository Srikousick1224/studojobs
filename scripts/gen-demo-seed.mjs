// Generates supabase/seed/demo_listings.sql  ->  node scripts/gen-demo-seed.mjs
// DEMO DATA ONLY: fictional companies/jobs for local or staging testing. Never run on production users' data.
import fs from "node:fs";

const co = [
  ["demo-brightpath-analytics", "Brightpath Analytics", "Data & AI", "51-200", "Chennai", "https://brightpath.example"],
  ["demo-kiln-studio", "Kiln Studio", "Design & Product", "11-50", "Bengaluru", "https://kiln.example"],
  ["demo-paperplane-health", "Paperplane Health", "Health Tech", "11-50", "Hyderabad", "https://paperplane.example"],
  ["demo-orbit-robotics", "Orbit Robotics", "Robotics", "201-500", "Pune", "https://orbit.example"],
  ["demo-saffron-commerce", "Saffron Commerce", "E-commerce", "51-200", "Mumbai", "https://saffron.example"],
  ["demo-nimbus-cloud", "Nimbus Cloud", "Cloud & DevOps", "201-500", "Bengaluru", "https://nimbus.example"],
  ["demo-lotus-learning", "Lotus Learning", "EdTech", "51-200", "Coimbatore", "https://lotus.example"],
  ["demo-greenleaf-energy", "Greenleaf Energy", "Renewable Energy", "501-1000", "Ahmedabad", "https://greenleaf.example"],
  ["demo-quill-media", "Quill Media", "Media & Content", "11-50", "Delhi", "https://quill.example"],
  ["demo-ledgerly", "Ledgerly", "Fintech", "51-200", "Gurugram", "https://ledgerly.example"],
  ["demo-pixelforge-games", "Pixelforge Games", "Gaming", "11-50", "Kochi", "https://pixelforge.example"],
  ["demo-cedar-consulting", "Cedar Consulting", "Consulting", "201-500", "Mumbai", "https://cedar.example"],
  ["demo-vaidya-labs", "Vaidya Labs", "Life Sciences", "51-200", "Hyderabad", "https://vaidya.example"],
  ["demo-trailhead-travel", "Trailhead Travel", "Travel & Hospitality", "11-50", "Remote", "https://trailhead.example"],
];

// [company, title, type, mode, employment, level, location, min, max, period (null = unpaid), category, skills, summary]
const J = [
  ["brightpath-analytics", "Data Analyst Intern", "internship", "hybrid", "full_time", "internship", "Chennai", 15000, 20000, "month", "data-ai", ["SQL", "Python", "Excel", "Power BI"], "Work with our analytics team on real retail datasets. You will clean data, build dashboards and present findings to clients."],
  ["brightpath-analytics", "Machine Learning Intern", "internship", "remote", "part_time", "internship", "Remote (India)", 18000, 25000, "month", "data-ai", ["Python", "Machine Learning", "Pandas", "NumPy"], "Help build demand-forecasting models for retail clients under the guidance of a senior data scientist."],
  ["brightpath-analytics", "Junior Data Scientist", "job", "onsite", "full_time", "entry", "Chennai", 600000, 900000, "year", "data-ai", ["Python", "Statistics", "SQL", "Machine Learning"], "Join our data science team to design experiments, build models and explain results to non-technical clients."],
  ["kiln-studio", "Junior Product Designer", "job", "onsite", "full_time", "entry", "Bengaluru", 420000, 600000, "year", "design", ["Figma", "UX Research", "Prototyping"], "Design mobile and web products for startup clients alongside a lead designer. Portfolio required; degree is not."],
  ["kiln-studio", "UI Design Intern", "internship", "hybrid", "full_time", "internship", "Bengaluru", 12000, 18000, "month", "design", ["Figma", "Prototyping"], "Create screens and design-system components for live client projects and get weekly portfolio reviews."],
  ["kiln-studio", "UX Research Intern", "internship", "remote", "part_time", "internship", "Remote (India)", 8000, 12000, "month", "design", ["UX Research", "Communication"], "Plan and run quick user interviews and usability tests, then turn findings into clear recommendations."],
  ["paperplane-health", "Frontend Developer Intern (React)", "internship", "remote", "part_time", "internship", "Remote (India)", 10000, 15000, "month", "software-engineering", ["React", "TypeScript", "Tailwind CSS", "Git"], "Build clinic-facing screens with our frontend team. 20 hours a week, so it fits around college."],
  ["paperplane-health", "Backend Developer (Node.js)", "job", "hybrid", "full_time", "junior", "Hyderabad", 550000, 850000, "year", "software-engineering", ["Node.js", "SQL", "Git", "API Testing"], "Build and maintain APIs for our clinic management software with strong mentoring from senior engineers."],
  ["paperplane-health", "QA Intern", "internship", "onsite", "full_time", "internship", "Hyderabad", 8000, 12000, "month", "software-engineering", ["Manual Testing", "API Testing"], "Write test cases, find bugs before clinics do and learn test automation from our QA lead."],
  ["orbit-robotics", "Graduate Software Engineer", "job", "onsite", "full_time", "graduate", "Pune", 700000, 950000, "year", "software-engineering", ["C++", "Python", "Data Structures", "Linux"], "A 12-month graduate programme with rotations across robot control, fleet software and tooling."],
  ["orbit-robotics", "Computer Vision Intern", "internship", "onsite", "full_time", "internship", "Pune", 20000, 28000, "month", "data-ai", ["Python", "Computer Vision", "Deep Learning", "PyTorch"], "Improve object detection for warehouse robots using real camera data and measurable accuracy goals."],
  ["orbit-robotics", "Mechanical Design Trainee", "job", "onsite", "full_time", "graduate", "Pune", 400000, 550000, "year", "engineering-other", ["Communication"], "Support the mechanical design team with CAD models, drawings and prototype testing."],
  ["saffron-commerce", "Digital Marketing Intern", "internship", "hybrid", "part_time", "internship", "Mumbai", 8000, 12000, "month", "marketing-growth", ["SEO", "Social Media", "Content Writing"], "Run campaigns for independent food makers, track results and learn growth marketing hands-on."],
  ["saffron-commerce", "Growth Associate", "job", "onsite", "full_time", "entry", "Mumbai", 380000, 520000, "year", "marketing-growth", ["Excel", "SEO", "Communication"], "Own acquisition experiments from idea to result, working with product and design teams."],
  ["saffron-commerce", "Full Stack Developer Intern", "internship", "remote", "full_time", "internship", "Remote (India)", 15000, 22000, "month", "software-engineering", ["JavaScript", "React", "Node.js", "SQL"], "Ship real features on our marketplace, from database to user interface, with a dedicated mentor."],
  ["saffron-commerce", "Sales Development Representative", "job", "hybrid", "full_time", "entry", "Mumbai", 300000, 450000, "year", "sales-business", ["Communication"], "Reach out to food makers, explain our marketplace and help them get their first orders."],
  ["nimbus-cloud", "Cloud Engineer Intern", "internship", "hybrid", "full_time", "internship", "Bengaluru", 18000, 26000, "month", "software-engineering", ["Linux", "Python", "Git"], "Learn infrastructure as code and monitoring while supporting our platform team on real deployments."],
  ["nimbus-cloud", "DevOps Engineer (Fresher)", "job", "onsite", "full_time", "entry", "Bengaluru", 600000, 900000, "year", "software-engineering", ["Linux", "Git", "Python"], "Help automate builds and deployments, and keep services reliable as part of a friendly platform team."],
  ["nimbus-cloud", "Technical Writer Intern", "internship", "remote", "part_time", "internship", "Remote (India)", 8000, 12000, "month", "content-writing", ["Content Writing", "Communication"], "Write clear developer documentation and tutorials, and review them with working engineers."],
  ["lotus-learning", "Content Creator Intern", "internship", "remote", "part_time", "internship", "Remote (India)", 6000, 10000, "month", "content-writing", ["Content Writing", "Social Media"], "Create short lessons, social posts and study guides that help school students learn."],
  ["lotus-learning", "Associate Instructional Designer", "job", "hybrid", "full_time", "entry", "Coimbatore", 320000, 450000, "year", "education-research", ["Communication", "Content Writing"], "Design engaging online courses with subject experts and test them with real learners."],
  ["lotus-learning", "Frontend Developer (Fresher)", "job", "remote", "full_time", "entry", "Remote (India)", 400000, 650000, "year", "software-engineering", ["React", "JavaScript", "CSS", "HTML"], "Build learning experiences used by thousands of students every day, with code reviews from day one."],
  ["lotus-learning", "Student Success Intern (Unpaid)", "internship", "remote", "part_time", "internship", "Remote (India)", null, null, null, "customer-support", ["Communication"], "Unpaid, 10 hours per week, college credit letter provided. Help learners with onboarding questions and collect feedback."],
  ["greenleaf-energy", "Graduate Engineer Trainee", "job", "onsite", "full_time", "graduate", "Ahmedabad", 450000, 600000, "year", "engineering-other", ["Excel", "Communication"], "A structured trainee programme across solar plant design, operations and project delivery."],
  ["greenleaf-energy", "Energy Data Analyst Intern", "internship", "hybrid", "full_time", "internship", "Ahmedabad", 12000, 18000, "month", "data-ai", ["Excel", "Python", "SQL", "Power BI"], "Analyse solar output data to find underperforming panels and report savings to plant managers."],
  ["greenleaf-energy", "Sustainability Research Intern", "internship", "remote", "part_time", "internship", "Remote (India)", 7000, 10000, "month", "education-research", ["Content Writing", "Excel"], "Research carbon-reduction policies and prepare short briefs for our sustainability team."],
  ["quill-media", "Video Editor Intern", "internship", "onsite", "full_time", "internship", "Delhi", 8000, 12000, "month", "content-writing", ["Social Media", "Communication"], "Edit short videos for our news and explainer channels and learn storytelling from senior editors."],
  ["quill-media", "Junior Content Writer", "job", "remote", "full_time", "entry", "Remote (India)", 280000, 400000, "year", "content-writing", ["Content Writing", "SEO"], "Write well-researched articles on technology and careers, with an editor reviewing every piece."],
  ["quill-media", "Social Media Intern", "internship", "hybrid", "part_time", "internship", "Delhi", 6000, 9000, "month", "marketing-growth", ["Social Media", "Content Writing"], "Plan and publish daily posts, track engagement and suggest new formats to grow our audience."],
  ["ledgerly", "Associate Business Analyst", "job", "hybrid", "full_time", "entry", "Gurugram", 500000, 750000, "year", "product-management", ["SQL", "Excel", "Communication"], "Turn customer problems into clear requirements and track the impact of every release."],
  ["ledgerly", "Finance Operations Intern", "internship", "onsite", "full_time", "internship", "Gurugram", 12000, 16000, "month", "finance-accounting", ["Excel", "Communication"], "Support reconciliations, invoicing checks and monthly reporting for our finance team."],
  ["ledgerly", "Backend Engineer (Java) - Graduate", "job", "onsite", "full_time", "graduate", "Gurugram", 800000, 1200000, "year", "software-engineering", ["Java", "SQL", "Data Structures", "Git"], "Build secure payment services with senior engineers and learn how production fintech systems run."],
  ["ledgerly", "Product Management Intern", "internship", "hybrid", "full_time", "internship", "Gurugram", 15000, 20000, "month", "product-management", ["Communication", "Excel", "UX Research"], "Work with a product manager on research, specs and launch plans for new features."],
  ["pixelforge-games", "Game Developer Intern", "internship", "onsite", "full_time", "internship", "Kochi", 10000, 15000, "month", "software-engineering", ["C++", "Data Structures", "Git"], "Build gameplay features for our mobile titles and see them in the hands of players."],
  ["pixelforge-games", "2D Artist (Freelance)", "freelance", "remote", "contract", "entry", "Remote", 20000, 60000, "project", "design", ["Figma", "Communication"], "Create character and environment art for a mobile game level pack. Portfolio required."],
  ["pixelforge-games", "QA Tester (Games)", "job", "onsite", "full_time", "entry", "Kochi", 250000, 350000, "year", "software-engineering", ["Manual Testing", "Communication"], "Play, break and report issues in upcoming games, and help our team ship polished releases."],
  ["cedar-consulting", "Business Analyst Trainee", "job", "onsite", "full_time", "graduate", "Mumbai", 650000, 900000, "year", "product-management", ["Excel", "Communication", "SQL"], "Join client teams, analyse problems and present recommendations. Structured training for the first three months."],
  ["cedar-consulting", "Research Analyst Intern", "internship", "hybrid", "full_time", "internship", "Mumbai", 15000, 20000, "month", "education-research", ["Excel", "Content Writing", "Statistics"], "Gather and analyse industry data, then help prepare slides for partner meetings."],
  ["cedar-consulting", "HR Coordinator Intern", "internship", "onsite", "part_time", "internship", "Mumbai", 8000, 12000, "month", "human-resources", ["Communication"], "Support campus hiring, interview scheduling and onboarding for new joiners."],
  ["vaidya-labs", "Bioinformatics Intern", "internship", "hybrid", "full_time", "internship", "Hyderabad", 12000, 18000, "month", "healthcare", ["Python", "Statistics", "Pandas"], "Analyse lab datasets with our scientists and learn how data drives drug research."],
  ["vaidya-labs", "Lab Operations Associate", "job", "onsite", "full_time", "entry", "Hyderabad", 300000, 420000, "year", "operations", ["Excel", "Communication"], "Keep lab inventory, schedules and records accurate so scientists can focus on research."],
  ["trailhead-travel", "Travel Content Writer (Freelance)", "freelance", "remote", "contract", "entry", "Remote", 3000, 8000, "project", "content-writing", ["Content Writing", "SEO"], "Write destination guides of 1,000 words each. Paid per article, flexible deadlines."],
  ["trailhead-travel", "Customer Experience Associate", "job", "remote", "full_time", "entry", "Remote", 260000, 380000, "year", "customer-support", ["Communication", "Customer Support"], "Help travellers plan trips by chat and email, and make sure every booking goes smoothly."],
  ["trailhead-travel", "Web Developer Intern (Unpaid)", "internship", "remote", "part_time", "internship", "Remote", null, null, null, "software-engineering", ["HTML", "CSS", "JavaScript"], "Unpaid learning internship, 8 hours per week, with a certificate and a recommendation letter. Improve our booking pages."],
  ["brightpath-analytics", "BI Developer (Fresher)", "job", "hybrid", "full_time", "entry", "Chennai", 450000, 700000, "year", "data-ai", ["Power BI", "SQL", "Excel"], "Build and maintain dashboards used by retail clients every day, with training on data modelling from senior analysts."],
  ["nimbus-cloud", "Site Reliability Engineer (Graduate)", "job", "onsite", "full_time", "graduate", "Bengaluru", 900000, 1300000, "year", "software-engineering", ["Linux", "Python", "Git", "Data Structures"], "Keep our platform fast and reliable, learn incident response, and automate away repetitive work."],
  ["nimbus-cloud", "Cloud Support Associate", "job", "remote", "full_time", "entry", "Remote (India)", 350000, 500000, "year", "customer-support", ["Linux", "Communication", "Customer Support"], "Help customers solve cloud issues over chat and calls, with a clear path into engineering roles."],
  ["lotus-learning", "Mobile App Developer (Fresher)", "job", "hybrid", "full_time", "entry", "Coimbatore", 400000, 650000, "year", "software-engineering", ["JavaScript", "React", "Git"], "Build features for our learning app used by thousands of students, with weekly code reviews."],
  ["ledgerly", "Data Analyst (Entry-level)", "job", "hybrid", "full_time", "entry", "Gurugram", 500000, 800000, "year", "data-ai", ["SQL", "Python", "Excel", "Statistics"], "Analyse payments data to find trends and fraud signals, and present findings to product and risk teams."],
  ["saffron-commerce", "Operations Executive", "job", "onsite", "full_time", "entry", "Mumbai", 280000, 380000, "year", "operations", ["Excel", "Communication"], "Coordinate orders between food makers and delivery partners and fix problems before customers notice."],
  ["greenleaf-energy", "Junior Electrical Engineer", "job", "onsite", "full_time", "graduate", "Ahmedabad", 420000, 580000, "year", "engineering-other", ["Excel", "Communication"], "Support the design and commissioning of rooftop solar systems alongside senior engineers."],
  ["vaidya-labs", "Clinical Data Associate", "job", "hybrid", "full_time", "entry", "Hyderabad", 330000, 480000, "year", "healthcare", ["Excel", "SQL", "Statistics"], "Check and clean clinical trial data so scientists can trust their results, with full training provided."],
  ["kiln-studio", "Motion Designer (Freelance)", "freelance", "remote", "contract", "entry", "Remote", 15000, 45000, "project", "design", ["Figma", "Prototyping"], "Create short product animations for client launches. Paid per project; portfolio with motion work required."],
  ["quill-media", "Podcast Editor (Freelance)", "freelance", "remote", "contract", "entry", "Remote", 4000, 9000, "project", "content-writing", ["Communication", "Social Media"], "Edit and polish weekly episodes of our careers podcast. Paid per episode with flexible deadlines."],
];

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const arr = (a) => `array[${a.map(q).join(",")}]::text[]`;
const respFor = (t) => t.type === "freelance"
  ? ["Deliver the agreed work on time", "Share drafts early and act on feedback", "Keep clear written communication"]
  : ["Work on real tasks with a mentor", "Share progress in weekly check-ins", "Document what you build or learn"];
const reqFor = (s) => [`Working knowledge of ${s.slice(0, 2).join(" and ")}`, "Willingness to learn and ask questions", "Clear communication"];
const perks = (j) => (j[2] === "internship" ? ["Certificate", "Mentor assigned", "Flexible hours"] : j[2] === "freelance" ? ["Flexible schedule", "Pay on delivery"] : ["Learning budget", "Health insurance", "Mentoring"]);

let sql = `-- DEMO LISTINGS (generated by scripts/gen-demo-seed.mjs). FICTIONAL companies and jobs.
-- Run in the Supabase SQL Editor ONLY on a local/staging project. Not for a real launch.
-- Demo employers have no password, so nobody can log in as them. Remove everything with demo_listings_cleanup.sql.
do $seed$
begin
  if exists (select 1 from public.companies where slug like 'demo-%') then
    raise notice 'Demo listings already present - nothing to do.';
    return;
  end if;
`;
for (const c of co) {
  sql += `
  insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
    values (gen_random_uuid(), 'authenticated', 'authenticated', ${q(c[0] + "@demo.studojob.invalid")}, ${q(JSON.stringify({ role: "employer", full_name: c[1] + " Recruiter" }))}::jsonb, now(), now());
  insert into public.companies (owner_id, name, slug, website, industry, size_range, location, about, verification_status, verified_at)
    select id, ${q(c[1])}, ${q(c[0])}, ${q(c[5])}, ${q(c[2])}, ${q(c[3])}, ${q(c[4])}, ${q("Demo company (fictional) used for testing StudoJob. " + c[2] + " team based in " + c[4] + ".")}, 'approved', now()
    from auth.users where email = ${q(c[0] + "@demo.studojob.invalid")};`;
}
const allSkills = [...new Set(J.flatMap((j) => j[11]))];
sql += `\n  insert into public.skills (name) values ${allSkills.map((s) => `(${q(s)})`).join(", ")} on conflict do nothing;\n`;
J.forEach((j, i) => {
  const [slug, title, type, mode, emp, level, loc, min, max, period, cat, skills, summary] = j;
  const days = 1 + ((i * 7) % 40);
  sql += `
  insert into public.jobs (company_id, category_id, created_by, title, summary, responsibilities, requirements, perks, type, work_mode, employment, level, location, is_paid, pay_min, pay_max, pay_period, status, application_deadline, created_at)
    select c.id, (select id from public.job_categories where slug = ${q(cat)}), c.owner_id, ${q(title)}, ${q(summary)}, ${arr(respFor({ type }))}, ${arr(reqFor(skills))}, ${arr(perks(j))},
      ${q(type)}::public.job_type, ${q(mode)}::public.work_mode, ${q(emp)}::public.employment_type, ${q(level)}::public.experience_level, ${q(loc)},
      ${period ? "true" : "false"}, ${min ?? "null"}, ${max ?? "null"}, ${period ? q(period) + "::public.pay_period" : "null"}, 'published', now() + interval '${14 + ((i * 5) % 40)} days', now() - interval '${days} days'
    from public.companies c where c.slug = ${q("demo-" + slug)};
  insert into public.job_skills (job_id, skill_id)
    select j.id, s.id from public.jobs j join public.companies c on c.id = j.company_id and c.slug = ${q("demo-" + slug)}
    join public.skills s on lower(s.name) = any(${arr(skills.map((s) => s.toLowerCase()))}) where j.title = ${q(title)};`;
});
sql += `\nend
$seed$;\n`;
fs.writeFileSync("supabase/seed/demo_listings.sql", sql);
fs.writeFileSync("supabase/seed/demo_listings_cleanup.sql", `-- Removes ONLY the demo companies, their jobs and their placeholder users.
delete from public.jobs where company_id in (select id from public.companies where slug like 'demo-%');
delete from public.companies where slug like 'demo-%';
delete from auth.users where email like '%@demo.studojob.invalid';
`);
console.log(`${co.length} companies, ${J.length} listings`);
