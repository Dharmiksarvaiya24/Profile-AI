export interface EducationItem {
  degree: string;
  periodOrGraduation: string;
  institution: string;
  location: string;
}

export interface ProfessionItem {
  role: string;
  company: string;
  period: string;
}

export const EDUCATION_DATA: EducationItem[] = [
  {
    degree: "Bachelor of Engineering in Computer Science, VTU",
    periodOrGraduation: "Expected Graduation: 2027",
    institution: "RRIT",
    location: "Bengaluru",
  },
  {
    degree: "Diploma in Computer Engineering, GTU",
    periodOrGraduation: "2021 - 2024",
    institution: "SDCET",
    location: "Surat",
  },
];

export const PROFESSION_DATA: ProfessionItem[] = [
  {
    role: "Full Stack Developer Intern",
    company: "FlutterFlirt Pvt. Ltd.",
    period: "February 2026 – May 2026.",
  },
  {
    role: "Student Intern",
    company: "TOPS Technologies Pvt. Ltd",
    period: "March 2023 – April 2023",
  },
];
