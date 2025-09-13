import { useState, useEffect, useMemo, useCallback } from "react"
import type { DataAnalysis, ChartSuggestion } from "@/lib/data-analyzer"

interface SavedChart {
  id: string
  title: string
  type: string
  xColumn: string
  yColumn?: string
  data: any[]
}

interface ChartConfig {
  chartType: string
  xColumn: string
  yColumn?: string
  title: string
}

interface UseDashboardReturn {
  // States
  analysis: DataAnalysis | null
  fileInfo: any
  loading: boolean
  error: string | null
  selectedSuggestion: ChartSuggestion | null
  customChartConfig: ChartConfig | null
  chartData: any[] | null
  savedCharts: SavedChart[]
  isCreatingChart: boolean
  
  // Computed
  currentConfig: ChartConfig | null
  
  // Actions
  handleSelectSuggestion: (suggestion: ChartSuggestion) => void
  handleChartConfigChange: (config: ChartConfig) => void
  handleCreateChart: () => Promise<void>
  clearError: () => void
  retryFetch: () => void
}

export function useDashboard(fileId: string): UseDashboardReturn {
  const [analysis, setAnalysis] = useState<DataAnalysis | null>(null)
  const [fileInfo, setFileInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSuggestion, setSelectedSuggestion] = useState<ChartSuggestion | null>(null)
  const [customChartConfig, setCustomChartConfig] = useState<ChartConfig | null>(null)
  const [chartData, setChartData] = useState<any[] | null>(null)
  const [savedCharts, setSavedCharts] = useState<SavedChart[]>([])
  const [isCreatingChart, setIsCreatingChart] = useState(false)

  // Memoized current config to avoid recalculation
  const currentConfig = useMemo(() => {
    if (customChartConfig) return customChartConfig
    
    if (selectedSuggestion) {
      return {
        chartType: selectedSuggestion.type,
        xColumn: selectedSuggestion.xColumn,
        yColumn: selectedSuggestion.yColumn,
        title: selectedSuggestion.title
      }
    }
    
    return null
  }, [customChartConfig, selectedSuggestion])

  const fetchAnalysis = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      console.log(`🔍 Buscando análise para fileId: ${fileId}`)
      
      const response = await fetch(`/api/analyze-data?fileId=${fileId}`)
      console.log(`📡 Response status: ${response.status}`)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("❌ Erro na resposta:", errorData)
        throw new Error(errorData.error || "Failed to fetch analysis")
      }

      const result = await response.json()
      console.log("✅ Análise recebida:", result)
      
      setAnalysis(result.analysis)
      setFileInfo(result.file)

      // Auto-select first suggestion
      if (result.analysis.suggestedCharts.length > 0) {
        setSelectedSuggestion(result.analysis.suggestedCharts[0])
      }
    } catch (err) {
      console.error("❌ Erro ao buscar análise:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [fileId])

  const handleSelectSuggestion = useCallback((suggestion: ChartSuggestion) => {
    setSelectedSuggestion(suggestion)
    setCustomChartConfig(null)
    setChartData(null)
  }, [])

  const handleChartConfigChange = useCallback((config: ChartConfig) => {
    setCustomChartConfig(config)
    setChartData(null)
  }, [])

  const handleCreateChart = useCallback(async () => {
    if (!currentConfig) return

    try {
      setIsCreatingChart(true)
      setError(null)

      const response = await fetch("/api/get-chart-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileId,
          chartType: currentConfig.chartType,
          xColumn: currentConfig.xColumn,
          yColumn: currentConfig.yColumn,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create chart")
      }

      const result = await response.json()
      setChartData(result.data)

      // Save chart to local state
      const newChart: SavedChart = {
        id: crypto.randomUUID(),
        title: currentConfig.title,
        type: currentConfig.chartType,
        xColumn: currentConfig.xColumn,
        yColumn: currentConfig.yColumn,
        data: result.data,
      }
      setSavedCharts((prev) => [...prev, newChart])
    } catch (err) {
      console.error("Error creating chart:", err)
      setError(err instanceof Error ? err.message : "Failed to create chart")
    } finally {
      setIsCreatingChart(false)
    }
  }, [currentConfig, fileId])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const retryFetch = useCallback(() => {
    fetchAnalysis()
  }, [fetchAnalysis])

  useEffect(() => {
    fetchAnalysis()
  }, [fetchAnalysis])

  return {
    // States
    analysis,
    fileInfo,
    loading,
    error,
    selectedSuggestion,
    customChartConfig,
    chartData,
    savedCharts,
    isCreatingChart,
    
    // Computed
    currentConfig,
    
    // Actions
    handleSelectSuggestion,
    handleChartConfigChange,
    handleCreateChart,
    clearError,
    retryFetch
  }
}
