"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FileUpload } from "@/components/file-upload"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, PieChart, TrendingUp, Upload } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null)

  const handleUploadComplete = (fileId: string) => {
    setUploadedFileId(fileId)
    // Navigate to dashboard after a short delay
    setTimeout(() => {
      router.push(`/dashboard/${fileId}`)
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <BarChart3 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              DataViz Easy
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform your CSV and Excel files into beautiful, interactive dashboards automatically
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="border-0 shadow-lg bg-white/50 dark:bg-slate-800/50 backdrop-blur">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-lg">Easy Upload</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Simply drag and drop your CSV or Excel files. We handle the rest automatically.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/50 dark:bg-slate-800/50 backdrop-blur">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                <PieChart className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-lg">Smart Charts</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                AI-powered chart suggestions based on your data types and patterns.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/50 dark:bg-slate-800/50 backdrop-blur">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-lg">Interactive Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Explore your data with interactive charts and export them as PNG or PDF.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Upload Section */}
        <div className="max-w-4xl mx-auto">
          <FileUpload onUploadComplete={handleUploadComplete} />
        </div>

        {uploadedFileId && (
          <div className="max-w-4xl mx-auto mt-8">
            <Card className="border-0 shadow-lg bg-white/50 dark:bg-slate-800/50 backdrop-blur">
              <CardContent className="p-6 text-center">
                <div className="animate-pulse">
                  <h3 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-2">
                    File processed successfully!
                  </h3>
                  <p className="text-muted-foreground mb-4">Redirecting to your dashboard...</p>
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
