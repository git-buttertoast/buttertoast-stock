'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useRef, useState } from 'react'

export default function PrintPage() {
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const printedRef = useRef(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('bt_print_html')
    if (!stored) { setError('No document found. Please generate a document from Stock first.'); return }
    sessionStorage.removeItem('bt_print_html')
    setHtml(stored)
  }, [])

  // Print the iframe's OWN document so its @page A4 size and page-breaks apply
  // and multi-page letters paginate correctly (printing the parent window clips
  // the iframe to one screen).
  function handleLoad() {
    if (printedRef.current) return
    const w = iframeRef.current?.contentWindow
    if (!w) return
    printedRef.current = true
    setTimeout(() => {
      try { w.focus(); w.print() } catch { window.print() }
    }, 300)
  }

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
      ref={iframeRef}
      srcDoc={html}
      onLoad={handleLoad}
      style={{width:'100%',height:'100vh',border:'none'}}
      title="Document"
    />
  )
}
