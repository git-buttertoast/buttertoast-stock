import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const html = formData.get('html') as string
  if (!html) return new NextResponse('Missing html', { status: 400 })
  // Inject auto-print script into the HTML before </body>
  const withPrint = html.replace(
    '</body>',
    `<script>window.addEventListener('load', function(){ setTimeout(function(){ window.print() }, 600) })</script></body>`
  )
  return new NextResponse(withPrint, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  })
}
