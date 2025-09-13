export interface DataColumn {
  name: string
  type: "string" | "number" | "date" | "boolean"
  sampleValues: any[]
  uniqueValues?: number
  nullCount?: number
  min?: number
  max?: number
  avg?: number
  isKey?: boolean
  pattern?: string
}

export inter      suggestions.push({
        type: "area",
        title: `Trends over time`,
        xColumn: dateCol.name,
        yColumn: numericColumns[0].name,
        description: `Show trends and patterns over time with filled areas`,
        confidence: 0.8,
        reasoning: `Area charts work well for showing cumulative trends over time`,
      })aAnalysis {
  columns: DataColumn[]
  rowCount: number
  suggestedCharts: ChartSuggestion[]
  dataQuality: {
    completeness: number
    consistency: number
    suggestions: string[]
  }
  insights: string[]
}

export interface ChartSuggestion {
  type: "bar" | "line" | "pie" | "scatter" | "area"
  title: string
  xColumn: string
  yColumn?: string
  description: string
  confidence: number
  reasoning: string
}

export class DataAnalyzer {
  static analyzeData(columns: DataColumn[], rows: Record<string, any>[]): DataAnalysis {
    const enhancedColumns = columns.map((col) => this.analyzeColumn(col, rows))
    const suggestedCharts = this.generateChartSuggestions(enhancedColumns, rows)
    const dataQuality = this.assessDataQuality(enhancedColumns, rows)
    const insights = this.generateInsights(enhancedColumns, rows)

    return {
      columns: enhancedColumns,
      rowCount: rows.length,
      suggestedCharts,
      dataQuality,
      insights,
    }
  }

  private static analyzeColumn(column: DataColumn, rows: Record<string, any>[]): DataColumn {
    const values = rows.map((row) => row[column.name]).filter((v) => v !== null && v !== undefined && v !== "")
    const uniqueValues = new Set(values).size
    const nullCount = rows.length - values.length

    const enhanced: DataColumn = {
      ...column,
      uniqueValues,
      nullCount,
    }

    // Detect if column might be a key/ID
    if (uniqueValues === values.length && values.length > 0) {
      enhanced.isKey = true
    }

    if (column.type === "number") {
      const numericValues = values.map((v) => Number(v)).filter((v) => !isNaN(v))
      if (numericValues.length > 0) {
        enhanced.min = Math.min(...numericValues)
        enhanced.max = Math.max(...numericValues)
        enhanced.avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length
      }
    }

    // Detect patterns
    if (column.type === "string" && values.length > 0) {
      const commonPatterns = this.detectPatterns(values.map(v => v.toString()))
      if (commonPatterns) {
        enhanced.pattern = commonPatterns
      }
    }

    return enhanced
  }

  private static detectPatterns(values: string[]): string | undefined {
    if (values.length === 0) return undefined

    // Common patterns
    const patterns = [
      { name: 'email', regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      { name: 'phone', regex: /^\+?[\d\s\-\(\)]+$/ },
      { name: 'currency', regex: /^R\$\s*[\d,.-]+$/ },
      { name: 'date', regex: /^\d{1,2}\/\d{1,2}\/\d{2,4}$/ },
      { name: 'code', regex: /^[A-Z]{2,}\d+$/ },
    ]

    for (const pattern of patterns) {
      const matches = values.filter(v => pattern.regex.test(v)).length
      if (matches / values.length > 0.8) {
        return pattern.name
      }
    }

    return undefined
  }

  private static assessDataQuality(columns: DataColumn[], rows: Record<string, any>[]): {
    completeness: number
    consistency: number
    suggestions: string[]
  } {
    const totalCells = columns.length * rows.length
    const filledCells = columns.reduce((acc, col) => {
      return acc + rows.filter(row => {
        const value = row[col.name]
        return value !== null && value !== undefined && value !== ""
      }).length
    }, 0)

    const completeness = totalCells > 0 ? (filledCells / totalCells) * 100 : 0

    // Check consistency
    const inconsistentColumns = columns.filter(col => {
      const nullPercentage = ((col.nullCount || 0) / rows.length) * 100
      return nullPercentage > 20
    }).length

    const consistency = columns.length > 0 ? ((columns.length - inconsistentColumns) / columns.length) * 100 : 100

    const suggestions: string[] = []
    
    if (completeness < 70) {
      suggestions.push("Dados incompletos - considere verificar células vazias")
    }
    
    if (consistency < 80) {
      suggestions.push("Algumas colunas têm muitos valores vazios")
    }

    columns.forEach(col => {
      if (col.isKey && (col.uniqueValues || 0) !== rows.length) {
        suggestions.push(`Coluna "${col.name}" pode ter valores duplicados`)
      }
    })

    return { completeness, consistency, suggestions }
  }

  private static generateInsights(columns: DataColumn[], rows: Record<string, any>[]): string[] {
    const insights: string[] = []

    // Identify key columns
    const keyColumns = columns.filter(col => col.isKey)
    if (keyColumns.length > 0) {
      insights.push(`Identificadas ${keyColumns.length} coluna(s) chave: ${keyColumns.map(c => c.name).join(', ')}`)
    }

    // Numeric insights
    const numericColumns = columns.filter(col => col.type === "number")
    numericColumns.forEach(col => {
      if (col.min !== undefined && col.max !== undefined && col.avg !== undefined) {
        insights.push(`${col.name}: Variação de ${col.min.toLocaleString()} a ${col.max.toLocaleString()}, média ${col.avg.toLocaleString()}`)
      }
    })

    // Categorical insights
    const categoricalColumns = columns.filter(col => col.type === "string" && !col.isKey)
    categoricalColumns.forEach(col => {
      if ((col.uniqueValues || 0) <= 10) {
        insights.push(`${col.name}: ${col.uniqueValues} categorias distintas - ideal para gráficos de pizza ou barras`)
      } else if ((col.uniqueValues || 0) > rows.length * 0.8) {
        insights.push(`${col.name}: Muitas categorias únicas - pode ser melhor como filtro`)
      }
    })

    return insights
  }

  private static generateChartSuggestions(columns: DataColumn[], rows: Record<string, any>[]): ChartSuggestion[] {
    const suggestions: ChartSuggestion[] = []

    const numericColumns = columns.filter((col) => col.type === "number")
    const categoricalColumns = columns.filter(
      (col) => col.type === "string" && (col.uniqueValues || 0) < rows.length * 0.5,
    )
    const dateColumns = columns.filter((col) => col.type === "date")

    // Bar charts for categorical vs numeric
    categoricalColumns.forEach((catCol) => {
      numericColumns.forEach((numCol) => {
        if ((catCol.uniqueValues || 0) <= 20) {
          // Reasonable number of categories
          suggestions.push({
            type: "bar",
            title: `${numCol.name} by ${catCol.name}`,
            xColumn: catCol.name,
            yColumn: numCol.name,
            description: `Compare ${numCol.name} across different ${catCol.name} categories`,
            confidence: 0.8,
            reasoning: `${catCol.name} has ${catCol.uniqueValues} distinct categories, suitable for comparison with ${numCol.name}`,
          })
        }
      })
    })

    // Pie charts for categorical data with reasonable number of categories
    categoricalColumns.forEach((catCol) => {
      if ((catCol.uniqueValues || 0) <= 10 && (catCol.uniqueValues || 0) >= 2) {
        suggestions.push({
          type: "pie",
          title: `Distribution of ${catCol.name}`,
          xColumn: catCol.name,
          description: `Show the distribution of different ${catCol.name} values`,
          confidence: 0.7,
          reasoning: `${catCol.name} has ${catCol.uniqueValues} categories, ideal for showing proportions`,
        })
      }
    })

    // Line charts for time series data
    if (dateColumns.length > 0) {
      const dateCol = dateColumns[0]
      numericColumns.forEach((numCol) => {
        suggestions.push({
          type: "line",
          title: `${numCol.name} over time`,
          xColumn: dateCol.name,
          yColumn: numCol.name,
          description: `Track how ${numCol.name} changes over time`,
          confidence: 0.9,
          reasoning: `Time series data with ${dateCol.name} and numeric ${numCol.name}`,
        })
      })
    }

    // Scatter plots for numeric vs numeric
    for (let i = 0; i < numericColumns.length; i++) {
      for (let j = i + 1; j < numericColumns.length; j++) {
        const col1 = numericColumns[i]
        const col2 = numericColumns[j]
        suggestions.push({
          type: "scatter",
          title: `${col1.name} vs ${col2.name}`,
          xColumn: col1.name,
          yColumn: col2.name,
          description: `Explore the relationship between ${col1.name} and ${col2.name}`,
          confidence: 0.6,
          reasoning: `Both ${col1.name} and ${col2.name} are numeric, suitable for correlation analysis`,
        })
      }
    }

    // Area charts for time series with multiple metrics
    if (dateColumns.length > 0 && numericColumns.length > 1) {
      const dateCol = dateColumns[0]
      suggestions.push({
        type: "area",
        title: `Trends over time`,
        xColumn: dateCol.name,
        yColumn: numericColumns[0].name,
        description: `Show trends and patterns over time`,
        confidence: 0.7,
      })
    }

    // Sort by confidence and return top suggestions
    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 6) // Limit to top 6 suggestions
  }

  static aggregateData(
    rows: Record<string, any>[],
    groupBy: string,
    aggregateColumn: string,
    aggregateFunction: "sum" | "avg" | "count" | "min" | "max" = "sum",
  ): Record<string, any>[] {
    const groups = new Map<string, any[]>()

    // Group data
    rows.forEach((row) => {
      const key = String(row[groupBy] || "Unknown")
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(row)
    })

    // Aggregate each group
    const result: Record<string, any>[] = []
    groups.forEach((groupRows, key) => {
      const aggregatedRow: Record<string, any> = { [groupBy]: key }

      if (aggregateFunction === "count") {
        aggregatedRow[aggregateColumn] = groupRows.length
      } else {
        const values = groupRows.map((row) => Number(row[aggregateColumn])).filter((v) => !isNaN(v))

        if (values.length > 0) {
          switch (aggregateFunction) {
            case "sum":
              aggregatedRow[aggregateColumn] = values.reduce((a, b) => a + b, 0)
              break
            case "avg":
              aggregatedRow[aggregateColumn] = values.reduce((a, b) => a + b, 0) / values.length
              break
            case "min":
              aggregatedRow[aggregateColumn] = Math.min(...values)
              break
            case "max":
              aggregatedRow[aggregateColumn] = Math.max(...values)
              break
          }
        } else {
          aggregatedRow[aggregateColumn] = 0
        }
      }

      result.push(aggregatedRow)
    })

    return result.sort((a, b) => {
      const aVal = a[groupBy]
      const bVal = b[groupBy]
      return String(aVal).localeCompare(String(bVal))
    })
  }

  static filterData(
    rows: Record<string, any>[],
    filters: Array<{
      column: string
      operator: "equals" | "contains" | "greater" | "less" | "between"
      value: any
      value2?: any
    }>,
  ): Record<string, any>[] {
    return rows.filter((row) => {
      return filters.every((filter) => {
        const cellValue = row[filter.column]

        switch (filter.operator) {
          case "equals":
            return cellValue === filter.value
          case "contains":
            return String(cellValue).toLowerCase().includes(String(filter.value).toLowerCase())
          case "greater":
            return Number(cellValue) > Number(filter.value)
          case "less":
            return Number(cellValue) < Number(filter.value)
          case "between":
            return Number(cellValue) >= Number(filter.value) && Number(cellValue) <= Number(filter.value2)
          default:
            return true
        }
      })
    })
  }
}
