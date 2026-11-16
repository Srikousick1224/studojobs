import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max, `Please keep this under ${max} characters.`).optional().transform((v) => (v ? v : undefined));

export const profileInput = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(80, "Name is too long."),
  headline: optionalText(120),
  bio: optionalText(1500),
  college: z.string().trim().min(2, "Enter your college or university.").max(150, "College name is too long."),
  degree: optionalText(150),
  graduationYear: z.number().int().min(2000, "Check the graduation year.").max(2100, "Check the graduation year.").optional(),
  location: optionalText(100),
  skills: z
    .array(z.string().trim().min(1).max(40, "Each skill can be at most 40 characters."))
    .max(20, "You can add up to 20 skills.")
    .refine((l) => new Set(l.map((s) => s.toLowerCase())).size === l.length, "Remove duplicate skills."),
});
export type ProfileInput = z.input<typeof profileInput>;

export interface MyProfile {
  fullName: string;
  headline: string;
  bio: string;
  college: string;
  degree: string;
  graduationYear: number | null;
  location: string;
  skills: string[];
  suggestions: string[];
  resumes: { id: string; label: string; fileName: string; isDefault: boolean; sizeBytes: number; createdAt: string }[];
}
