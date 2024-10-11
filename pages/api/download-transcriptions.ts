import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import JSZip from 'jszip'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { userId } = req.query

  try {
    const { data: transcriptions, error } = await supabase
      .from('transcriptions')
      .select('transcription_text, audiofiles(file_url)')
      .eq('user_id', userId)

    if (error) throw error

    const zip = new JSZip()
    
    transcriptions.forEach((transcription, index) => {
      const fileName = `transcription_${index + 1}.txt`
      zip.file(fileName, transcription.transcription_text)
    })
    
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" })

    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', 'attachment; filename=transcriptions.zip')
    res.send(zipBuffer)
  } catch (error) {
    console.error('Download error:', error)
    res.status(500).json({ success: false, error: 'An error occurred while downloading transcriptions' })
  }
}