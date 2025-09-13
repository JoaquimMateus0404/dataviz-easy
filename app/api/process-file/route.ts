import { type NextRequest, NextResponse } from "next/server"
import { AdvancedDataProcessor } from "@/lib/advanced-data-processor"
import { fileStorage } from "@/lib/file-storage"

interface ProcessFileRequest {
  fileId: string
  filename: string
  content: string
  mimeType: string
  size: number
}

// Function to detect column types with better accuracy
function detectColumnType(values: string[]): "string" | "number" | "date" | "boolean" {
  const nonEmptyValues = values.filter((v) => v && v.trim() !== "")

  if (nonEmptyValues.length === 0) return "string"

  // Check for currency values (R$ format)
  const currencyCount = nonEmptyValues.filter(v => 
    /^R\$\s*[\d,.-]+$/.test(v.trim())
  ).length

  // Check for numeric values (including currency)
  const numberCount = nonEmptyValues.filter((v) => {
    const cleanValue = v.replace(/[R$\s,]/g, '.')
    return !isNaN(Number(cleanValue))
  }).length

  if (numberCount === nonEmptyValues.length || currencyCount > nonEmptyValues.length * 0.8) {
    return "number"
  }

  // Check for dates
  const dateCount = nonEmptyValues.filter((v) => {
    const dateValue = Date.parse(v)
    return !isNaN(dateValue) && v.match(/\d/)
  }).length
  
  if (dateCount === nonEmptyValues.length) return "date"

  // Check for booleans
  const booleanCount = nonEmptyValues.filter((v) => 
    /^(true|false|sim|não|yes|no|1|0)$/i.test(v.trim())
  ).length
  
  if (booleanCount === nonEmptyValues.length) return "boolean"

  return "string"
}

export async function POST(request: NextRequest) {
  try {
    console.log("📁 Iniciando processamento avançado de arquivo...")
    
    const body: ProcessFileRequest = await request.json()
    const { fileId, filename, content, mimeType, size } = body
    
    console.log("📄 Arquivo recebido:", { fileId, filename, mimeType, size })

    const processingLog: string[] = []
    processingLog.push(`Processando: ${filename} (${(size / 1024).toFixed(2)}KB)`)

    // Use the advanced processor
    console.log("🔍 Processamento avançado de dados...")
    const parsedData = AdvancedDataProcessor.processFile(content, filename, mimeType)
    
    processingLog.push(`Detectados: ${parsedData.headers.length} colunas, ${parsedData.rows.length} linhas`)
    processingLog.push(`Início dos dados na linha: ${parsedData.metadata.dataStartRow}`)
    
    if (parsedData.metadata.hasMultipleSheets) {
      processingLog.push(`Arquivo Excel com ${parsedData.sheets?.length} abas`)
    }

    console.log(`📊 Dados processados: ${parsedData.headers.length} colunas, ${parsedData.rows.length} linhas`)

    // Analyze data quality
    const qualityReport = AdvancedDataProcessor.analyzeDataQuality(parsedData.headers, parsedData.rows)
    processingLog.push(`Qualidade dos dados: ${qualityReport.dataCompleteness.toFixed(1)}% completo`)
    
    if (qualityReport.suggestedCleanup.length > 0) {
      processingLog.push(`Sugestões de limpeza: ${qualityReport.suggestedCleanup.join(', ')}`)
    }

    // Analyze columns with enhanced detection
    console.log("🔍 Análise inteligente de tipos de colunas...")
    const columnData = parsedData.headers.map((header, index) => {
      const columnValues = parsedData.rows.map((row) => row[index] || "")
      const columnType = detectColumnType(columnValues)
      const sampleValues = columnValues.slice(0, 5).filter((v) => v && v.trim() !== "")
      
      processingLog.push(`${header}: ${columnType} (${sampleValues.length} amostras)`)

      return {
        file_id: fileId,
        column_name: header,
        column_type: columnType,
        sample_values: sampleValues,
      }
    })

    // Prepare data rows with better structure
    const rowData = parsedData.rows.map((row, index) => {
      const rowObject: Record<string, any> = {}
      parsedData.headers.forEach((header, colIndex) => {
        let value = row[colIndex] || null
        
        // Clean currency values
        if (value && typeof value === 'string' && /^R\$\s*[\d,.-]+$/.test(value)) {
          value = value.replace(/[R$\s]/g, '').replace(',', '.')
        }
        
        rowObject[header] = value
      })

      return {
        file_id: fileId,
        row_index: index,
        data: rowObject,
      }
    })

    // Store enhanced data in memory
    fileStorage.set(fileId, {
      metadata: {
        id: fileId,
        filename: fileId,
        original_name: filename,
        file_size: size,
        mime_type: mimeType,
        status: "completed",
        upload_date: new Date().toISOString(),
        sheets: parsedData.sheets,
        dataStartRow: parsedData.metadata.dataStartRow,
        dataQuality: qualityReport,
        fileType: parsedData.metadata.fileType,
        extractedSections: parsedData.metadata.extractedSections,
        totalRows: parsedData.metadata.totalRows,
        totalColumns: parsedData.metadata.totalColumns,
        hasMultipleSheets: parsedData.metadata.hasMultipleSheets,
        detectedHeaders: parsedData.metadata.detectedHeaders,
      },
      columns: columnData,
      rows: rowData,
      processingLog
    })

    console.log("🎉 Processamento avançado concluído com sucesso!")
    
    return NextResponse.json({
      success: true,
      fileId,
      rowCount: parsedData.rows.length,
      columnCount: parsedData.headers.length,
      dataQuality: qualityReport,
      metadata: parsedData.metadata,
      processingLog: processingLog.slice(-5), // Last 5 log entries
    })
  } catch (error) {
    console.error("❌ Erro no processamento avançado:", error)
    
    if (error instanceof Error) {
      console.error("📝 Mensagem do erro:", error.message)
      console.error("📍 Stack trace:", error.stack)
    }

    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error",
      suggestion: "Verifique se o arquivo está no formato correto (CSV ou Excel)"
    }, { status: 500 })
  }
}

// Export the in-memory storage for other APIs to use
// (Now using singleton from lib/file-storage.ts)
