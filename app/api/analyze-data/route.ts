import { type NextRequest, NextResponse } from "next/server"
import { fileStorage } from "@/lib/file-storage"
import { DataAnalyzer, type DataColumn } from "@/lib/data-analyzer"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Analisando dados (modo desenvolvimento)...")

    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get("fileId")

    if (!fileId) {
      return NextResponse.json({ error: "File ID is required" }, { status: 400 })
    }

    console.log(`🔎 Procurando arquivo com ID: ${fileId}`)
    console.log(`📦 Arquivos no storage: ${Array.from(fileStorage.keys()).join(', ')}`)

    // Get data from memory storage
    const fileData = fileStorage.get(fileId)
    
    if (!fileData) {
      console.log(`❌ Arquivo não encontrado no storage. IDs disponíveis: [${Array.from(fileStorage.keys()).join(', ')}]`)
      return NextResponse.json({ 
        error: "File not found", 
        availableFiles: Array.from(fileStorage.keys()),
        requestedFile: fileId 
      }, { status: 404 })
    }

    console.log(`📊 Dados encontrados: ${fileData.columns.length} colunas, ${fileData.rows.length} linhas`)
    console.log(`🏗️ Tipo de estrutura: ${fileData.metadata.fileType}`)

    // Convert to the format expected by DataAnalyzer
    const columns: DataColumn[] = fileData.columns.map((col) => ({
      name: col.column_name,
      type: col.column_type as "string" | "number" | "date" | "boolean",
      sampleValues: col.sample_values ?? [],
    }))

    const dataRows = fileData.rows.map((row) => row.data)

    // Choose analysis method based on file type
    let analysis
    switch (fileData.metadata.fileType) {
      case 'budget_layout':
        analysis = DataAnalyzer.analyzeBudgetData(dataRows, fileData.metadata.fileType)
        break
      case 'expense_report':
        analysis = DataAnalyzer.analyzeExpenseReport(dataRows)
        break
      default:
        analysis = DataAnalyzer.analyzeData(columns, dataRows)
    }

    console.log(`💡 Geradas ${analysis.suggestedCharts.length} sugestões de gráficos`)
    console.log(`🔍 Insights gerados: ${analysis.insights.length}`)

    return NextResponse.json({
      analysis: {
        columns: analysis.columns,
        rowCount: analysis.rowCount,
        suggestedCharts: analysis.suggestedCharts,
        dataQuality: analysis.dataQuality,
        insights: analysis.insights,
      },
      file: {
        ...fileData.metadata,
        extractedSections: fileData.metadata.extractedSections
      },
    })
  } catch (error) {
    console.error("❌ Erro ao analisar dados:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}
