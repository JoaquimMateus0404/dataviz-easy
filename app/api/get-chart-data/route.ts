import { type NextRequest, NextResponse } from "next/server"
import { fileStorage } from "../process-file/route"

export async function POST(request: NextRequest) {
  try {
    console.log("📊 Obtendo dados para gráfico (modo desenvolvimento)...")

    const body = await request.json()
    const { fileId, chartType, xColumn, yColumn, aggregateFunction = "sum" } = body

    if (!fileId || !chartType || !xColumn) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Get data from memory storage
    const fileData = fileStorage.get(fileId)
    
    if (!fileData) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    console.log(`📈 Gerando gráfico: ${chartType}, X: ${xColumn}, Y: ${yColumn}`)

    // Get all data rows
    const dataRows = fileData.rows.map((row) => row.data)

    // Simple chart data formatting
    let chartData: any[] = []

    if (chartType === "pie") {
      // For pie charts, count occurrences of each value in xColumn
      const counts: Record<string, number> = {}
      dataRows.forEach((row) => {
        const value = row[xColumn]
        if (value) {
          counts[value] = (counts[value] || 0) + 1
        }
      })
      
      chartData = Object.entries(counts).map(([name, value]) => ({
        name,
        value,
      }))
    } else if (chartType === "bar" && yColumn) {
      // For bar charts, group by xColumn and aggregate yColumn
      const groups: Record<string, number[]> = {}
      dataRows.forEach((row) => {
        const x = row[xColumn]
        const y = parseFloat(row[yColumn]) || 0
        if (x) {
          if (!groups[x]) groups[x] = []
          groups[x].push(y)
        }
      })

      chartData = Object.entries(groups).map(([name, values]) => {
        let aggregatedValue: number
        if (aggregateFunction === "sum") {
          aggregatedValue = values.reduce((a, b) => a + b, 0)
        } else if (aggregateFunction === "avg") {
          aggregatedValue = values.reduce((a, b) => a + b, 0) / values.length
        } else {
          aggregatedValue = values.length
        }
        
        return {
          name,
          value: aggregatedValue,
          [yColumn]: aggregatedValue,
        }
      })
    } else if (chartType === "line" && yColumn) {
      // For line charts, preserve order and use individual data points
      chartData = dataRows.map((row) => ({
        name: row[xColumn],
        value: parseFloat(row[yColumn]) || 0,
        [xColumn]: row[xColumn],
        [yColumn]: parseFloat(row[yColumn]) || 0,
      }))
    } else if (chartType === "scatter" && yColumn) {
      // For scatter plots, use x and y coordinates
      chartData = dataRows.map((row) => ({
        x: parseFloat(row[xColumn]) || 0,
        y: parseFloat(row[yColumn]) || 0,
        [xColumn]: parseFloat(row[xColumn]) || 0,
        [yColumn]: parseFloat(row[yColumn]) || 0,
      }))
    } else {
      // Default: simple count by xColumn
      const counts: Record<string, number> = {}
      dataRows.forEach((row) => {
        const value = row[xColumn]
        if (value) {
          counts[value] = (counts[value] || 0) + 1
        }
      })
      
      chartData = Object.entries(counts).map(([name, value]) => ({
        name,
        value,
      }))
    }

    console.log(`✅ Dados do gráfico gerados: ${chartData.length} pontos`)

    return NextResponse.json({
      success: true,
      data: chartData,
      chartType,
      xColumn,
      yColumn,
    })
  } catch (error) {
    console.error("❌ Erro ao obter dados do gráfico:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}
