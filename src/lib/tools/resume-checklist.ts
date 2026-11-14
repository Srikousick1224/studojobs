export interface ChecklistItem {
  id: string;
  group: "Basics" | "Content" | "Polish";
  label: string;
  hint: string;
}

/** A beginner resume checklist. Progress is stored only in the visitor's own browser. */
export const resumeChecklist: ChecklistItem[] = [
  { id: "one-page", group: "Basics", label: "One page, saved as PDF", hint: "Recruiters open PDFs the same way on every device." },
  { id: "contact", group: "Basics", label: "Name, email, phone and a link (GitHub or LinkedIn)", hint: "Use a professional email address." },
  { id: "education", group: "Basics", label: "Education with course, college and year", hint: "Add CGPA only if it helps you." },
  { id: "skills", group: "Content", label: "Skills grouped by type (languages, tools, concepts)", hint: "List only skills you can talk about in an interview." },
  { id: "projects", group: "Content", label: "2 to 3 projects with what you built and the result", hint: "Start each bullet with an action verb." },
  { id: "numbers", group: "Content", label: "At least two bullets with a number", hint: "Users, accuracy, time saved, rows processed." },
  { id: "links", group: "Content", label: "Every project has a working link", hint: "Click each link before you send." },
  { id: "tailored", group: "Polish", label: "Skills reordered to match the job post", hint: "Put the most relevant skill first." },
  { id: "spelling", group: "Polish", label: "Spelling and tense checked", hint: "Past tense for finished work, present tense for current work." },
  { id: "filename", group: "Polish", label: "File named like Firstname_Lastname_Resume.pdf", hint: "Avoid names like final_final2.pdf." },
];

export function checklistProgress(done: ReadonlySet<string>): { done: number; total: number; percent: number } {
  const valid = resumeChecklist.filter((i) => done.has(i.id)).length;
  const total = resumeChecklist.length;
  return { done: valid, total, percent: Math.round((valid / total) * 100) };
}
