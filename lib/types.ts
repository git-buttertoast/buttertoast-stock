export type EmployeeType = 'permanent' | 'intern' | 'freelancer'
export type EmployeeStatus = 'onboarding' | 'active' | 'exited'

export interface Profile {
  id: string
  full_name: string
  email: string
  phone: string | null
  is_active: boolean
  created_at: string
}

export interface EmployeeProfile {
  id: string
  employee_id: string | null
  joining_date: string | null
  employee_type: EmployeeType
  department: string | null
  role: string | null
  seniority: string | null
  designation: string | null
  reports_to: string | null
  last_day: string | null
  status: EmployeeStatus
  drive_folder_url: string | null
}

export interface Employee extends Profile {
  employee_profiles: EmployeeProfile | null
}

export interface EmployeeKYC {
  id: string
  profile_id: string
  aadhaar_number: string | null
  pan_number: string | null
  bank_name: string | null
  account_number: string | null
  ifsc_code: string | null
  date_of_birth: string | null
  blood_group: string | null
  personal_email: string | null
  personal_phone: string | null
  permanent_address: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_relation: string | null
  aadhaar_doc_url: string | null
  pan_doc_url: string | null
  photo_url: string | null
  bank_proof_url: string | null
}

export interface EmployeeCompensation {
  id: string
  profile_id: string
  compensation_type: 'ctc' | 'stipend' | 'rate_card'
  amount: number | null
  currency: string
  frequency: string | null
  effective_from: string
  effective_to: string | null
  notes: string | null
  created_at: string
}

export interface FreelancerRateCard {
  id: string
  profile_id: string
  rate_type: 'monthly_retainer' | 'daily' | 'project'
  amount: number | null
  currency: string
  scope_notes: string | null
  effective_from: string
  effective_to: string | null
}

export interface EmployeeDocument {
  id: string
  profile_id: string | null
  candidate_id: string | null
  document_type: string
  label: string | null
  version: number
  status: 'generated' | 'sent' | 'signed' | 'superseded'
  file_url: string | null
  signed_copy_url: string | null
  is_current: boolean
  metadata: Record<string, unknown> | null
  generated_at: string | null
  signed_at: string | null
  created_at: string
}

export interface ScoutOnboarding {
  id: string
  candidate_id: string | null
  employee_id: string | null
  status: 'pending' | 'in_progress' | 'complete'
  joining_date: string | null
  employment_type: string | null
  role_title: string | null
  department: string | null
  ctc: string | null
  drive_folder_url: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
}

export type DocumentType =
  | 'offer_letter'
  | 'internship_offer'
  | 'appointment_letter'
  | 'internship_appointment'
  | 'freelance_agreement'
  | 'appraisal'
  | 'probation_confirmation'
  | 'salary_revision'
  | 'experience_letter'
  | 'internship_completion'
  | 'relieving_letter'
  | 'warning_letter'
  | 'other'

export const DEPT_DISPLAY: Record<string, string> = {
  design: 'Design',
  video: 'Video',
  content: 'Content',
  strategy: 'Strategy',
  account_management: 'Account Management',
  business_development: 'Business Development',
  technology: 'Technology',
  finance: 'Finance',
  hr: 'HR',
  operations: 'Operations',
  social_media: 'Social Media',
  pr: 'PR',
  research: 'Research',
  legal: 'Legal',
}

export const DOC_TYPE_LABELS: Record<string, string> = {
  offer_letter: 'Offer Letter',
  internship_offer: 'Internship Offer Letter',
  appointment_letter: 'Appointment Letter',
  internship_appointment: 'Internship Appointment Letter',
  freelance_agreement: 'Freelance Agreement',
  appraisal: 'Appraisal Letter',
  probation_confirmation: 'Probation Confirmation',
  salary_revision: 'Salary Revision Letter',
  experience_letter: 'Experience Letter',
  internship_completion: 'Internship Completion Certificate',
  relieving_letter: 'Relieving Letter',
  warning_letter: 'Warning Letter',
  other: 'Other',
}
