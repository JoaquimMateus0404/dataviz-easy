import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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
    ["true", "false", "1", "0", "yes", "no"].includes(v.toLowerCase()),
  ).length
  if (booleanCount === nonEmptyValues.length) return "boolean"

  return "string"
}

// Function to parse CSV content
function parseCSV(content: string): string[][] {
  const lines = content.split("\n").filter((line) => line.trim())
  return lines.map((line) => {
    const result: string[] = []
    let current = ""
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === "," && !inQuotes) {
        result.push(current.trim())
        current = ""
      } else {
        current += char
      }
    }

    result.push(current.trim())
    return result
  })
}

export async function POST(request: NextRequest) {
  try {
    console.log("📁 Iniciando processamento de arquivo...")
    
    const supabase = await createClient()

    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.warn("⚠️ Supabase não configurado. Processando arquivo sem autenticação.")
      // Continuar sem verificação de autenticação para desenvolvimento
    } else {
      console.log("🔑 Verificando autenticação...")
      // Check if user is authenticated only if Supabase is configured
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) {
        console.error("❌ Erro de autenticação:", authError)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      console.log("✅ Usuário autenticado:", user.id)
    }

    console.log("📖 Lendo dados do request...")
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

    // Get user ID if Supabase is configured
    let userId = "dev-user" // Default para desenvolvimento
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId = user.id
      }
    }

    // Insert file metadata (skip if Supabase not configured)
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.log("💾 Salvando metadados do arquivo no Supabase...")
      const { error: fileError } = await supabase
        .from("uploaded_files")
        .insert({
          id: fileId,
          filename: fileId,
          original_name: filename,
          file_size: size,
          mime_type: mimeType,
          user_id: userId,
          status: "processing",
        })

      if (fileError) {
        console.warn("⚠️ Erro ao salvar metadados do arquivo:", fileError.message)
        // Continuar sem salvar no banco para desenvolvimento
      } else {
        console.log("✅ Metadados do arquivo salvos com sucesso")
      }
    } else {
      console.log("⏭️ Pulando salvamento de metadados (Supabase não configurado)")
    }

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

    // Insert column information (skip if Supabase not configured)
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const { error: columnsError } = await supabase.from("data_columns").insert(columnData)

      if (columnsError) {
        console.warn("⚠️ Erro ao salvar dados das colunas:", columnsError.message)
        // Continuar sem salvar no banco para desenvolvimento
      }
    }

    // Insert data rows
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

    // Insert data rows (skip if Supabase not configured)
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      // Insert in batches to avoid payload size limits
      const batchSize = 100
      for (let i = 0; i < rowData.length; i += batchSize) {
        const batch = rowData.slice(i, i + batchSize)
        const { error: rowsError } = await supabase.from("data_rows").insert(batch)

        if (rowsError) {
          console.warn("⚠️ Erro ao salvar dados das linhas:", rowsError.message)
          // Continuar sem salvar no banco para desenvolvimento
          break
        }
      }

      // Update file status to completed
      console.log("✅ Atualizando status do arquivo para concluído...")
      await supabase.from("uploaded_files").update({ status: "completed" }).eq("id", fileId)
    } else {
      console.log("⏭️ Pulando salvamento no banco (Supabase não configurado)")
    }

    console.log("🎉 Processamento concluído com sucesso!")
    return NextResponse.json({
      success: true,
      fileId,
      rowCount: dataRows.length,
      columnCount: headers.length,
    })
  } catch (error) {
    console.error("❌ Erro ao processar arquivo:", error)
    
    // Log more detailed error information
    if (error instanceof Error) {
      console.error("📝 Mensagem do erro:", error.message)
      console.error("📍 Stack trace:", error.stack)
    }

    // Update file status to error if we have the fileId (skip if Supabase not configured)
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const supabase = await createClient()
        const body = await request.json()
        if (body.fileId) {
          await supabase
            .from("uploaded_files")
            .update({
              status: "error",
              error_message: error instanceof Error ? error.message : "Unknown error",
            })
            .eq("id", body.fileId)
        }
      } catch (updateError) {
        console.error("Error updating file status:", updateError)
      }
    }

    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error",
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
