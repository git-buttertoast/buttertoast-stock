import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Letterhead constants (loaded from stock_settings, fallback to hardcoded)
const LH_DEFAULTS = {
  top: 38, bottom: 20, left: 20, right: 20,
  lh_url: 'https://ferlauhakdbfpwfapxxw.supabase.co/storage/v1/object/public/assets/branding/letterhead.pdf',
  sign_aakash: 'https://ferlauhakdbfpwfapxxw.supabase.co/storage/v1/object/public/assets/signatures/aakash_sign.jpg',
  sign_niki: 'https://ferlauhakdbfpwfapxxw.supabase.co/storage/v1/object/public/assets/signatures/niki_sign.png',
  company: 'Butter Toast',
  company_parent: 'A HATCHX INDIA Brand',
  company_address: 'Office No. 502, Fifth Floor, Trinity, Thaltej, Ahmedabad, Gujarat - 380059',
}

function fmtDate(d: string | null) {
  if (!d) return '--'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function generateRef(type: string, name: string) {
  const year = new Date().getFullYear()
  const prefix = {
    appointment_letter: 'APT', appraisal: 'APR', probation_confirmation: 'PRB',
    salary_revision: 'SAL', experience_letter: 'EXP', internship_completion: 'INT',
    relieving_letter: 'REL', freelance_agreement: 'FRE', warning_letter: 'WRN',
  }[type] || 'DOC'
  return `BT/${prefix}/${year}/${name.split(' ')[0].toUpperCase()}`
}

function generateHTML(params: {
  document_type: string
  employee_name: string
  role_title: string
  department: string
  joining_date: string
  signatory: string
  effective_date: string
  notes: string
  settings: typeof LH_DEFAULTS
}) {
  const { document_type, employee_name, role_title, department, joining_date, signatory, effective_date, notes, settings } = params
  const sigUrl = signatory === 'niki' ? settings.sign_niki : settings.sign_aakash
  const sigName = signatory === 'niki' ? 'Niki A. Rathi' : 'Aakash Rathi'
  const sigDesig = signatory === 'niki' ? 'Director' : 'Founder'
  const ref = generateRef(document_type, employee_name)
  const dateStr = fmtDate(effective_date)
  const joiningStr = fmtDate(joining_date)
  const lh = settings.lh_url

  const docTitles: Record<string, string> = {
    appointment_letter: 'Appointment Letter',
    freelance_agreement: 'Freelance Agreement',
    appraisal: 'Appraisal Letter',
    probation_confirmation: 'Confirmation of Employment',
    salary_revision: 'Salary Revision Letter',
    experience_letter: 'Experience Letter',
    internship_completion: 'Internship Completion Certificate',
    relieving_letter: 'Relieving Letter',
    warning_letter: 'Warning Letter',
  }

  const docTitle = docTitles[document_type] || 'Letter'

  const bodyContent: Record<string, string> = {
    appointment_letter: `
      <p>Dear <strong>${employee_name}</strong>,</p>
      <p>We are pleased to confirm your appointment as <strong>${role_title}</strong>${department ? ` in the ${department} department` : ''} at ${settings.company}.</p>
      <table>
        <tr><td>Designation</td><td>${role_title}</td></tr>
        ${department ? `<tr><td>Department</td><td>${department}</td></tr>` : ''}
        <tr><td>Date of Joining</td><td>${joiningStr}</td></tr>
        <tr><td>Nature of Employment</td><td>Permanent</td></tr>
      </table>
      <p>Your appointment is subject to the following terms and conditions:</p>
      <ul>
        <li>You are required to maintain confidentiality of all company-related information.</li>
        <li>You will be governed by the HR policies of the company as amended from time to time.</li>
        <li>This appointment is subject to satisfactory verification of your documents and references.</li>
        ${notes ? `<li>${notes}</li>` : ''}
      </ul>
      <p>We look forward to a long and mutually beneficial association.</p>
    `,
    freelance_agreement: `
      <p>Dear <strong>${employee_name}</strong>,</p>
      <p>This letter confirms your engagement as a <strong>Freelancer / Consultant</strong>${role_title ? ` in the capacity of ${role_title}` : ''} with ${settings.company}, effective ${dateStr}.</p>
      <p>The terms of this engagement are as follows:</p>
      <ul>
        <li>All work produced during this engagement remains the intellectual property of ${settings.company}.</li>
        <li>You agree to maintain confidentiality of all client and company information.</li>
        <li>Payments will be made as per the agreed rate card upon submission of invoices.</li>
        <li>Either party may terminate this agreement with reasonable notice.</li>
        ${notes ? `<li>${notes}</li>` : ''}
      </ul>
      <p>Please sign and return a copy of this agreement as confirmation of your acceptance.</p>
    `,
    appraisal: `
      <p>Dear <strong>${employee_name}</strong>,</p>
      <p>We are pleased to inform you that following your performance appraisal, the management has decided to revise your compensation effective <strong>${dateStr}</strong>.</p>
      <p>This revision is in recognition of your contributions and performance at ${settings.company}. We appreciate your dedication and look forward to your continued growth with us.</p>
      ${notes ? `<p>${notes}</p>` : ''}
      <p>Please treat this letter as confidential.</p>
    `,
    probation_confirmation: `
      <p>Dear <strong>${employee_name}</strong>,</p>
      <p>We are pleased to inform you that upon satisfactory completion of your probation period, your employment as <strong>${role_title}</strong> at ${settings.company} has been confirmed effective <strong>${dateStr}</strong>.</p>
      <p>You are now a confirmed employee of the organisation, subject to the terms and conditions of employment as communicated to you.</p>
      ${notes ? `<p>${notes}</p>` : ''}
      <p>We wish you continued success in your role.</p>
    `,
    salary_revision: `
      <p>Dear <strong>${employee_name}</strong>,</p>
      <p>This is to inform you that your compensation has been revised effective <strong>${dateStr}</strong>.</p>
      ${notes ? `<p>${notes}</p>` : ''}
      <p>We appreciate your contributions to the team and look forward to your continued growth. Please treat this letter as strictly confidential.</p>
    `,
    experience_letter: `
      <p>To Whomsoever It May Concern,</p>
      <p>This is to certify that <strong>${employee_name}</strong> ${joining_date ? `has been associated with ${settings.company} since <strong>${joiningStr}</strong>` : `is associated with ${settings.company}`} as <strong>${role_title}</strong>${department ? ` in the ${department} department` : ''}.</p>
      <p>During their association with us, ${employee_name.split(' ')[0]} has demonstrated professionalism and dedication. We wish them the very best in their future endeavours.</p>
      ${notes ? `<p>${notes}</p>` : ''}
      <p>This letter is issued upon request for the purpose of ${notes || 'employment / visa / bank'} and is valid as on date.</p>
    `,
    internship_completion: `
      <p>To Whomsoever It May Concern,</p>
      <p>This is to certify that <strong>${employee_name}</strong> has successfully completed an internship with <strong>${settings.company}</strong>${role_title ? ` as ${role_title}` : ''}${department ? ` in the ${department} department` : ''}.</p>
      ${joining_date ? `<p>The internship was undertaken from <strong>${joiningStr}</strong> to <strong>${dateStr}</strong>.</p>` : ''}
      <p>During this period, ${employee_name.split(' ')[0]} demonstrated enthusiasm, professionalism and a willingness to learn. We wish them the best in their future endeavours.</p>
      ${notes ? `<p>${notes}</p>` : ''}
    `,
    relieving_letter: `
      <p>Dear <strong>${employee_name}</strong>,</p>
      <p>This is to confirm that <strong>${employee_name}</strong>, ${role_title}${department ? ` - ${department}` : ''}, has been relieved from the services of ${settings.company} effective <strong>${dateStr}</strong>.</p>
      <p>${employee_name.split(' ')[0]} has cleared all dues and formalities as required. We wish them the very best in their future endeavours.</p>
      ${notes ? `<p>${notes}</p>` : ''}
    `,
    warning_letter: `
      <p>Dear <strong>${employee_name}</strong>,</p>
      <p>This letter serves as a formal warning regarding the matter described below.</p>
      ${notes ? `<p>${notes}</p>` : '<p>[Details of the warning to be specified]</p>'}
      <p>We expect an immediate improvement and urge you to adhere to the company policies at all times. This letter will be placed on record. A repetition of such behaviour may result in further disciplinary action.</p>
      <p>Please acknowledge receipt of this letter by signing below.</p>
    `,
  }

  const body = bodyContent[document_type] || `<p>Dear <strong>${employee_name}</strong>,</p><p>${notes || 'Please find the details of this letter as discussed.'}</p>`

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; font-size: 12px; line-height: 1.8; color: #1a1a1a; background: #fff; }
.page { width: 210mm; min-height: 297mm; position: relative; background: url('${lh}') no-repeat top left / 210mm auto; background-color: #fff; }
.content { position: absolute; top: ${settings.top}mm; left: ${settings.left}mm; right: ${settings.right}mm; bottom: ${settings.bottom}mm; }
.meta { font-size: 11px; color: #555; margin-bottom: 20px; }
.meta div { margin-bottom: 2px; }
h2 { font-size: 13px; font-weight: 700; margin: 0 0 18px; text-decoration: underline; text-underline-offset: 3px; letter-spacing: 0.2px; }
p { margin: 0 0 13px; font-size: 12px; }
strong { font-weight: 600; }
ul { margin: 0 0 13px; padding-left: 18px; }
li { margin-bottom: 5px; font-size: 12px; }
table { width: 100%; border-collapse: collapse; margin: 12px 0 16px; }
td { padding: 7px 10px; border: 1px solid #ddd; font-size: 11.5px; vertical-align: top; }
td:first-child { width: 38%; font-weight: 600; background: #f8f8f8; }
.sig-block { margin-top: 44px; }
.sig-img { height: 46px; display: block; margin-bottom: 3px; }
.sig-name { font-weight: 700; font-size: 12px; }
.sig-desig { font-size: 11px; color: #555; }
.accept-block { margin-top: 48px; border-top: 1px solid #ddd; padding-top: 14px; }
.accept-line { display: flex; gap: 40px; font-size: 11px; color: #555; }
.sign-line { border-bottom: 1px solid #999; width: 180px; height: 32px; }
</style>
</head>
<body>
<div class="page">
<div class="content">
  <div class="meta">
    <div>Date: ${dateStr}</div>
    <div>Ref: ${ref}</div>
  </div>
  <h2>${docTitle}</h2>
  ${body}
  <div class="sig-block">
    <p style="margin-bottom: 8px;">Sincerely,</p>
    <img class="sig-img" src="${sigUrl}" alt="Signature"/>
    <div class="sig-name">${sigName}</div>
    <div class="sig-desig">${sigDesig}, ${settings.company}</div>
  </div>
  ${document_type === 'appointment_letter' || document_type === 'freelance_agreement' || document_type === 'warning_letter' ? `
  <div class="accept-block">
    <p style="font-size:11px;color:#555;margin-bottom:12px;">Acknowledged and accepted by:</p>
    <div class="accept-line">
      <div><div class="sign-line"></div><div style="margin-top:4px;">${employee_name}</div></div>
      <div><div class="sign-line"></div><div style="margin-top:4px;">Date</div></div>
    </div>
  </div>` : ''}
</div>
</div>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { document_type, profile_id, employee_name, role_title, department, joining_date, signatory, effective_date, notes, label } = body

    // Load settings from DB
    const { data: settingsData } = await supabase.from('stock_settings').select('key,value')
    const s: Record<string, string> = {}
    settingsData?.forEach((r: any) => { s[r.key] = r.value })

    const settings = {
      top: parseInt(s.lh_top_margin_mm || '38'),
      bottom: parseInt(s.lh_bottom_margin_mm || '20'),
      left: parseInt(s.lh_left_margin_mm || '20'),
      right: parseInt(s.lh_right_margin_mm || '20'),
      lh_url: s.lh_url || LH_DEFAULTS.lh_url,
      sign_aakash: s.sign_aakash_url || LH_DEFAULTS.sign_aakash,
      sign_niki: s.sign_niki_url || LH_DEFAULTS.sign_niki,
      company: s.company_name || LH_DEFAULTS.company,
      company_parent: s.company_parent || LH_DEFAULTS.company_parent,
      company_address: s.company_address || LH_DEFAULTS.company_address,
    }

    const html = generateHTML({ document_type, employee_name, role_title, department, joining_date, signatory, effective_date, notes, settings })

    // Upload HTML to Supabase storage (user opens and prints to PDF)
    const filename = `${document_type.replace(/_/g, '-')}-${employee_name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.html`
    const path = `documents/${profile_id}/${Date.now()}-${filename}`
    const blob = Buffer.from(html, 'utf-8')

    const { error: uploadError } = await supabase.storage.from('assets').upload(path, blob, { contentType: 'text/html' })
    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(path)

    // Save to employee_documents
    await supabase.from('employee_documents').insert({
      profile_id,
      document_type,
      label: label || null,
      version: 1,
      status: 'generated',
      file_url: publicUrl,
      is_current: true,
      metadata: { employee_name, role_title, department, joining_date, signatory, effective_date, notes },
      generated_at: new Date().toISOString(),
    })

    return NextResponse.json({ url: publicUrl, filename })
  } catch (err: any) {
    console.error('PDF generation error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
