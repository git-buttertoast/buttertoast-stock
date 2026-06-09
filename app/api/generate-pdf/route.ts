import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DRIVE_URL = 'https://script.google.com/macros/s/AKfycbyVbz5RdpIuwkkyqrvccttilVhxKB71BXWblIC7jrLa4k8G6pqJLMSVWzdE11iq17yvaA/exec'

const SIGN_AAKASH = 'https://ferlauhakdbfpwfapxxw.supabase.co/storage/v1/object/public/assets/signatures/aakash_sign.jpg'
const SIGN_NIKI   = 'https://ferlauhakdbfpwfapxxw.supabase.co/storage/v1/object/public/assets/signatures/niki_sign.png'

const LH_DEFAULTS = {
  top: 38, bottom: 20, left: 20, right: 20,
  lh_url: 'https://ferlauhakdbfpwfapxxw.supabase.co/storage/v1/object/public/assets/branding/letterhead.png',
  company: 'Butter Toast',
  company_full: 'HATCHX INDIA (Butter Toast)',
  company_address: 'Office No. 502, Fifth Floor, Trinity, Thaltej, Ahmedabad, Gujarat - 380059',
  gst: '24AEPPR9510K1ZZ',
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '--'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtMoney(n: number | null | undefined) {
  if (!n) return '--'
  return new Intl.NumberFormat('en-IN').format(n)
}

function pronoun(gender: string, type: 'sub'|'obj'|'pos') {
  if (gender === 'male')   return { sub: 'he',   obj: 'him',  pos: 'his'   }[type]
  if (gender === 'female') return { sub: 'she',  obj: 'her',  pos: 'her'   }[type]
  return                          { sub: 'they', obj: 'them', pos: 'their' }[type]
}

function generateRef(type: string, name: string) {
  const year = new Date().getFullYear()
  const prefix: Record<string,string> = {
    offer_letter:'OL', internship_offer:'IOL', appointment_letter:'APT',
    internship_appointment:'IAP', freelance_agreement:'FRE', appraisal:'APR',
    probation_confirmation:'PRB', salary_revision:'SAL', experience_letter:'EXP',
    internship_completion:'ICP', relieving_letter:'REL', warning_letter:'WRN',
  }
  return `BT/${prefix[type]||'DOC'}/${year}/${name.split(' ')[0].toUpperCase()}`
}

function shell(content: string, settings: typeof LH_DEFAULTS, ref: string, dateStr: string) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; font-size: 12px; line-height: 1.75; color: #1a1a1a; background: #fff; }
.page { width: 210mm; min-height: 297mm; position: relative; background: url('${settings.lh_url}') no-repeat top left / 210mm auto; background-color: #fff; }
.content { position: absolute; top: ${settings.top}mm; left: ${settings.left}mm; right: ${settings.right}mm; bottom: ${settings.bottom}mm; overflow: hidden; }
.meta { font-size: 11px; color: #555; margin-bottom: 18px; line-height: 1.6; }
.doc-title { font-size: 16px; font-weight: 700; text-align: center; margin-bottom: 20px; letter-spacing: 0.2px; }
h3 { font-size: 12px; font-weight: 700; margin: 18px 0 6px; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; }
p { margin: 0 0 10px; font-size: 12px; }
strong { font-weight: 600; }
ul { margin: 6px 0 12px 0; padding-left: 18px; }
li { margin-bottom: 4px; font-size: 12px; }
table.terms { width: 100%; border-collapse: collapse; margin: 10px 0 14px; }
table.terms td { padding: 6px 10px; border: 1px solid #ddd; font-size: 11.5px; vertical-align: top; }
table.terms td:first-child { width: 38%; font-weight: 600; background: #f8f8f8; }
.sig-row { display: flex; gap: 40px; margin-top: 36px; }
.sig-block { flex: 1; }
.sig-img { height: 42px; display: block; margin-bottom: 2px; }
.sig-name { font-weight: 700; font-size: 12px; }
.sig-desig { font-size: 11px; color: #555; }
.accept { margin-top: 32px; border-top: 1px solid #ccc; padding-top: 14px; }
.accept-line { display: flex; gap: 32px; font-size: 11px; color: #444; margin-top: 10px; }
.sign-line { border-bottom: 1px solid #999; width: 160px; height: 28px; margin-bottom: 4px; }
.divider { border: none; border-top: 1px solid #e0e0e0; margin: 16px 0; }
.fun { font-style: italic; color: #444; }
</style>
</head><body><div class="page"><div class="content">
<div class="meta">Date: ${dateStr} &nbsp;&nbsp; Ref: ${ref}</div>
${content}
</div></div></body></html>`
}

function sigBoth() {
  return `<div class="sig-row">
    <div class="sig-block">
      <img class="sig-img" src="${SIGN_AAKASH}" alt=""/>
      <div class="sig-name">Aakash Rathi</div>
      <div class="sig-desig">Founder, Butter Toast</div>
    </div>
    <div class="sig-block">
      <img class="sig-img" src="${SIGN_NIKI}" alt=""/>
      <div class="sig-name">Niki A. Rathi</div>
      <div class="sig-desig">Proprietor, HATCHX INDIA</div>
    </div>
  </div>`
}

function sigSingle(signatory: string) {
  const isNiki = signatory === 'niki'
  return `<div style="margin-top:36px;">
    <p style="margin-bottom:6px;">Warm regards,</p>
    <img class="sig-img" src="${isNiki ? SIGN_NIKI : SIGN_AAKASH}" alt=""/>
    <div class="sig-name">${isNiki ? 'Niki A. Rathi' : 'Aakash Rathi'}</div>
    <div class="sig-desig">${isNiki ? 'Proprietor, HATCHX INDIA' : 'Founder, Butter Toast'}</div>
  </div>`
}

function acceptBlock(name: string) {
  return `<div class="accept">
    <p style="font-size:11px;color:#555;">Acknowledgement by the Candidate:</p>
    <p style="font-size:11.5px;">I, <strong>${name}</strong>, accept the terms and conditions outlined in this letter and agree to abide by the policies and standards of HATCHX INDIA (Butter Toast).</p>
    <div class="accept-line">
      <div><div class="sign-line"></div><div>Signature</div></div>
      <div><div class="sign-line"></div><div>Date</div></div>
      <div><div class="sign-line"></div><div>Place</div></div>
    </div>
  </div>`
}

// ── OFFER LETTER ─────────────────────────────────────────────────────────────
function offerLetter(p: Record<string,any>, s: typeof LH_DEFAULTS) {
  const ref = generateRef('offer_letter', p.employee_name)
  const dateStr = fmtDate(p.effective_date)
  const joiningStr = fmtDate(p.joining_date)
  const first = p.employee_name.split(' ')[0]
  const content = `
<p>Dear <strong>${p.employee_name}</strong>,</p>
<p class="fun">Good news, ${first} &mdash; you're officially on the menu.</p>
<p>We're excited to confirm that you'll be joining Butter Toast as <strong>${p.role_title}</strong>.</p>
<p>At Butter Toast, we like our work like we like our toast: simple, well-crafted, and surprisingly hard to get right. From what we've seen, you fit right in.</p>
<p>Here are the basics:</p>
<table class="terms">
  <tr><td>Role</td><td>${p.role_title}</td></tr>
  <tr><td>Start Date</td><td>${joiningStr}</td></tr>
  <tr><td>Location</td><td>Ahmedabad</td></tr>
  ${p.reports_to_name ? `<tr><td>Reporting To</td><td>${p.reports_to_name}</td></tr>` : ''}
  <tr><td>Probation Period</td><td>${p.probation_months || 3} months</td></tr>
</table>
<p><strong>Compensation</strong></p>
<table class="terms">
  <tr><td>During Probation</td><td>INR ${fmtMoney(p.probation_ctc)} / Month (in hand)</td></tr>
  <tr><td>Post Confirmation</td><td>INR ${fmtMoney(p.confirmed_ctc)} / Month (in hand)</td></tr>
</table>
${p.notes ? `<p>${p.notes}</p>` : ''}
<p>Over the next few days, we'll share everything you need to get started &mdash; tools, processes, and what your first few weeks will look like.</p>
<p>Until then, take this as your official confirmation: you're part of the kitchen now.</p>
<p>Let's cook some good stuff.</p>
<p style="margin-top:14px;">Best,<br/><strong>Team PeopleOps, Butter Toast</strong></p>
${sigBoth()}
${acceptBlock(p.employee_name)}`
  return shell(content, s, ref, dateStr)
}

// ── INTERNSHIP OFFER LETTER ───────────────────────────────────────────────────
function internshipOffer(p: Record<string,any>, s: typeof LH_DEFAULTS) {
  const ref = generateRef('internship_offer', p.employee_name)
  const dateStr = fmtDate(p.effective_date)
  const joiningStr = fmtDate(p.joining_date)
  const endStr = fmtDate(p.internship_end_date)
  const first = p.employee_name.split(' ')[0]
  const content = `
<p>Dear <strong>${p.employee_name}</strong>,</p>
<p class="fun">Good news, ${first} &mdash; you're on the menu. As an intern, consider this your trial tasting.</p>
<p>We're excited to have you join Butter Toast as <strong>${p.role_title}</strong>.</p>
<p>Here are the basics:</p>
<table class="terms">
  <tr><td>Role</td><td>${p.role_title}</td></tr>
  <tr><td>Start Date</td><td>${joiningStr}</td></tr>
  ${endStr !== '--' ? `<tr><td>Duration</td><td>Till ${endStr}</td></tr>` : `<tr><td>Duration</td><td>${p.internship_months || ''} months</td></tr>`}
  <tr><td>Location</td><td>Ahmedabad</td></tr>
  ${p.reports_to_name ? `<tr><td>Reporting To</td><td>${p.reports_to_name}</td></tr>` : ''}
  <tr><td>Monthly Stipend</td><td>INR ${fmtMoney(p.stipend)} / Month</td></tr>
</table>
${p.notes ? `<p>${p.notes}</p>` : ''}
<p>Over the next few days, we'll share everything you need to get started &mdash; tools, processes, and what your first few weeks will look like.</p>
<p>Until then, take this as your official confirmation: you're part of the kitchen now.</p>
<p>Let's cook some good stuff.</p>
<p style="margin-top:14px;">Best,<br/><strong>Team PeopleOps, Butter Toast</strong></p>
${sigBoth()}
${acceptBlock(p.employee_name)}`
  return shell(content, s, ref, dateStr)
}

// ── APPOINTMENT LETTER ────────────────────────────────────────────────────────
function appointmentLetter(p: Record<string,any>, s: typeof LH_DEFAULTS) {
  const ref = generateRef('appointment_letter', p.employee_name)
  const dateStr = fmtDate(p.effective_date)
  const joiningStr = fmtDate(p.joining_date)
  const probEndStr = fmtDate(p.probation_end_date)
  const dutiesList = p.duties
    ? p.duties.split('\n').filter((d: string) => d.trim()).map((d: string) => `<li>${d.replace(/^[-•*]\s*/,'')}</li>`).join('')
    : '<li>[Duties to be communicated by your reporting manager]</li>'
  const content = `
<p>Dear <strong>${p.employee_name}</strong>,</p>
<p class="fun">Welcome to the kitchen. Here's everything you need to know before we turn the heat up.</p>
<p>We are delighted to confirm your appointment with Butter Toast, a creative division of HATCHX INDIA. This letter outlines the terms and conditions of your employment.</p>
<hr class="divider"/>
<h3>1. Position and Reporting</h3>
<p>You will be appointed to the position of <strong>${p.role_title}</strong>${p.department ? ` in the ${p.department} department` : ''}. You will report directly to <strong>${p.reports_to_name || '[Reporting Manager]'}</strong>, or to any other person as designated by management.</p>
<p>Your date of joining is <strong>${joiningStr}</strong>.</p>
<p>Your duties and responsibilities will include, but are not limited to:</p>
<ul>${dutiesList}</ul>
<hr class="divider"/>
<h3>2. Compensation and Benefits</h3>
<p><strong>Base Compensation</strong></p>
<p>You will receive a gross monthly remuneration of <strong>INR ${fmtMoney(p.monthly_ctc)}</strong>, payable on or before the 5th of each month, subject to applicable taxes and statutory deductions.${p.confirmed_ctc ? ` To be revised post confirmation to INR ${fmtMoney(p.confirmed_ctc)} per month.` : ''}</p>
<p><strong>Allowances &amp; Benefits</strong></p>
<ul>
  <li>Paid annual leave, sick leave, and public holidays as per the company's HR policy.</li>
  <li>Reimbursement of approved business expenses.</li>
  <li>Access to company-provided tools, systems, and subscriptions required for your work.</li>
  <li>Any future benefits that the company rolls out to all its employees.</li>
</ul>
<p><strong>Referral Bonus</strong></p>
<p>On a successful client referral, a one-time bonus of 10% of the revenue generated in the first three months will be processed to you on successful completion of tenure and payment of invoices by the client, irrespective of department or work driven.</p>
<hr class="divider"/>
<h3>3. Probation and Confirmation</h3>
<p>You will be on a probationary period till <strong>${probEndStr}</strong>. During this period, your performance, conduct, and alignment with company values will be evaluated. Upon satisfactory completion, your employment will be confirmed in writing.</p>
<hr class="divider"/>
<h3>4. Working Hours and Location</h3>
<ul>
  <li>Work Days: Monday to Friday.</li>
  <li>Working Hours: 10:30 AM &ndash; 7:00 PM. If overtime extends beyond 4 hours, you are entitled to one day of Compensatory Off (Comp Off).</li>
  <li>Location: Thaltej, Ahmedabad.</li>
</ul>
<hr class="divider"/>
<h3>5. Confidentiality and Intellectual Property</h3>
<p>All work, concepts, strategies, and creative output produced during your employment shall be the exclusive intellectual property of HATCHX INDIA / Butter Toast. You may not disclose, reproduce, or use any proprietary or client information for personal gain or external purposes without prior written consent.</p>
<hr class="divider"/>
<h3>6. Code of Conduct and Company Policies</h3>
<p>As part of the team, you are expected to:</p>
<ul>
  <li>Maintain professionalism, respect, and integrity in all internal and client communications.</li>
  <li>Adhere to workplace policies, attendance norms, and performance expectations.</li>
  <li>Uphold the creative and ethical standards that Butter Toast is known for.</li>
</ul>
<p>Violation of company policies may result in disciplinary action, including termination.</p>
<hr class="divider"/>
<h3>7. Termination of Employment</h3>
<p>Either party may terminate this employment by providing <strong>two months' written notice</strong> or salary in lieu thereof. In cases of misconduct, breach of confidentiality, or gross negligence, HATCHX INDIA reserves the right to terminate employment immediately without notice or compensation.</p>
<hr class="divider"/>
<h3>8. Background Verification</h3>
<p>This appointment is contingent upon successful completion of background verification checks and submission of valid identification and address proof as required by HR.</p>
<hr class="divider"/>
<h3>9. Entire Agreement</h3>
<p>This letter, along with your signed acceptance and any accompanying agreements, constitutes the entire understanding between you and HATCHX INDIA (Butter Toast) and supersedes any prior verbal or written communication regarding employment terms.</p>
<hr class="divider"/>
<h3>10. Acceptance</h3>
<p>Please sign and return a scanned copy of this letter to confirm your acceptance. Your signature indicates your understanding and agreement to all terms and conditions herein.</p>
<p>We are excited to welcome you to the Butter Toast family &mdash; a space where creativity meets strategy, and ideas come alive. We look forward to seeing the impact you'll create with us.</p>
<p style="margin-top:10px;">Warm regards,<br/>For HATCHX INDIA (Butter Toast)</p>
${sigBoth()}
${acceptBlock(p.employee_name)}`
  return shell(content, s, ref, dateStr)
}

// ── INTERNSHIP APPOINTMENT ────────────────────────────────────────────────────
function internshipAppointment(p: Record<string,any>, s: typeof LH_DEFAULTS) {
  const ref = generateRef('internship_appointment', p.employee_name)
  const dateStr = fmtDate(p.effective_date)
  const joiningStr = fmtDate(p.joining_date)
  const endStr = fmtDate(p.internship_end_date)
  const dutiesList = p.duties
    ? p.duties.split('\n').filter((d: string) => d.trim()).map((d: string) => `<li>${d.replace(/^[-•*]\s*/,'')}</li>`).join('')
    : '<li>[Duties to be communicated by your reporting manager]</li>'
  const content = `
<p>Dear <strong>${p.employee_name}</strong>,</p>
<p class="fun">Welcome to the kitchen. Here's what your trial run looks like.</p>
<p>We are pleased to confirm your internship with Butter Toast, a creative division of HATCHX INDIA.</p>
<hr class="divider"/>
<h3>1. Position and Reporting</h3>
<p>You will be working as <strong>${p.role_title}</strong>${p.department ? ` in the ${p.department} department` : ''}, reporting to <strong>${p.reports_to_name || '[Reporting Manager]'}</strong>.</p>
<p>Your internship commences on <strong>${joiningStr}</strong>${endStr !== '--' ? ` and is scheduled to conclude on <strong>${endStr}</strong>` : ''}.</p>
<p>Your responsibilities will include, but are not limited to:</p>
<ul>${dutiesList}</ul>
<hr class="divider"/>
<h3>2. Stipend</h3>
<p>You will receive a monthly stipend of <strong>INR ${fmtMoney(p.stipend)}</strong>, payable on or before the 5th of each month, subject to applicable deductions.</p>
<hr class="divider"/>
<h3>3. Working Hours and Location</h3>
<ul>
  <li>Work Days: Monday to Friday.</li>
  <li>Working Hours: 10:30 AM &ndash; 7:00 PM.</li>
  <li>Location: Thaltej, Ahmedabad.</li>
</ul>
<hr class="divider"/>
<h3>4. Confidentiality and Intellectual Property</h3>
<p>All work produced during your internship shall be the exclusive intellectual property of HATCHX INDIA / Butter Toast. You may not disclose or use any proprietary or client information for personal gain or external purposes.</p>
<hr class="divider"/>
<h3>5. Code of Conduct</h3>
<ul>
  <li>Maintain professionalism and integrity in all communications.</li>
  <li>Adhere to workplace policies and attendance norms.</li>
  <li>Uphold the creative and ethical standards that Butter Toast is known for.</li>
</ul>
<hr class="divider"/>
<h3>6. Termination</h3>
<p>Either party may bring this internship to a close at any time. In cases of misconduct or breach of confidentiality, HATCHX INDIA reserves the right to terminate immediately.</p>
<hr class="divider"/>
<h3>7. Entire Agreement</h3>
<p>This letter constitutes the entire understanding between you and HATCHX INDIA (Butter Toast) regarding this internship.</p>
<p style="margin-top:14px;">We look forward to a productive and creative internship. Welcome aboard.</p>
<p>Warm regards,<br/>For HATCHX INDIA (Butter Toast)</p>
${sigBoth()}
${acceptBlock(p.employee_name)}`
  return shell(content, s, ref, dateStr)
}

// ── FREELANCE AGREEMENT ───────────────────────────────────────────────────────
function freelanceAgreement(p: Record<string,any>, s: typeof LH_DEFAULTS) {
  const ref = generateRef('freelance_agreement', p.employee_name)
  const dateStr = fmtDate(p.effective_date)
  const content = `
<p>Dear <strong>${p.employee_name}</strong>,</p>
<p>This letter confirms your engagement as a <strong>Freelancer / Independent Consultant</strong>${p.role_title ? ` in the capacity of ${p.role_title}` : ''} with Butter Toast (HATCHX INDIA), effective <strong>${dateStr}</strong>.</p>
<hr class="divider"/>
<h3>1. Scope of Work</h3>
<p>${p.notes || '[Scope of work to be defined per project / retainer agreement]'}</p>
<hr class="divider"/>
<h3>2. Compensation</h3>
<p>Compensation shall be as per the agreed rate card: <strong>INR ${fmtMoney(p.rate)} ${p.rate_type === 'monthly_retainer' ? '/ Month' : p.rate_type === 'daily' ? '/ Day' : '(Project basis)'}</strong>. Payment will be processed within 7 working days of invoice submission and approval.</p>
<hr class="divider"/>
<h3>3. Intellectual Property</h3>
<p>All work, concepts, strategies, and creative output produced under this engagement shall be the exclusive intellectual property of HATCHX INDIA / Butter Toast. You may not use, reproduce, or share any such work without prior written consent.</p>
<hr class="divider"/>
<h3>4. Confidentiality</h3>
<p>You agree to maintain strict confidentiality of all client information, business strategies, internal processes, and any proprietary data accessed during this engagement, both during and after its conclusion.</p>
<hr class="divider"/>
<h3>5. Independent Contractor</h3>
<p>This engagement does not constitute an employment relationship. You are engaged as an independent contractor and are solely responsible for your own taxes, statutory contributions, and professional obligations.</p>
<hr class="divider"/>
<h3>6. Termination</h3>
<p>Either party may terminate this engagement with 30 days' written notice. HATCHX INDIA reserves the right to terminate immediately in cases of breach of confidentiality, misconduct, or failure to deliver agreed work.</p>
<hr class="divider"/>
<h3>7. Entire Agreement</h3>
<p>This letter, along with any project-specific agreements, constitutes the entire understanding between you and HATCHX INDIA (Butter Toast) and supersedes any prior verbal or written communication.</p>
<p style="margin-top:14px;">Please sign and return a copy to confirm your acceptance.</p>
${sigSingle(p.signatory)}
<div class="accept" style="margin-top:24px;">
  <p style="font-size:11px;color:#555;">Acknowledged and accepted by:</p>
  <div class="accept-line">
    <div><div class="sign-line"></div><div>${p.employee_name}</div></div>
    <div><div class="sign-line"></div><div>Date</div></div>
  </div>
</div>`
  return shell(content, s, ref, dateStr)
}

// ── APPRAISAL ─────────────────────────────────────────────────────────────────
function appraisalLetter(p: Record<string,any>, s: typeof LH_DEFAULTS) {
  const ref = generateRef('appraisal', p.employee_name)
  const dateStr = fmtDate(p.effective_date)
  const content = `
<p>Dear <strong>${p.employee_name}</strong>,</p>
<p class="fun">The kitchen has noticed. Here's what that looks like.</p>
<p>Following your performance appraisal, we are pleased to revise your compensation effective <strong>${dateStr}</strong>.</p>
<table class="terms" style="margin:16px 0;">
  <tr><td>Previous Compensation</td><td>INR ${fmtMoney(p.old_ctc)} per month</td></tr>
  <tr><td>Revised Compensation</td><td>INR ${fmtMoney(p.new_ctc)} per month</td></tr>
  <tr><td>Effective Date</td><td>${dateStr}</td></tr>
</table>
<p>This revision is in recognition of your contributions, dedication, and performance at Butter Toast.${p.notes ? ` ${p.notes}` : ''}</p>
<p>Please treat this letter as strictly confidential.</p>
${sigSingle(p.signatory)}`
  return shell(content, s, ref, dateStr)
}

// ── SALARY REVISION ───────────────────────────────────────────────────────────
function salaryRevision(p: Record<string,any>, s: typeof LH_DEFAULTS) {
  const ref = generateRef('salary_revision', p.employee_name)
  const dateStr = fmtDate(p.effective_date)
  const content = `
<p>Dear <strong>${p.employee_name}</strong>,</p>
<p>This is to inform you that your compensation has been revised as follows, effective <strong>${dateStr}</strong>:</p>
<table class="terms" style="margin:16px 0;">
  <tr><td>Previous Compensation</td><td>INR ${fmtMoney(p.old_ctc)} per month</td></tr>
  <tr><td>Revised Compensation</td><td>INR ${fmtMoney(p.new_ctc)} per month</td></tr>
  <tr><td>Effective Date</td><td>${dateStr}</td></tr>
</table>
${p.notes ? `<p>${p.notes}</p>` : ''}
<p>We appreciate your continued contributions to the team. Please treat this letter as strictly confidential.</p>
${sigSingle(p.signatory)}`
  return shell(content, s, ref, dateStr)
}

// ── PROBATION CONFIRMATION ────────────────────────────────────────────────────
function probationConfirmation(p: Record<string,any>, s: typeof LH_DEFAULTS) {
  const ref = generateRef('probation_confirmation', p.employee_name)
  const dateStr = fmtDate(p.effective_date)
  const content = `
<p>Dear <strong>${p.employee_name}</strong>,</p>
<p class="fun">You passed the tasting. You're on the permanent menu now.</p>
<p>We are pleased to inform you that your employment as <strong>${p.role_title}</strong> at Butter Toast has been confirmed effective <strong>${dateStr}</strong>, following the satisfactory completion of your probation period.</p>
<p>Your performance, conduct, and alignment with our values have been evaluated and we are proud to have you as a confirmed member of the team.</p>
${p.notes ? `<p>${p.notes}</p>` : ''}
<p>Your revised compensation, if applicable, will be communicated separately. All other terms of your employment remain as per your original appointment letter.</p>
<p>Welcome to the permanent roster.</p>
${sigSingle(p.signatory)}`
  return shell(content, s, ref, dateStr)
}

// ── EXPERIENCE LETTER ─────────────────────────────────────────────────────────
function experienceLetter(p: Record<string,any>, s: typeof LH_DEFAULTS) {
  const ref = generateRef('experience_letter', p.employee_name)
  const dateStr = fmtDate(p.effective_date)
  const joiningStr = fmtDate(p.joining_date)
  const lastDayStr = fmtDate(p.last_working_date)
  const isExit = !!p.last_working_date
  const first = p.employee_name.split(' ')[0]
  const pro = pronoun(p.gender || 'neutral', 'sub')
  const pron_pos = pronoun(p.gender || 'neutral', 'pos')
  const content = `
<p>To Whomsoever It May Concern,</p>
<p>This is to certify that <strong>${p.employee_name}</strong> ${isExit ? `was associated with` : `is associated with`} <strong>Butter Toast</strong>, a creative division of HATCHX INDIA, ${isExit ? `from <strong>${joiningStr}</strong> to <strong>${lastDayStr}</strong>` : `since <strong>${joiningStr}</strong>`} as <strong>${p.role_title}</strong>${p.department ? ` in the ${p.department} department` : ''}.</p>
<p>During ${pron_pos} ${isExit ? 'tenure' : 'association'} with us, ${first} has demonstrated professionalism, dedication, and a strong commitment to ${pron_pos} role. ${pro.charAt(0).toUpperCase() + pro.slice(1)} has been a valued member of the team.${p.notes ? ` ${p.notes}` : ''}</p>
<p>This letter is issued at the request of ${first} and is valid as on the date of issue. We wish ${pronoun(p.gender || 'neutral', 'obj')} the very best in ${pron_pos} future endeavours.</p>
${sigSingle(p.signatory)}`
  return shell(content, s, ref, dateStr)
}

// ── INTERNSHIP COMPLETION ─────────────────────────────────────────────────────
function internshipCompletion(p: Record<string,any>, s: typeof LH_DEFAULTS) {
  const ref = generateRef('internship_completion', p.employee_name)
  const dateStr = fmtDate(p.effective_date)
  const joiningStr = fmtDate(p.joining_date)
  const endStr = fmtDate(p.internship_end_date || p.effective_date)
  const first = p.employee_name.split(' ')[0]
  const pron_pos = pronoun(p.gender || 'neutral', 'pos')
  const content = `
<p>To Whomsoever It May Concern,</p>
<p>This is to certify that <strong>${p.employee_name}</strong> has successfully completed an internship with <strong>Butter Toast</strong>, a creative division of HATCHX INDIA, as <strong>${p.role_title}</strong>${p.department ? ` in the ${p.department} department` : ''}.</p>
<p>The internship was undertaken from <strong>${joiningStr}</strong> to <strong>${endStr}</strong>.</p>
<p>During this period, ${first} demonstrated enthusiasm, creativity, and a genuine commitment to ${pron_pos} work. ${pron_pos.charAt(0).toUpperCase() + pron_pos.slice(1)} contributions to the team were meaningful and appreciated.${p.notes ? ` ${p.notes}` : ''}</p>
<p>We wish ${pronoun(p.gender || 'neutral', 'obj')} the very best in ${pron_pos} future endeavours.</p>
${sigSingle(p.signatory)}`
  return shell(content, s, ref, dateStr)
}

// ── RELIEVING LETTER ──────────────────────────────────────────────────────────
function relievingLetter(p: Record<string,any>, s: typeof LH_DEFAULTS) {
  const ref = generateRef('relieving_letter', p.employee_name)
  const dateStr = fmtDate(p.effective_date)
  const first = p.employee_name.split(' ')[0]
  const pron_obj = pronoun(p.gender || 'neutral', 'obj')
  const pron_pos = pronoun(p.gender || 'neutral', 'pos')
  const content = `
<p>Dear <strong>${p.employee_name}</strong>,</p>
<p>This is to confirm that <strong>${p.employee_name}</strong>, <strong>${p.role_title}</strong>${p.department ? ` &ndash; ${p.department}` : ''}, has been relieved from the services of Butter Toast (HATCHX INDIA) effective <strong>${dateStr}</strong>.</p>
<p>${first} has completed all handover formalities and cleared all dues as of the date of this letter.${p.notes ? ` ${p.notes}` : ''}</p>
<p>We thank ${pron_obj} for ${pron_pos} contributions to the team and wish ${pron_obj} the very best in ${pron_pos} future endeavours.</p>
${sigSingle(p.signatory)}`
  return shell(content, s, ref, dateStr)
}

// ── WARNING LETTER ────────────────────────────────────────────────────────────
function warningLetter(p: Record<string,any>, s: typeof LH_DEFAULTS) {
  const ref = generateRef('warning_letter', p.employee_name)
  const dateStr = fmtDate(p.effective_date)
  const content = `
<p>Dear <strong>${p.employee_name}</strong>,</p>
<p>This letter is issued as a <strong>formal warning</strong> regarding the following matter:</p>
<div style="background:#f9f9f9;border-left:3px solid #ccc;padding:12px 14px;margin:12px 0;font-size:12px;">${p.notes || '[Please specify the details of the warning]'}</div>
<p>The above is a serious matter. We expect <strong>immediate and sustained improvement</strong> in the areas highlighted. This letter will be placed on your employment record.</p>
<p>Further recurrence of the same or similar behaviour may result in escalated disciplinary action, up to and including termination of employment, as per the terms of your appointment.</p>
<p>Please acknowledge receipt of this letter by signing below.</p>
${sigSingle(p.signatory)}
<div class="accept" style="margin-top:24px;">
  <p style="font-size:11px;color:#555;">Acknowledged by:</p>
  <div class="accept-line">
    <div><div class="sign-line"></div><div>${p.employee_name}</div></div>
    <div><div class="sign-line"></div><div>Date</div></div>
  </div>
</div>`
  return shell(content, s, ref, dateStr)
}

// ── MAIN HANDLER ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { document_type, profile_id, label, drive_folder_id } = body

    // Load settings
    const { data: settingsData } = await supabase.from('stock_settings').select('key,value')
    const sv: Record<string,string> = {}
    settingsData?.forEach((r: any) => { sv[r.key] = r.value })
    const settings = {
      ...LH_DEFAULTS,
      top:    parseInt(sv.lh_top_margin_mm    || '38'),
      bottom: parseInt(sv.lh_bottom_margin_mm || '20'),
      left:   parseInt(sv.lh_left_margin_mm   || '20'),
      right:  parseInt(sv.lh_right_margin_mm  || '20'),
      lh_url: sv.lh_url || LH_DEFAULTS.lh_url,
    }

    // Load employee data
    const { data: profileData } = await supabase.from('profiles')
      .select('id, full_name, email')
      .eq('id', profile_id).single()
    const { data: epData } = await supabase.from('employee_profiles')
      .select('*').eq('id', profile_id).single()
    const { data: compData } = await supabase.from('employee_compensation')
      .select('amount, effective_from').eq('profile_id', profile_id)
      .order('effective_from', { ascending: false }).limit(2)

    // Resolve reports_to name
    let reports_to_name = body.reports_to_name || ''
    if (!reports_to_name && epData?.reports_to) {
      const { data: mgr } = await supabase.from('profiles')
        .select('full_name').eq('id', epData.reports_to).single()
      reports_to_name = mgr?.full_name || ''
    }

    // Resolve compensation history
    const latestComp  = compData?.[0]?.amount || null
    const previousComp = compData?.[1]?.amount || null

    const p: Record<string,any> = {
      ...body,
      employee_name:   profileData?.full_name || body.employee_name || '',
      role_title:      epData?.designation || epData?.role || body.role_title || '',
      department:      epData?.department ? (epData.department.replace(/_/g, ' ')) : body.department || '',
      joining_date:    epData?.joining_date || body.joining_date || '',
      monthly_ctc:     body.monthly_ctc || latestComp,
      old_ctc:         body.old_ctc || previousComp,
      new_ctc:         body.new_ctc || latestComp,
      reports_to_name,
    }

    const generators: Record<string, Function> = {
      offer_letter:              offerLetter,
      internship_offer:          internshipOffer,
      appointment_letter:        appointmentLetter,
      internship_appointment:    internshipAppointment,
      freelance_agreement:       freelanceAgreement,
      appraisal:                 appraisalLetter,
      salary_revision:           salaryRevision,
      probation_confirmation:    probationConfirmation,
      experience_letter:         experienceLetter,
      internship_completion:     internshipCompletion,
      relieving_letter:          relievingLetter,
      warning_letter:            warningLetter,
    }

    const gen = generators[document_type]
    if (!gen) return NextResponse.json({ error: `Unknown document type: ${document_type}` }, { status: 400 })
    const html = gen(p, settings)

    const b64 = Buffer.from(html, 'utf-8').toString('base64')
    const filename = `${document_type.replace(/_/g,'-')}-${(p.employee_name).replace(/\s+/g,'-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.html`

    // Upload to Drive
    let driveLink: string | null = null
    if (drive_folder_id) {
      try {
        const dr = await fetch(DRIVE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'upload_file', folderId: drive_folder_id, fileName: filename, base64: b64, mimeType: 'text/html' })
        })
        const drData = await dr.json()
        if (drData?.fileLink) driveLink = drData.fileLink
      } catch (e) { console.error('Drive upload failed:', e) }
    }

    await supabase.from('employee_documents').insert({
      profile_id,
      document_type,
      label: label || null,
      version: 1,
      status: 'generated',
      file_url: driveLink,
      is_current: true,
      metadata: p,
      generated_at: new Date().toISOString(),
    })

    // If generating an experience letter, mark any pending requests as fulfilled
    if (document_type === 'experience_letter' && profile_id) {
      await supabase.from('experience_letter_requests')
        .update({ status: 'fulfilled' })
        .eq('profile_id', profile_id)
        .eq('status', 'pending')
    }

    // Store HTML in stock_print_jobs for print page
    const { data: jobData, error: jobError } = await supabase
      .from('stock_print_jobs')
      .insert({ html })
      .select('id')
      .single()
    if (jobError) throw new Error('Failed to create print job: ' + jobError.message)
    const printUrl = '/print?job=' + jobData.id
    return NextResponse.json({ printUrl, filename, driveLink })
  } catch (err: any) {
    console.error('Generate error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
