'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'

export default function PrintPage() {
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('bt_print_html')
    if (!stored) { setError('No document found. Please generate a document from Stock first.'); return }
    sessionStorage.removeItem('bt_print_html')
    setHtml(stored)
  }, [])

  useEffect(() => {
    if (!html) return
    const t = setTimeout(() => window.print(), 600)
    return () => clearTimeout(t)
  }, [html])

  if (error) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',fontFamily:'sans-serif',color:'#666',padding:'40px',textAlign:'center'}}>
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
