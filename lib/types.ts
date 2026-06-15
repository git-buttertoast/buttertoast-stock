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

export interface EmployeeDevice {
  id: string
  profile_id: string | null
  ownership: 'company' | 'personal'
  device_type: 'laptop' | 'desktop' | 'phone' | 'tablet' | 'monitor' | 'other'
  make: string | null
  model: string | null
  serial_number: string | null
  imei: string | null
  color: string | null
  specs: string | null
  accessories: string | null
  purchase_value: number | null
  purchase_date: string | null
  date_added: string | null
  invoice_url: string | null
  depreciation_rate: number
  condition_at_handover: 'new' | 'good' | 'fair' | 'poor'
  condition_notes: string | null
  status: 'assigned' | 'unassigned' | 'returned' | 'lost' | 'damaged' | 'retired'
  assigned_date: string | null
  returned_date: string | null
  liability_document_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
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
  | 'device_handover'
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
  device_handover: 'Device Handover & Liability Agreement',
  other: 'Other',
}

// ── Device depreciation ──────────────────────────────────────────────────────
// Default reducing-balance rates by category (fraction per year). These track
// real-world replacement value for liability purposes — deliberately gentler
// than the aggressive statutory tax rates (which would under-value the device).
export const DEVICE_DEPRECIATION_DEFAULTS: Record<string, number> = {
  laptop: 0.20,
  desktop: 0.20,
  phone: 0.20,
  tablet: 0.20,
  monitor: 0.15,
  other: 0.20,
}

// Live reducing-balance depreciated value, computed to "today" (or a given date).
// value = base * (1 - rate)^yearsElapsed, with fractional years. Never below 0.
export function depreciatedValue(
  baseValue: number | null | undefined,
  ratePerYear: number | null | undefined,
  fromDate: string | null | undefined,
  asOf: Date = new Date()
): number | null {
  if (baseValue == null || isNaN(baseValue)) return null
  const rate = ratePerYear == null || isNaN(ratePerYear) ? 0.20 : ratePerYear
  if (!fromDate) return baseValue
  const start = new Date(fromDate + (fromDate.length <= 10 ? 'T00:00:00' : ''))
  if (isNaN(start.getTime())) return baseValue
  const years = (asOf.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  if (years <= 0) return baseValue
  const val = baseValue * Math.pow(1 - rate, years)
  return Math.max(0, Math.round(val))
}
