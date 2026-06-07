import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DRIVE_URL = 'https://script.google.com/macros/s/AKfycbyVbz5RdpIuwkkyqrvccttilVhxKB71BXWblIC7jrLa4k8G6pqJLMSVWzdE11iq17yvaA/exec'

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
  const prefix: Record<string,string> = {
    appointment_letter: 'APT', appraisal: 'APR', probation_confirmation: 'PRB',
    salary_revision: 'SAL', experience_letter: 'EXP', internship_completion: 'INT',
    relieving_letter: 'REL', freelance_agreement: 'FRE', warning_letter: 'WRN',
  }
  return `BT/${prefix[type] || 'DOC'}/${year}/${name.split(' ')[0].toUpperCase()}`
}

function generateHTML(params: {
  document_type: string; employee_name: string; role_title: string; department: string
  joining_date: string; signatory: string; effective_date: string; notes: string
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

  const docTitles: Record<string,string> = {
    appointment_letter: 'Appointment Letter', freelance_agreement: 'Freelance Agreement',
    appraisal: 'Appraisal Letter', probation_confirmation: 'Confirmation of Employment',
    salary_revision: 'Salary Revision Letter', experience_letter: 'Experience Letter',
    internship_completion: 'Internship Completion Certificate', relieving_letter: 'Relieving Letter',
    warning_letter: 'Warning Letter',
  }
  const docTitle = docTitles[document_type] || 'Letter'

  const bodyContent: Record<string,string> = {
    appointment_letter: `<p>Dear <strong>${employee_name}</strong>,</p><p>We are pleased to confirm your appointment as <strong>${role_title}</strong>${department ? ` in the ${department} department` : ''} at ${settings.company}.</p><table><tr><td>Designation</td><td>${role_title}</td></tr>${department ? `<tr><td>Department</td><td>${department}</td></tr>` : ''}<tr><td>Date of Joining</td><td>${joiningStr}</td></tr><tr><td>Nature of Employment</td><td>Permanent</td></tr></table><p>Your appointment is subject to maintaining confidentiality, compliance with company HR policies, and satisfactory verification of your documents.${notes ? ' ' + notes : ''}</p><p>We look forward to a long and mutually beneficial association.</p>`,
    freelance_agreement: `<p>Dear <strong>${employee_name}</strong>,</p><p>This letter confirms your engagement as a <strong>Freelancer / Consultant</strong>${role_title ? ` in the capacity of ${role_title}` : ''} with ${settings.company}, effective ${dateStr}.</p><ul><li>All work produced remains the intellectual property of ${settings.company}.</li><li>You agree to maintain confidentiality of all client and company information.</li><li>Payments will be made as per the agreed rate card upon submission of invoices.</li><li>Either party may terminate this agreement with reasonable notice.</li>${notes ? `<li>${notes}</li>` : ''}</ul><p>Please sign and return a copy as confirmation of acceptance.</p>`,
    appraisal: `<p>Dear <strong>${employee_name}</strong>,</p><p>Following your performance appraisal, the management has decided to revise your compensation effective <strong>${dateStr}</strong>. This revision recognises your contributions and performance at ${settings.company}.${notes ? '</p><p>' + notes : ''}</p><p>Please treat this letter as confidential.</p>`,
    probation_confirmation: `<p>Dear <strong>${employee_name}</strong>,</p><p>We are pleased to inform you that your employment as <strong>${role_title}</strong> at ${settings.company} has been confirmed effective <strong>${dateStr}</strong> upon satisfactory completion of your probation period.${notes ? '</p><p>' + notes : ''}</p><p>We wish you continued success in your role.</p>`,
    salary_revision: `<p>Dear <strong>${employee_name}</strong>,</p><p>Your compensation has been revised effective <strong>${dateStr}</strong>.${notes ? '</p><p>' + notes : ''}</p><p>We appreciate your contributions to the team. Please treat this letter as strictly confidential.</p>`,
    experience_letter: `<p>To Whomsoever It May Concern,</p><p>This is to certify that <strong>${employee_name}</strong> ${joining_date ? `has been associated with ${settings.company} since <strong>${joiningStr}</strong>` : `is associated with ${settings.company}`} as <strong>${role_title}</strong>${department ? ` in the ${department} department` : ''}. During their association, ${employee_name.split(' ')[0]} has demonstrated professionalism and dedication.${notes ? '</p><p>' + notes : ''}</p><p>This letter is issued upon request and is valid as on date.</p>`,
    internship_completion: `<p>To Whomsoever It May Concern,</p><p>This is to certify that <strong>${employee_name}</strong> has successfully completed an internship with <strong>${settings.company}</strong>${role_title ? ` as ${role_title}` : ''}${department ? ` in the ${department} department` : ''}.${joining_date ? ` The internship was undertaken from <strong>${joiningStr}</strong> to <strong>${dateStr}</strong>.` : ''}</p><p>${employee_name.split(' ')[0]} demonstrated enthusiasm and professionalism. We wish them the best in their future endeavours.${notes ? '</p><p>' + notes : ''}</p>`,
    relieving_letter: `<p>Dear <strong>${employee_name}</strong>,</p><p>This confirms that <strong>${employee_name}</strong>, ${role_title}${department ? ` - ${department}` : ''}, has been relieved from the services of ${settings.company} effective <strong>${dateStr}</strong>. All dues and formalities have been cleared.${notes ? '</p><p>' + notes : ''}</p><p>We wish them the very best in their future endeavours.</p>`,
    warning_letter: `<p>Dear <strong>${employee_name}</strong>,</p><p>This letter serves as a formal warning regarding the following matter:</p>${notes ? `<p>${notes}</p>` : '<p>[Details of the warning to be specified]</p>'}<p>We expect immediate improvement and adherence to company policies. This letter will be placed on record. Repetition may result in further disciplinary action.</p><p>Please acknowledge receipt by signing below.</p>`,
  }

  const body = bodyContent[document_type] || `<p>Dear <strong>${employee_name}</strong>,</p><p>${notes || 'Please find the details as discussed.'}</p>`
  const needsSign = ['appointment_letter','freelance_agreement','warning_letter'].includes(document_type)

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>@page{size:A4;margin:0;}*{box-sizing:border-box;}body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;font-size:12px;line-height:1.8;color:#1a1a1a;background:#fff;}.page{width:210mm;min-height:297mm;position:relative;background:url('${lh}') no-repeat top left/210mm auto;background-color:#fff;}.content{position:absolute;top:${settings.top}mm;left:${settings.left}mm;right:${settings.right}mm;bottom:${settings.bottom}mm;}.meta{font-size:11px;color:#555;margin-bottom:20px;}.meta div{margin-bottom:2px;}h2{font-size:13px;font-weight:700;margin:0 0 18px;text-decoration:underline;text-underline-offset:3px;}p{margin:0 0 13px;font-size:12px;}strong{font-weight:600;}ul{margin:0 0 13px;padding-left:18px;}li{margin-bottom:5px;font-size:12px;}table{width:100%;border-collapse:collapse;margin:12px 0 16px;}td{padding:7px 10px;border:1px solid #ddd;font-size:11.5px;vertical-align:top;}td:first-child{width:38%;font-weight:600;background:#f8f8f8;}.sig-block{margin-top:44px;}.sig-img{height:46px;display:block;margin-bottom:3px;}.sig-name{font-weight:700;font-size:12px;}.sig-desig{font-size:11px;color:#555;}.accept-block{margin-top:48px;border-top:1px solid #ddd;padding-top:14px;}.accept-line{display:flex;gap:40px;font-size:11px;color:#555;}.sign-line{border-bottom:1px solid #999;width:180px;height:32px;}</style></head><body><div class="page"><div class="content"><div class="meta"><div>Date: ${dateStr}</div><div>Ref: ${ref}</div></div><h2>${docTitle}</h2>${body}<div class="sig-block"><p style="margin-bottom:8px;">Sincerely,</p><img class="sig-img" src="${sigUrl}" alt=""/><div class="sig-name">${sigName}</div><div class="sig-desig">${sigDesig}, ${settings.company}</div></div>${needsSign ? `<div class="accept-block"><p style="font-size:11px;color:#555;margin-bottom:12px;">Acknowledged and accepted by:</p><div class="accept-line"><div><div class="sign-line"></div><div style="margin-top:4px;">${employee_name}</div></div><div><div class="sign-line"></div><div style="margin-top:4px;">Date</div></div></div></div>` : ''}</div></div></body></html>`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { document_type, profile_id, employee_name, role_title, department, joining_date, signatory, effective_date, notes, label, drive_folder_id } = body

    // Load settings
    const { data: settingsData } = await supabase.from('stock_settings').select('key,value')
    const s: Record<string,string> = {}
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
    const b64 = Buffer.from(html, 'utf-8').toString('base64')
    const filename = `${document_type.replace(/_/g,'-')}-${employee_name.replace(/\s+/g,'-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.html`

    // Upload to Drive if folder ID provided, otherwise return HTML for download
    let driveLink: string | null = null
    if (drive_folder_id) {
      try {
        const driveRes = await fetch(DRIVE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'upload_file', folderId: drive_folder_id, fileName: filename, base64: b64, mimeType: 'text/html' })
        })
        const driveData = await driveRes.json()
        if (driveData?.fileLink) driveLink = driveData.fileLink
      } catch (e) {
        console.error('Drive upload failed:', e)
      }
    }

    // Save to employee_documents
    await supabase.from('employee_documents').insert({
      profile_id,
      document_type,
      label: label || null,
      version: 1,
      status: 'generated',
      file_url: driveLink,
      is_current: true,
      metadata: { employee_name, role_title, department, joining_date, signatory, effective_date, notes, drive_folder_id },
      generated_at: new Date().toISOString(),
    })

    // Return HTML for browser download (user prints to PDF)
    return NextResponse.json({ html: `data:text/html;base64,${b64}`, filename, driveLink })
  } catch (err: any) {
    console.error('Generate error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
