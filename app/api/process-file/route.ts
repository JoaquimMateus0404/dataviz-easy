import { type NextRequest, NextResponse } from "next/server"

interface ProcessFileRequest {
  fileId: string
  filename: string
  content: string
  mimeType: string
  size: number
}

// Function to detect column types
function detectColumnType(values: string[]): "string" | "number" | "date" | "boolean" {
  const nonEmptyValues = values.filter((v) => v && v.trim() !== "")

  if (nonEmptyValues.length === 0) return "string"

  // Check if all values are numbers
  const numberCount = nonEmptyValues.filter((v) => !isNaN(Number(v))).length
  if (numberCount === nonEmptyValues.length) return "number"

  // Check if all values are dates
  const dateCount = nonEmptyValues.filter((v) => !isNaN(Date.parse(v))).length
  if (dateCount === nonEmptyValues.length) return "date"

  // Check if all values are booleans
  const booleanCount = nonEmptyValues.filter((v) => 
    v.toLowerCase() === "true" || v.toLowerCase() === "false" || v === "1" || v === "0"
  ).length
  if (booleanCount === nonEmptyValues.length) return "boolean"

  return "string"
}

// Simple CSV parser
function parseCSV(csvText: string): string[][] {
  const lines = csvText.split("\n")
  const result: string[][] = []

  for (const line of lines) {
    if (line.trim() === "") continue

    // Simple CSV parsing - handles basic quoted fields
    const row: string[] = []
    let current = ""
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"' && (i === 0 || line[i - 1] === ",")) {
        inQuotes = true
      } else if (char === '"' && inQuotes && (i === line.length - 1 || line[i + 1] === ",")) {
        inQuotes = false
      } else if (char === "," && !inQuotes) {
        row.push(current.trim())
        current = ""
      } else {
        current += char
      }
    }

    row.push(current.trim())
    result.push(row)
  }

  return result
}

// Store data in memory for development (in production, this would be in a database)
const fileStorage = new Map<string, {
  metadata: any,
  columns: any[],
  rows: any[]
}>()

export async function POST(request: NextRequest) {
  try {
    console.log("📁 Iniciando processamento de arquivo (modo desenvolvimento)...")
    
    const body: ProcessFileRequest = await request.json()
    const { fileId, filename, content, mimeType, size } = body
    
    console.log("📄 Arquivo recebido:", { fileId, filename, mimeType, size })

    // Parse the file content
    console.log("🔍 Analisando conteúdo do arquivo...")
    let rows: string[][]

    if (mimeType === "text/csv" || filename.endsWith(".csv")) {
      rows = parseCSV(content)
    } else {
      // For Excel files, we would need a library like xlsx
      // For now, assume it's CSV format
      rows = parseCSV(content)
    }

    if (rows.length === 0) {
      throw new Error("No data found in file")
    }

    const headers = rows[0]
    const dataRows = rows.slice(1)
    
    console.log(`📊 Dados processados: ${headers.length} colunas, ${dataRows.length} linhas`)

    // Analyze columns and detect types
    console.log("🔍 Analisando tipos das colunas...")
    const columnData = headers.map((header, index) => {
      const columnValues = dataRows.map((row) => row[index] || "")
      const columnType = detectColumnType(columnValues)
      const sampleValues = columnValues.slice(0, 5).filter((v) => v && v.trim() !== "")

      return {
        file_id: fileId,
        column_name: header,
        column_type: columnType,
        sample_values: sampleValues,
      }
    })

    // Prepare data rows
    const rowData = dataRows.map((row, index) => {
      const rowObject: Record<string, any> = {}
      headers.forEach((header, colIndex) => {
        rowObject[header] = row[colIndex] || null
      })

      return {
        file_id: fileId,
        row_index: index,
        data: rowObject,
      }
    })

    // Store data in memory
    fileStorage.set(fileId, {
      metadata: {
        id: fileId,
        filename: fileId,
        original_name: filename,
        file_size: size,
        mime_type: mimeType,
        status: "completed",
        upload_date: new Date().toISOString(),
      },
      columns: columnData,
      rows: rowData
    })

    console.log("🎉 Processamento concluído com sucesso!")
    return NextResponse.json({
      success: true,
      fileId,
      rowCount: dataRows.length,
      columnCount: headers.length,
    })
  } catch (error) {
    console.error("❌ Erro ao processar arquivo:", error)
    
    if (error instanceof Error) {
      console.error("📝 Mensagem do erro:", error.message)
      console.error("📍 Stack trace:", error.stack)
    }

    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

// Export the in-memory storage for other APIs to use
export { fileStorage }
