import { type NextRequest, NextResponse } from "next/server"
import { fileStorage } from "../process-file/route"
import { DataAnalyzer, type DataColumn } from "@/lib/data-analyzer"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Analisando dados (modo desenvolvimento)...")

    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get("fileId")

    if (!fileId) {
      return NextResponse.json({ error: "File ID is required" }, { status: 400 })
    }

    // Get data from memory storage
    const fileData = fileStorage.get(fileId)
    
    if (!fileData) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    console.log(`📊 Dados encontrados: ${fileData.columns.length} colunas, ${fileData.rows.length} linhas`)

    // Convert to the format expected by DataAnalyzer
    const columns: DataColumn[] = fileData.columns.map((col) => ({
      name: col.column_name,
      type: col.column_type as "string" | "number" | "date" | "boolean",
      sampleValues: col.sample_values || [],
    }))

    const dataRows = fileData.rows.map((row) => row.data)

    // Generate chart suggestions using DataAnalyzer
    const analysis = DataAnalyzer.analyzeData(columns, dataRows)

    console.log(`💡 Geradas ${analysis.suggestedCharts.length} sugestões de gráficos`)

    return NextResponse.json({
      analysis: {
        columns: analysis.columns,
        rowCount: analysis.rowCount,
        suggestedCharts: analysis.suggestedCharts,
      },
      file: fileData.metadata,
    })
  } catch (error) {
    console.error("❌ Erro ao analisar dados:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}
