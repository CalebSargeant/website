import { z } from "zod";

// Résumé / profile contract — the product's single source of truth.
// JSON Resume-aligned (https://jsonresume.org/schema). Mirrors the Pydantic
// models in packages/schemas/python/src/app_schemas/resume.py field-for-field.

export const Location = z.object({
  city: z.string().optional(),
  region: z.string().optional(),
  countryCode: z.string().optional(),
});
export type Location = z.infer<typeof Location>;

export const ProfileLink = z.object({
  network: z.string(),
  username: z.string().optional(),
  url: z.string().url(),
});
export type ProfileLink = z.infer<typeof ProfileLink>;

export const Basics = z.object({
  name: z.string(),
  label: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  url: z.string().url().optional(),
  summary: z.string().optional(),
  location: Location.optional(),
  profiles: z.array(ProfileLink).default([]),
});
export type Basics = z.infer<typeof Basics>;

export const Work = z.object({
  name: z.string(),
  position: z.string(),
  url: z.string().url().optional(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  summary: z.string().optional(),
  highlights: z.array(z.string()).default([]),
  tech: z.array(z.string()).default([]),
});
export type Work = z.infer<typeof Work>;

export const Education = z.object({
  institution: z.string(),
  area: z.string().optional(),
  studyType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  score: z.string().optional(),
  courses: z.array(z.string()).default([]),
});
export type Education = z.infer<typeof Education>;

export const Skill = z.object({
  name: z.string(),
  level: z.string().optional(),
  keywords: z.array(z.string()).default([]),
});
export type Skill = z.infer<typeof Skill>;

export const Project = z.object({
  name: z.string(),
  description: z.string().optional(),
  url: z.string().url().optional(),
  highlights: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
});
export type Project = z.infer<typeof Project>;

export const Certificate = z.object({
  name: z.string(),
  date: z.string().optional(),
  issuer: z.string().optional(),
  url: z.string().url().optional(),
});
export type Certificate = z.infer<typeof Certificate>;

export const Resume = z.object({
  basics: Basics,
  work: z.array(Work).default([]),
  education: z.array(Education).default([]),
  skills: z.array(Skill).default([]),
  projects: z.array(Project).default([]),
  certificates: z.array(Certificate).default([]),
  meta: z
    .object({ lastUpdated: z.string().optional(), version: z.string().optional() })
    .optional(),
});
export type Resume = z.infer<typeof Resume>;

// Public-facing alias for the résumé document.
export const Profile = Resume;
export type Profile = Resume;
