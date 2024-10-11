'use client'

import React, { useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle2, Upload, Download } from "lucide-react"

export default function TranscriptionInterface({ userId }: { userId: string }) {
  const [files, setFiles] = useState<File[]>([])
  const [transcribing, setTranscribing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [transcriptionComplete, setTranscriptionComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    if (selectedFiles.length > 5) {
      setError("You can only upload up to 5 files at once.")
      return
    }
    setFiles(selectedFiles)
    setError(null)
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      setError("Please select at least one file to transcribe.")
      return
    }

    setTranscribing(true)
    setProgress(0)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        const formData = new FormData()
        formData.append('file', file)
        formData.append('userId', userId)

        const response = await fetch('/api/upload-and-transcribe', {
          method: 'POST',
          body: formData,
          // Make sure not to set Content-Type header here, let the browser set it
        })

        const result = await response.json()

        if (!result.success) throw new Error(result.error)

        setProgress((i + 1) / files.length * 100)
      }

      setTranscriptionComplete(true)
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred during upload and transcription.')
    } finally {
      setTranscribing(false)
    }
  }

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/download-transcriptions?userId=${userId}`)
      
      if (response.headers.get('Content-Type') === 'application/json') {
        const result = await response.json()
        if (!result.success) throw new Error(result.error)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'transcriptions.zip'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Download error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred while downloading transcriptions.')
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Audio Transcription</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="audio/*"
              multiple
              className="hidden"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={transcribing}
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" /> Select Audio Files (Max 5)
            </Button>
          </div>
          {files.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Selected Files:</h3>
              <ul className="list-disc pl-5">
                {files.map((file, index) => (
                  <li key={index}>{file.name}</li>
                ))}
              </ul>
            </div>
          )}
          {error && (
            <div className="flex items-center text-red-500">
              <AlertCircle className="mr-2 h-4 w-4" />
              {error}
            </div>
          )}
          {transcribing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Transcribing...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
          {transcriptionComplete && (
            <div className="flex items-center text-green-500">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Transcription complete!
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={handleUpload} disabled={transcribing || files.length === 0}>
          Start Transcription
        </Button>
        <Button onClick={handleDownload} disabled={!transcriptionComplete}>
          <Download className="mr-2 h-4 w-4" /> Download Transcriptions
        </Button>
      </CardFooter>
    </Card>
  )
}