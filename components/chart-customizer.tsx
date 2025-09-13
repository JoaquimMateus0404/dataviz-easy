"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import type { ChartSuggestion, DataColumn } from "@/lib/data-analyzer"

interface ChartCustomizerProps {
  suggestion: ChartSuggestion
  columns: DataColumn[]
  onCustomize: (customizedSuggestion: ChartSuggestion) => void
  onCreateChart: () => void
}

export function ChartCustomizer({ suggestion, columns, onCustomize, onCreateChart }: ChartCustomizerProps) {
  const [title, setTitle] = useState(suggestion.title)
  const [xColumn, setXColumn] = useState(suggestion.xColumn)
  const [yColumn, setYColumn] = useState(suggestion.yColumn || "")
  const [chartType, setChartType] = useState(suggestion.type)

  const handleCustomize = () => {
    const customizedSuggestion: ChartSuggestion = {
      ...suggestion,
      title,
      xColumn,
      yColumn: yColumn || undefined,
      type: chartType,
    }
    onCustomize(customizedSuggestion)
  }

  const categoricalColumns = columns.filter((col) => col.type === "string" || col.type === "boolean")

  const numericColumns = columns.filter((col) => col.type === "number")

  const dateColumns = columns.filter((col) => col.type === "date")

  const getAvailableXColumns = () => {
    switch (chartType) {
      case "pie":
        return categoricalColumns
      case "line":
      case "area":
        return [...dateColumns, ...categoricalColumns]
      case "scatter":
        return numericColumns
      default:
        return [...categoricalColumns, ...dateColumns]
    }
  }

  const getAvailableYColumns = () => {
    switch (chartType) {
      case "pie":
        return [] // Pie charts don't need Y column
      case "scatter":
        return numericColumns.filter((col) => col.name !== xColumn)
      default:
        return numericColumns
    }
  }

  const needsYColumn = chartType !== "pie"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Customize Chart</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="chart-title">Chart Title</Label>
          <Input
            id="chart-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter chart title"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="chart-type">Chart Type</Label>
          <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bar">Bar Chart</SelectItem>
              <SelectItem value="line">Line Chart</SelectItem>
              <SelectItem value="pie">Pie Chart</SelectItem>
              <SelectItem value="scatter">Scatter Plot</SelectItem>
              <SelectItem value="area">Area Chart</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="x-column">X-Axis Column</Label>
          <Select value={xColumn} onValueChange={setXColumn}>
            <SelectTrigger>
              <SelectValue placeholder="Select X column" />
            </SelectTrigger>
            <SelectContent>
              {getAvailableXColumns().map((column) => (
                <SelectItem key={column.name} value={column.name}>
                  {column.name} ({column.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {needsYColumn && (
          <div className="space-y-2">
            <Label htmlFor="y-column">Y-Axis Column</Label>
            <Select value={yColumn} onValueChange={setYColumn}>
              <SelectTrigger>
                <SelectValue placeholder="Select Y column" />
              </SelectTrigger>
              <SelectContent>
                {getAvailableYColumns().map((column) => (
                  <SelectItem key={column.name} value={column.name}>
                    {column.name} ({column.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Separator />

        <div className="flex gap-2">
          <Button onClick={handleCustomize} variant="outline" className="flex-1 bg-transparent">
            Apply Changes
          </Button>
          <Button onClick={onCreateChart} className="flex-1">
            Create Chart
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
