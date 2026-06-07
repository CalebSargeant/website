// Lightweight résumé types — a structural subset of the shared contract, kept
// local so this app is fully standalone (no @platform/* or workspace deps).

export interface Location {
  city?: string;
  region?: string;
  countryCode?: string;
}
export interface ProfileLink {
  network: string;
  username?: string;
  url: string;
}
export interface Basics {
  name: string;
  label?: string;
  email?: string;
  phone?: string;
  url?: string;
  summary?: string;
  location?: Location;
  profiles?: ProfileLink[];
}
export interface Work {
  name: string;
  position: string;
  url?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
  highlights?: string[];
  tech?: string[];
}
export interface Education {
  institution: string;
  area?: string;
  studyType?: string;
  startDate?: string;
  endDate?: string;
}
export interface Skill {
  name: string;
  level?: string;
  keywords?: string[];
}
export interface Project {
  name: string;
  description?: string;
  url?: string;
  highlights?: string[];
  keywords?: string[];
}
export interface Certificate {
  name: string;
  date?: string;
  issuer?: string;
  url?: string;
}
export interface Resume {
  basics: Basics;
  work?: Work[];
  education?: Education[];
  skills?: Skill[];
  projects?: Project[];
  certificates?: Certificate[];
}
