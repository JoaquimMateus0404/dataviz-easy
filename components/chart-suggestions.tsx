"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BarChart3, LineChart, PieChart, ScanText as Scatter, TrendingUp } from "lucide-react"
import type { ChartSuggestion } from "@/lib/data-analyzer"

interface ChartSuggestionsProps {
  suggestions: ChartSuggestion[]
  onSelectSuggestion: (suggestion: ChartSuggestion) => void
  selectedSuggestion?: ChartSuggestion
}

const chartIcons = {
  bar: BarChart3,
  line: LineChart,
  pie: PieChart,
  scatter: Scatter,
  area: TrendingUp,
}

const chartColors = {
  bar: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  line: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  pie: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  scatter: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  area: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
}

export function ChartSuggestions({ suggestions, onSelectSuggestion, selectedSuggestion }: ChartSuggestionsProps) {
  const [hoveredSuggestion, setHoveredSuggestion] = useState<string | null>(null)

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No chart suggestions available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Suggested Charts</h3>
        <p className="text-sm text-muted-foreground">Based on your data, here are some recommended visualizations</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {suggestions.map((suggestion, index) => {
          const Icon = chartIcons[suggestion.type]
          const isSelected = selectedSuggestion?.title === suggestion.title
          const isHovered = hoveredSuggestion === suggestion.title

          return (
            <Card
              key={index}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                isSelected ? "ring-2 ring-primary shadow-md" : isHovered ? "shadow-sm" : ""
              }`}
              onMouseEnter={() => setHoveredSuggestion(suggestion.title)}
              onMouseLeave={() => setHoveredSuggestion(null)}
              onClick={() => onSelectSuggestion(suggestion)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg ${chartColors[suggestion.type]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {Math.round(suggestion.confidence * 100)}% match
                  </Badge>
                </div>
                <CardTitle className="text-base leading-tight">{suggestion.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm mb-3">{suggestion.description}</CardDescription>
                <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                  <span className="bg-muted px-2 py-1 rounded">X: {suggestion.xColumn}</span>
                  {suggestion.yColumn && <span className="bg-muted px-2 py-1 rounded">Y: {suggestion.yColumn}</span>}
                </div>
                <Button
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  className="w-full mt-3"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectSuggestion(suggestion)
                  }}
                >
                  {isSelected ? "Selected" : "Create Chart"}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
