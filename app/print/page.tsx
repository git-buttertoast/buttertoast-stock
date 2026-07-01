'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useRef, useState } from 'react'

export default function PrintPage() {
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [driveFailed, setDriveFailed] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const printedRef = useRef(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('bt_print_html')
    if (!stored) { setError('No document found. Please generate a document from Stock first.'); return }
    sessionStorage.removeItem('bt_print_html')
    if (sessionStorage.getItem('bt_drive_failed') === '1') {
      setDriveFailed(true)
      sessionStorage.removeItem('bt_drive_failed')
    }
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
    <>
      {driveFailed && (
        <div style={{position:'fixed',top:0,left:0,right:0,zIndex:9999,background:'#fff',
          borderBottom:'1px solid #f0c4bc',boxShadow:'0 1px 6px rgba(0,0,0,0.10)',
          padding:'10px 14px',display:'flex',alignItems:'center',gap:12,
          fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',fontSize:13,color:'#b3261e'}}>
          <span style={{flex:1,lineHeight:1.4}}>This document was generated but could not be saved to Drive. Please download or save it manually.</span>
          <button onClick={()=>setDriveFailed(false)}
            style={{flexShrink:0,border:'1px solid #e6b3aa',background:'#fff',color:'#b3261e',
              borderRadius:6,fontSize:12,fontWeight:600,cursor:'pointer',padding:'4px 10px'}}>Dismiss</button>
        </div>
      )}
      <iframe
        ref={iframeRef}
        srcDoc={html}
        onLoad={handleLoad}
        style={{width:'100%',height:'100vh',border:'none'}}
        title="Document"
      />
    </>
  )
}
