import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { DataAnalyzer } from "@/lib/data-analyzer"

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { fileId, chartType, xColumn, yColumn, aggregateFunction = "sum" } = body

    if (!fileId || !chartType || !xColumn) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Get all data rows for the file
    const { data: rowsData, error: rowsError } = await supabase
      .from("data_rows")
      .select("data")
      .eq("file_id", fileId)
      .order("row_index")

    if (rowsError) {
      return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 })
    }

    const rows = rowsData.map((row) => row.data)

    let chartData: any[] = []

    switch (chartType) {
      case "bar":
      case "pie":
        if (yColumn) {
          // Aggregate data by x column
          chartData = DataAnalyzer.aggregateData(rows, xColumn, yColumn, aggregateFunction)
        } else {
          // Count occurrences
          chartData = DataAnalyzer.aggregateData(rows, xColumn, xColumn, "count")
          chartData = chartData.map((item) => ({
            ...item,
            count: item[xColumn],
          }))
        }
        break

      case "line":
      case "area":
        if (yColumn) {
          // For time series, we might want to aggregate by time periods
          chartData = DataAnalyzer.aggregateData(rows, xColumn, yColumn, aggregateFunction)
        } else {
          chartData = rows.map((row) => ({ [xColumn]: row[xColumn] }))
        }
        break

      case "scatter":
        // For scatter plots, use raw data points
        chartData = rows
          .filter((row) => row[xColumn] !== null && row[xColumn] !== undefined)
          .filter((row) => !yColumn || (row[yColumn] !== null && row[yColumn] !== undefined))
          .map((row) => ({
            [xColumn]: row[xColumn],
            ...(yColumn && { [yColumn]: row[yColumn] }),
          }))
        break

      default:
        return NextResponse.json({ error: "Unsupported chart type" }, { status: 400 })
    }

    // Limit data points for performance
    if (chartData.length > 100) {
      chartData = chartData.slice(0, 100)
    }

    return NextResponse.json({
      success: true,
      data: chartData,
      xColumn,
      yColumn,
      chartType,
    })
  } catch (error) {
    console.error("Error getting chart data:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
