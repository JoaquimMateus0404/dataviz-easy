import { type NextRequest, NextResponse } from "next/server"
import { fileStorage } from "../process-file/route"
import { DataAnalyzer } from "@/lib/data-analyzer"

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

    // Use DataAnalyzer to format the data
    const analyzer = new DataAnalyzer(fileData.columns, dataRows)
    const chartData = analyzer.getChartData(chartType, xColumn, yColumn, aggregateFunction)

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
