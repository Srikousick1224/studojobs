/**
 * PHASE 1 SAMPLE DATA — every company, job and person here is fictional.
 * Components only talk to the functions at the bottom of this file.
 * In Phase 2 we replace the internals with Supabase queries; no component changes.
 */
import type { Application, Company, Job, Resource } from "./types";

export const companies: Company[] = [
  {
    slug: "brightpath-analytics",
    name: "Brightpath Analytics",
    industry: "Data & AI",
    size: "51–200",
    location: "Chennai",
    about: "We help retailers turn messy sales data into clear decisions. Small teams, real ownership, and a mentoring culture for first-time analysts.",
    verified: true,
    hue: 262,
  },
  {
    slug: "kiln-studio",
    name: "Kiln Studio",
    industry: "Design & Product",
    size: "11–50",
    location: "Bengaluru",
    about: "A product design studio building apps for early-stage startups. Interns ship real work in their first month.",
    verified: true,
    hue: 160,
  },
  {
    slug: "paperplane-health",
    name: "Paperplane Health",
    industry: "Health Tech",
    size: "11–50",
    location: "Hyderabad",
    about: "Making clinic software simple. We hire curious beginners and pair them with senior engineers.",
    verified: true,
    hue: 20,
  },
  {
    slug: "orbit-robotics",
    name: "Orbit Robotics",
    industry: "Robotics",
    size: "201–500",
    location: "Pune",
    about: "Warehouse robots and the software that runs them. Structured graduate programme every July.",
    verified: true,
    hue: 210,
  },
  {
    slug: "saffron-commerce",
    name: "Saffron Commerce",
    industry: "E-commerce",
    size: "51–200",
    location: "Mumbai",
    about: "A marketplace for independent food makers. Marketing, growth and engineering roles for freshers.",
    verified: true,
    hue: 35,
  },
  {
    slug: "tidal-finance",
    name: "Tidal Finance",
    industry: "Fintech",
    size: "1–10",
    location: "Remote",
    about: "A very young fintech team. Verification of this company is still pending review.",
    verified: false,
    hue: 190,
  },
];

export const jobs: Job[] = [
  {
    id: "j-101",
    companySlug: "brightpath-analytics",
    title: "Data Analyst Intern",
    type: "internship",
    workMode: "hybrid",
    employment: "full-time",
    level: "internship",
    location: "Chennai",
    isPaid: true,
    stipend: { min: 15000, max: 20000, period: "month" },
    skills: ["SQL", "Python", "Excel", "Power BI"],
    postedDaysAgo: 1,
    deadlineInDays: 14,
    summary: "Work with our analytics team on real retail datasets. You will clean data, build dashboards and present findings to clients.",
    responsibilities: [
      "Clean and prepare datasets using SQL and Python",
      "Build weekly dashboards for retail clients",
      "Summarise insights for non-technical audiences",
      "Shadow senior analysts in client calls",
    ],
    requirements: [
      "Pursuing a degree in data science, statistics, CS or similar",
      "Comfortable with SQL basics and one of Python or R",
      "Curiosity and clear written communication",
    ],
    perks: ["Mentor assigned from day one", "Certificate and recommendation letter", "Pre-placement offer for top performers"],
  },
  {
    id: "j-102",
    companySlug: "kiln-studio",
    title: "Junior Product Designer",
    type: "job",
    workMode: "onsite",
    employment: "full-time",
    level: "entry",
    location: "Bengaluru",
    isPaid: true,
    stipend: { min: 420000, max: 600000, period: "year" },
    skills: ["Figma", "UX Research", "Prototyping", "Design Systems"],
    postedDaysAgo: 3,
    deadlineInDays: 21,
    summary: "Design mobile and web products for startup clients alongside a lead designer. Portfolio required; degree is not.",
    responsibilities: [
      "Create flows, wireframes and high-fidelity screens",
      "Run quick usability tests with real users",
      "Contribute components to our shared design system",
    ],
    requirements: [
      "Portfolio with at least two case studies",
      "Working knowledge of Figma",
      "Good understanding of accessibility basics",
    ],
    perks: ["Learning budget", "Health insurance", "Flexible hours"],
  },
  {
    id: "j-103",
    companySlug: "paperplane-health",
    title: "Frontend Developer Intern (React)",
    type: "internship",
    workMode: "remote",
    employment: "part-time",
    level: "internship",
    location: "Remote (India)",
    isPaid: true,
    stipend: { min: 10000, max: 15000, period: "month" },
    skills: ["React", "TypeScript", "Tailwind CSS", "Git"],
    postedDaysAgo: 2,
    deadlineInDays: 10,
    summary: "Build clinic-facing screens with our frontend team. 20 hours a week, so it fits around college.",
    responsibilities: [
      "Build and test React components",
      "Fix bugs reported by clinic staff",
      "Join weekly code reviews",
    ],
    requirements: [
      "Solid HTML, CSS and JavaScript fundamentals",
      "A GitHub profile or small projects to show",
      "Available 20 hours per week",
    ],
    perks: ["Flexible schedule", "Code mentorship", "Certificate"],
  },
  {
    id: "j-104",
    companySlug: "orbit-robotics",
    title: "Graduate Software Engineer",
    type: "job",
    workMode: "onsite",
    employment: "full-time",
    level: "graduate",
    location: "Pune",
    isPaid: true,
    stipend: { min: 700000, max: 950000, period: "year" },
    skills: ["C++", "Python", "Data Structures", "Linux"],
    postedDaysAgo: 6,
    deadlineInDays: 30,
    summary: "A 12-month graduate programme with rotations across robot control, fleet software and tooling.",
    responsibilities: [
      "Rotate across three engineering teams",
      "Ship production code with a buddy engineer",
      "Present a capstone project to leadership",
    ],
    requirements: [
      "Degree in CS, ECE or related field (graduating 2026 or 2027)",
      "Strong fundamentals in data structures and algorithms",
      "Comfort working in Linux",
    ],
    perks: ["Relocation support", "Health insurance", "Structured mentorship"],
  },
  {
    id: "j-105",
    companySlug: "saffron-commerce",
    title: "Growth Marketing Intern",
    type: "internship",
    workMode: "hybrid",
    employment: "full-time",
    level: "internship",
    location: "Mumbai",
    isPaid: true,
    stipend: { min: 8000, max: 12000, period: "month" },
    skills: ["Content Writing", "SEO", "Social Media", "Analytics"],
    postedDaysAgo: 4,
    deadlineInDays: 12,
    summary: "Help us grow our maker community with campaigns, newsletters and SEO content.",
    responsibilities: [
      "Draft newsletters and social posts",
      "Research keywords and update product pages",
      "Report weekly campaign numbers",
    ],
    requirements: ["Strong written English", "Interest in food and small businesses", "Basic spreadsheet skills"],
    perks: ["Certificate", "Product discounts", "Possible full-time conversion"],
  },
  {
    id: "j-106",
    companySlug: "kiln-studio",
    title: "UI Design Intern",
    type: "internship",
    workMode: "remote",
    employment: "part-time",
    level: "internship",
    location: "Remote",
    isPaid: false,
    skills: ["Figma", "Visual Design", "Typography"],
    postedDaysAgo: 9,
    deadlineInDays: 20,
    summary: "A learning-focused unpaid internship. You will receive weekly design reviews, a certificate and a reference letter. There is no stipend.",
    responsibilities: ["Redesign small screens with feedback", "Present work in weekly reviews"],
    requirements: ["Basic Figma skills", "Eagerness to learn", "8 hours per week"],
    perks: ["Weekly mentoring", "Certificate", "Reference letter"],
  },
  {
    id: "j-107",
    companySlug: "brightpath-analytics",
    title: "Freelance Dashboard Developer",
    type: "freelance",
    workMode: "remote",
    employment: "contract",
    level: "junior",
    location: "Remote",
    isPaid: true,
    stipend: { min: 25000, max: 40000, period: "project" },
    skills: ["Power BI", "DAX", "SQL"],
    postedDaysAgo: 5,
    deadlineInDays: 15,
    summary: "A four-week contract to build a sales dashboard for one of our clients.",
    responsibilities: ["Model data in Power BI", "Deliver a documented dashboard in four weeks"],
    requirements: ["Two or more Power BI projects", "Good DAX knowledge", "Reliable communication"],
    perks: ["Fixed fee, paid in two instalments", "Repeat work possible"],
  },
  {
    id: "j-108",
    companySlug: "paperplane-health",
    title: "QA Engineer (Fresher)",
    type: "job",
    workMode: "hybrid",
    employment: "full-time",
    level: "entry",
    location: "Hyderabad",
    isPaid: true,
    stipend: { min: 360000, max: 480000, period: "year" },
    skills: ["Manual Testing", "Cypress", "JavaScript", "API Testing"],
    postedDaysAgo: 8,
    deadlineInDays: 18,
    summary: "Own quality for our clinic scheduling product. We will teach you automation if you bring attention to detail.",
    responsibilities: ["Write test plans", "Automate key flows with Cypress", "Triage bugs with developers"],
    requirements: ["Strong attention to detail", "Basic JavaScript", "Any degree"],
    perks: ["Health insurance", "Learning budget"],
  },
  {
    id: "j-109",
    companySlug: "orbit-robotics",
    title: "Machine Learning Intern",
    type: "internship",
    workMode: "onsite",
    employment: "full-time",
    level: "internship",
    location: "Pune",
    isPaid: true,
    stipend: { min: 25000, max: 30000, period: "month" },
    skills: ["Python", "PyTorch", "Computer Vision", "NumPy"],
    postedDaysAgo: 0,
    deadlineInDays: 25,
    summary: "Join our perception team to improve how robots detect and track objects in warehouses.",
    responsibilities: ["Train and evaluate vision models", "Analyse failure cases from real robots", "Document experiments"],
    requirements: ["Coursework or projects in ML", "Python proficiency", "Strong maths fundamentals"],
    perks: ["Access to real robot data", "Mentor from the research team", "Stipend plus lunch"],
  },
  {
    id: "j-110",
    companySlug: "tidal-finance",
    title: "Customer Support Associate",
    type: "job",
    workMode: "remote",
    employment: "part-time",
    level: "entry",
    location: "Remote",
    isPaid: true,
    stipend: { min: 12000, max: 16000, period: "month" },
    skills: ["Communication", "Customer Support"],
    postedDaysAgo: 2,
    deadlineInDays: 9,
    summary: "Answer customer queries by chat. This employer is not yet verified, so apply carefully and never pay any fee.",
    responsibilities: ["Reply to customer chats", "Escalate complex issues"],
    requirements: ["Clear written English", "Reliable internet"],
    perks: ["Remote work"],
  },
];

export const sampleApplications: Application[] = [
  { id: "a-1", jobId: "j-101", status: "interview", appliedDaysAgo: 5, note: "Interview scheduled — details sent by employer" },
  { id: "a-2", jobId: "j-103", status: "shortlisted", appliedDaysAgo: 8 },
  { id: "a-3", jobId: "j-105", status: "reviewing", appliedDaysAgo: 3 },
  { id: "a-4", jobId: "j-102", status: "applied", appliedDaysAgo: 1 },
  { id: "a-5", jobId: "j-108", status: "rejected", appliedDaysAgo: 14 },
];

export const resources: Resource[] = [
  { id: "r-1", title: "Write a one-page resume that gets read", category: "Resume", minutes: 8, summary: "Structure, wording and common mistakes for students with little experience." },
  { id: "r-2", title: "Turn class projects into resume bullets", category: "Resume", minutes: 6, summary: "A simple formula for describing what you built and what changed." },
  { id: "r-3", title: "Answering “Tell me about yourself”", category: "Interview", minutes: 7, summary: "A three-part answer you can adapt for any entry-level interview." },
  { id: "r-4", title: "Behavioural questions: the STAR method", category: "Interview", minutes: 10, summary: "Practise structured answers with example prompts." },
  { id: "r-5", title: "A 30-day SQL practice plan", category: "Skills", minutes: 12, summary: "Daily exercises from SELECT to window functions." },
  { id: "r-6", title: "Choosing between internships and projects", category: "Career", minutes: 9, summary: "How to decide where your next few months are best spent." },
];

export const skillSuggestions = ["SQL", "Python", "React", "Figma", "Excel", "TypeScript", "Power BI", "SEO"];

/* ---------- repository functions (swap internals in Phase 2) ---------- */

export function getCompany(slug: string) {
  return companies.find((c) => c.slug === slug);
}

export function getJobs() {
  return jobs;
}

export function getJob(id: string) {
  return jobs.find((j) => j.id === id);
}

export function getJobsByCompany(slug: string) {
  return jobs.filter((j) => j.companySlug === slug);
}

export function getSimilarJobs(job: Job, limit = 3) {
  return jobs
    .filter((j) => j.id !== job.id)
    .map((j) => ({
      j,
      score:
        (j.type === job.type ? 2 : 0) +
        j.skills.filter((s) => job.skills.includes(s)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.j);
}
