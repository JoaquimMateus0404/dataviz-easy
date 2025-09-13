"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ChartRenderer } from "@/components/chart-renderer"
import { ChartSuggestions } from "@/components/chart-suggestions"
import { ChartCustomizer } from "@/components/chart-customizer"
import { ArrowLeft, Database, FileSpreadsheet, TrendingUp, Plus } from "lucide-react"
import type { DataAnalysis, ChartSuggestion } from "@/lib/data-analyzer"

interface SavedChart {
  id: string
  title: string
  type: string
  xColumn: string
  yColumn?: string
  data: any[]
}

export default function DashboardPage() {
  const params = useParams()
  const router = useRouter()
  const fileId = params.fileId as string

  const [analysis, setAnalysis] = useState<DataAnalysis | null>(null)
  const [fileInfo, setFileInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSuggestion, setSelectedSuggestion] = useState<ChartSuggestion | null>(null)
  const [customizedSuggestion, setCustomizedSuggestion] = useState<ChartSuggestion | null>(null)
  const [chartData, setChartData] = useState<any[] | null>(null)
  const [savedCharts, setSavedCharts] = useState<SavedChart[]>([])
  const [showCustomizer, setShowCustomizer] = useState(false)

  useEffect(() => {
    fetchAnalysis()
  }, [fileId])

  const fetchAnalysis = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/analyze-data?fileId=${fileId}`)

      if (!response.ok) {
        throw new Error("Failed to fetch analysis")
      }

      const result = await response.json()
      setAnalysis(result.analysis)
      setFileInfo(result.file)

      // Auto-select first suggestion
      if (result.analysis.suggestedCharts.length > 0) {
        setSelectedSuggestion(result.analysis.suggestedCharts[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const handleSelectSuggestion = (suggestion: ChartSuggestion) => {
    setSelectedSuggestion(suggestion)
    setCustomizedSuggestion(null)
    setChartData(null)
    setShowCustomizer(false)
  }

  const handleCustomize = (customized: ChartSuggestion) => {
    setCustomizedSuggestion(customized)
    setChartData(null)
  }

  const handleCreateChart = async () => {
    const suggestion = customizedSuggestion || selectedSuggestion
    if (!suggestion) return

    try {
      const response = await fetch("/api/get-chart-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileId,
          chartType: suggestion.type,
          xColumn: suggestion.xColumn,
          yColumn: suggestion.yColumn,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create chart")
      }

      const result = await response.json()
      setChartData(result.data)

      // Save chart to local state (in a real app, this would be saved to database)
      const newChart: SavedChart = {
        id: crypto.randomUUID(),
        title: suggestion.title,
        type: suggestion.type,
        xColumn: suggestion.xColumn,
        yColumn: suggestion.yColumn,
        data: result.data,
      }
      setSavedCharts((prev) => [...prev, newChart])
    } catch (err) {
      console.error("Error creating chart:", err)
    }
  }

  const currentSuggestion = customizedSuggestion || selectedSuggestion

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-red-500">Error: {error}</p>
              <Button onClick={() => router.push("/")} className="mt-4">
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="sm" onClick={() => router.push("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              {fileInfo?.original_name} • {analysis?.rowCount} rows • {analysis?.columns.length} columns
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Data Info & Suggestions */}
          <div className="lg:col-span-1 space-y-6">
            {/* File Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  File Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Filename:</span>
                  <span className="text-sm font-medium">{fileInfo?.original_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Size:</span>
                  <span className="text-sm font-medium">{(fileInfo?.file_size / 1024).toFixed(1)} KB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant="secondary">{fileInfo?.status}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Data Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Data Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Rows:</span>
                    <span className="text-sm font-medium">{analysis?.rowCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Columns:</span>
                    <span className="text-sm font-medium">{analysis?.columns.length}</span>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Column Types:</h4>
                    {analysis?.columns.map((column) => (
                      <div key={column.name} className="flex justify-between text-xs">
                        <span className="truncate max-w-[120px]">{column.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {column.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chart Customizer */}
            {currentSuggestion && (
              <div className="space-y-4">
                <Button variant="outline" onClick={() => setShowCustomizer(!showCustomizer)} className="w-full">
                  {showCustomizer ? "Hide" : "Show"} Customizer
                </Button>

                {showCustomizer && (
                  <ChartCustomizer
                    suggestion={currentSuggestion}
                    columns={analysis?.columns || []}
                    onCustomize={handleCustomize}
                    onCreateChart={handleCreateChart}
                  />
                )}
              </div>
            )}
          </div>

          {/* Right Column - Charts & Suggestions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Chart Suggestions */}
            {analysis && (
              <ChartSuggestions
                suggestions={analysis.suggestedCharts}
                onSelectSuggestion={handleSelectSuggestion}
                selectedSuggestion={selectedSuggestion}
              />
            )}

            {/* Chart Preview */}
            {currentSuggestion && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Chart Preview
                    </CardTitle>
                    <Button onClick={handleCreateChart} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Chart
                    </Button>
                  </div>
                  <CardDescription>{currentSuggestion.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {chartData ? (
                    <ChartRenderer
                      data={chartData}
                      chartType={currentSuggestion.type}
                      xColumn={currentSuggestion.xColumn}
                      yColumn={currentSuggestion.yColumn}
                      title={currentSuggestion.title}
                      showExport={true}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-64 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                      <div className="text-center">
                        <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">Click "Create Chart" to generate visualization</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Saved Charts */}
            {savedCharts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Saved Charts</CardTitle>
                  <CardDescription>Your generated visualizations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {savedCharts.map((chart) => (
                      <ChartRenderer
                        key={chart.id}
                        data={chart.data}
                        chartType={chart.type as any}
                        xColumn={chart.xColumn}
                        yColumn={chart.yColumn}
                        title={chart.title}
                        className="border"
                        showExport={true}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
