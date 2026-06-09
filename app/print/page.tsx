'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function PrintPageInner() {
  const searchParams = useSearchParams()
  const jobId = searchParams.get('job')
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!jobId) { setError('No job ID provided.'); return }
    supabase
      .from('stock_print_jobs')
      .select('html')
      .eq('id', jobId)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) { setError('Document not found or expired.'); return }
        setHtml(data.html)
      })
  }, [jobId])

  useEffect(() => {
    if (!html) return
    // Small delay to ensure iframe has rendered
    const t = setTimeout(() => window.print(), 800)
    return () => clearTimeout(t)
  }, [html])

  if (error) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',fontFamily:'sans-serif',color:'#666'}}>
      <p>{error}</p>
    </div>
  )
  if (!html) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',fontFamily:'sans-serif',color:'#666'}}>
      <p>Preparing document...</p>
    </div>
  )

  return (
    <iframe
      srcDoc={html}
      style={{width:'100%',height:'100vh',border:'none'}}
      title="Document"
    />
  )
}

export default function PrintPage() {
  return (
    <Suspense fallback={
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',fontFamily:'sans-serif',color:'#666'}}>
        <p>Loading...</p>
      </div>
    }>
      <PrintPageInner />
    </Suspense>
  )
}
