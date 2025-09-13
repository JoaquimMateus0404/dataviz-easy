import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { DataAnalyzer, type DataColumn } from "@/lib/data-analyzer"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ 
        error: "Supabase não configurado. Configure as variáveis de ambiente para usar esta funcionalidade." 
      }, { status: 503 })
    }

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get("fileId")

    if (!fileId) {
      return NextResponse.json({ error: "File ID is required" }, { status: 400 })
    }

    // Get file info
    const { data: fileData, error: fileError } = await supabase
      .from("uploaded_files")
      .select("*")
      .eq("id", fileId)
      .eq("user_id", user.id)
      .single()

    if (fileError || !fileData) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Get column information
    const { data: columnsData, error: columnsError } = await supabase
      .from("data_columns")
      .select("*")
      .eq("file_id", fileId)
      .order("column_name")

    if (columnsError) {
      return NextResponse.json({ error: "Failed to fetch columns" }, { status: 500 })
    }

    // Get data rows (limit to first 1000 for analysis)
    const { data: rowsData, error: rowsError } = await supabase
      .from("data_rows")
      .select("data")
      .eq("file_id", fileId)
      .order("row_index")
      .limit(1000)

    if (rowsError) {
      return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 })
    }

    // Transform data for analysis
    const columns: DataColumn[] = columnsData.map((col) => ({
      name: col.column_name,
      type: col.column_type,
      sampleValues: col.sample_values || [],
    }))

    const rows = rowsData.map((row) => row.data)

    // Analyze data
    const analysis = DataAnalyzer.analyzeData(columns, rows)

    return NextResponse.json({
      success: true,
      file: fileData,
      analysis,
    })
  } catch (error) {
    console.error("Error analyzing data:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
