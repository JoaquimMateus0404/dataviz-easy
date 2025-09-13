"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface FileUploadProps {
  onUploadComplete: (fileId: string) => void
}

interface UploadFile {
  file: File
  id: string
  progress: number
  status: "uploading" | "processing" | "completed" | "error"
  error?: string
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  
  // Funcionando sem Supabase para desenvolvimento

  const processFile = async (file: File, fileId: string) => {
    try {
      // Update status to processing
      setUploadFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: "processing", progress: 50 } : f)))

      // Read file content
      const text = await file.text()

      // Send to processing API
      const response = await fetch("/api/process-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileId,
          filename: file.name,
          content: text,
          mimeType: file.type,
          size: file.size,
        }),
      })

      if (!response.ok) {
        // Tentar obter detalhes do erro da resposta
        let errorMessage = "Failed to process file"
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        console.error("API Error Details:", errorMessage)
        throw new Error(errorMessage)
      }

      const result = await response.json()

      // Update status to completed
      setUploadFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: "completed", progress: 100 } : f)))

      onUploadComplete(fileId)
    } catch (error) {
      console.error("Error processing file:", error)
      setUploadFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                status: "error",
                error: error instanceof Error ? error.message : "Unknown error",
              }
            : f,
        ),
      )
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map((file) => ({
      file,
      id: crypto.randomUUID(),
      progress: 0,
      status: "uploading" as const,
    }))

    setUploadFiles((prev) => [...prev, ...newFiles])

    // Process each file
    for (const uploadFile of newFiles) {
      await processFile(uploadFile.file, uploadFile.id)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    multiple: true,
  })

  const removeFile = (fileId: string) => {
    setUploadFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  const getStatusIcon = (status: UploadFile["status"]) => {
    switch (status) {
      case "uploading":
      case "processing":
        return <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />
    }
  }

  const getStatusText = (status: UploadFile["status"]) => {
    switch (status) {
      case "uploading":
        return "Uploading..."
      case "processing":
        return "Processing..."
      case "completed":
        return "Completed"
      case "error":
        return "Error"
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              {isDragActive ? "Drop files here" : "Upload your data files"}
            </h3>
            <p className="text-muted-foreground mb-4">Drag and drop CSV or Excel files, or click to browse</p>
            <Button variant="outline">Choose Files</Button>
          </div>
        </CardContent>
      </Card>

      {uploadFiles.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h4 className="font-semibold mb-4">Upload Progress</h4>
            <div className="space-y-3">
              {uploadFiles.map((uploadFile) => (
                <div key={uploadFile.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <FileSpreadsheet className="w-5 h-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium truncate">{uploadFile.file.name}</p>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(uploadFile.status)}
                        <span className="text-xs text-muted-foreground">{getStatusText(uploadFile.status)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={uploadFile.progress} className="flex-1" />
                      <span className="text-xs text-muted-foreground">{uploadFile.progress}%</span>
                    </div>
                    {uploadFile.error && <p className="text-xs text-red-500 mt-1">{uploadFile.error}</p>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeFile(uploadFile.id)} className="flex-shrink-0">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
