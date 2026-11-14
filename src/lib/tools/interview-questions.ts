export type QuestionKind = "Introduction" | "Behavioural" | "Motivation" | "Teamwork" | "Technical thinking";

export interface PracticeQuestion {
  id: string;
  kind: QuestionKind;
  question: string;
  tip: string;
}

/** Practice prompts for entry-level interviews. Static learning content, not user data. */
export const practiceQuestions: PracticeQuestion[] = [
  { id: "q1", kind: "Introduction", question: "Tell me about yourself.", tip: "Use three parts: who you are now, one relevant project or skill, and why this role." },
  { id: "q2", kind: "Motivation", question: "Why do you want this internship?", tip: "Name one thing about the role and one thing you want to learn. Avoid generic praise." },
  { id: "q3", kind: "Behavioural", question: "Describe a time you learned something quickly.", tip: "STAR: Situation, Task, Action, Result. Spend most time on the action." },
  { id: "q4", kind: "Teamwork", question: "Tell me about a group project that did not go smoothly.", tip: "Own your part, say what you changed, and end with what the team achieved." },
  { id: "q5", kind: "Behavioural", question: "Tell me about a mistake you made and what you did next.", tip: "Pick a real, small mistake. The fix and the lesson matter more than the mistake." },
  { id: "q6", kind: "Technical thinking", question: "How would you explain your favourite project to a non-technical person?", tip: "Start with the problem, then what you built, then who it helps. No jargon." },
  { id: "q7", kind: "Motivation", question: "Where do you want to be in two years?", tip: "Focus on skills you want to build, not job titles. Link it to this company." },
  { id: "q8", kind: "Teamwork", question: "How do you handle feedback you disagree with?", tip: "Show you listen first, ask questions, then decide with evidence." },
  { id: "q9", kind: "Technical thinking", question: "You are stuck on a problem for two hours. What do you do?", tip: "Describe a method: re-read the problem, simplify, search, then ask with what you tried." },
  { id: "q10", kind: "Introduction", question: "What are your strengths and one thing you are improving?", tip: "Give a real example for the strength and a concrete step for the improvement." },
];

export function pickQuestion(currentId: string | null, kind: QuestionKind | "All", random: () => number = Math.random): PracticeQuestion {
  const pool = practiceQuestions.filter((q) => (kind === "All" || q.kind === kind) && q.id !== currentId);
  const list = pool.length > 0 ? pool : practiceQuestions;
  return list[Math.floor(random() * list.length) % list.length];
}
