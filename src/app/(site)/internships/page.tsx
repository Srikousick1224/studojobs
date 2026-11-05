import { redirect } from "next/navigation";

/** Internships are a filter on the real job search, so this page sends visitors there. */
export default function InternshipsPage() {
  redirect("/jobs?type=internship");
}
