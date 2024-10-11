import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import formidable from 'formidable'
import fs from 'fs'
import { OpenAI } from 'openai'

export const config = {
  api: {
    bodyParser: false,
  },
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const form = formidable({
    maxFileSize: 10 * 1024 * 1024, // 10MB max file size
    filter: function ({name, originalFilename, mimetype}) {
      // Keep only audio files
      return !!(mimetype && mimetype.includes("audio"));
    }
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Form parsing error:', err);
      return res.status(500).json({ success: false, error: 'Error parsing form data' })
    }

    const file = Array.isArray(files.file) ? files.file[0] : files.file
    const userId = fields.userId ? (Array.isArray(fields.userId) ? fields.userId[0] : fields.userId as string) : undefined

    if (!file || !file.originalFilename) {
      return res.status(400).json({ success: false, error: "No file uploaded or filename is missing" })
    }

    try {
      const fileContent = await fs.promises.readFile(file.filepath)

      // Upload file to Supabase
      const { data, error } = await supabase.storage
        .from('audio')
        .upload(`${userId}/${file.originalFilename}`, fileContent, {
          contentType: file.mimetype || 'audio/mpeg' // Set the correct MIME type
        })

      if (error) throw error

      // Get public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('audio')
        .getPublicUrl(`${userId}/${file.originalFilename}`)

      // Save audio file info to Supabase
      const { data: audioFileData, error: audioFileError } = await supabase
        .from('audiofiles')
        .insert({ user_id: userId, file_url: publicUrl })
        .select()

      if (audioFileError) throw audioFileError

      // Transcribe the audio file using OpenAI Whisper
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(file.filepath),
        model: 'whisper-1',
      })

      // Save the transcription to Supabase
      const { data: transcriptionData, error: transcriptionError } = await supabase
        .from('transcriptions')
        .insert({
          user_id: userId,
          audio_file_id: audioFileData[0].id,
          transcription_text: transcription.text,
        })

      if (transcriptionError) throw transcriptionError

      res.status(200).json({ success: true, message: 'File uploaded and transcribed successfully' })
    } catch (error) {
      console.error('Upload and transcription error:', error)
      res.status(500).json({ success: false, error: 'An error occurred during upload and transcription' })
    } finally {
      // Clean up the temporary file
      if (file && file.filepath) {
        fs.unlink(file.filepath, (err) => {
          if (err) console.error('Error deleting temporary file:', err)
        })
      }
    }
  })
}