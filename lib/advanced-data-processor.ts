import * as XLSX from 'xlsx'

export interface ParsedData {
  headers: string[]
  rows: string[][]
  sheets?: string[]
  metadata: {
    totalRows: number
    totalColumns: number
    hasMultipleSheets: boolean
    detectedHeaders: string[]
    dataStartRow: number
  }
}

export interface DataQualityReport {
  emptyRows: number
  emptyColumns: number
  inconsistentRows: number
  dataCompleteness: number
  suggestedCleanup: string[]
}

export class AdvancedDataProcessor {
  static processFile(content: string, filename: string, mimeType: string): ParsedData {
    if (mimeType.includes('spreadsheetml') || filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      return this.processExcelFile(content)
    } else {
      return this.processCSVFile(content)
    }
  }

  private static processExcelFile(content: string): ParsedData {
    try {
      // Convert base64 string to buffer if needed
      const workbook = XLSX.read(content, { type: 'string' })
      const sheetNames = workbook.SheetNames
      
      // Try to find the best sheet (usually the first one with substantial data)
      let bestSheet = sheetNames[0]
      let maxDataRows = 0
      
      for (const sheetName of sheetNames) {
        const worksheet = workbook.Sheets[sheetName]
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
        const nonEmptyRows = data.filter(row => 
          Array.isArray(row) && row.some(cell => cell && cell.toString().trim() !== '')
        ).length
        
        if (nonEmptyRows > maxDataRows) {
          maxDataRows = nonEmptyRows
          bestSheet = sheetName
        }
      }

      const worksheet = workbook.Sheets[bestSheet]
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as string[][]
      
      // Smart header detection
      const { headers, dataStartRow } = this.detectHeaders(rawData)
      const dataRows = rawData.slice(dataStartRow)
      
      // Clean and normalize data
      const cleanedRows = this.cleanDataRows(dataRows, headers.length)

      return {
        headers,
        rows: cleanedRows,
        sheets: sheetNames,
        metadata: {
          totalRows: cleanedRows.length,
          totalColumns: headers.length,
          hasMultipleSheets: sheetNames.length > 1,
          detectedHeaders: headers,
          dataStartRow
        }
      }
    } catch (error) {
      console.error('Erro ao processar arquivo Excel:', error)
      // Fallback to CSV processing
      return this.processCSVFile(content)
    }
  }

  private static processCSVFile(content: string): ParsedData {
    const lines = content.split('\n')
    const rawRows: string[][] = []

    // Enhanced CSV parsing with better quote handling
    for (const line of lines) {
      if (line.trim() === '') continue
      
      const row = this.parseCSVLine(line)
      if (row.length > 0) {
        rawRows.push(row)
      }
    }

    // Smart header detection
    const { headers, dataStartRow } = this.detectHeaders(rawRows)
    const dataRows = rawRows.slice(dataStartRow)
    
    // Clean and normalize data
    const cleanedRows = this.cleanDataRows(dataRows, headers.length)

    return {
      headers,
      rows: cleanedRows,
      metadata: {
        totalRows: cleanedRows.length,
        totalColumns: headers.length,
        hasMultipleSheets: false,
        detectedHeaders: headers,
        dataStartRow
      }
    }
  }

  private static parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    let i = 0

    while (i < line.length) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"'
          i += 2
          continue
        } else {
          // Toggle quote state
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
      i++
    }

    result.push(current.trim())
    return result
  }

  private static detectHeaders(rows: string[][]): { headers: string[], dataStartRow: number } {
    if (rows.length === 0) {
      return { headers: [], dataStartRow: 0 }
    }

    // Look for the first row that seems like headers
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const row = rows[i]
      
      // Skip completely empty rows
      if (!row.some(cell => cell && cell.toString().trim() !== '')) {
        continue
      }

      // Check if this row looks like headers
      const nonEmptyCount = row.filter(cell => cell && cell.toString().trim() !== '').length
      const hasTextHeaders = row.some(cell => 
        cell && 
        cell.toString().trim() !== '' && 
        isNaN(Number(cell.toString().replace(/[R$\s,.-]/g, '')))
      )

      // If we have at least 2 non-empty cells and some text, consider it headers
      if (nonEmptyCount >= 2 && hasTextHeaders) {
        const cleanHeaders = row.map((header, index) => {
          const cleanHeader = header ? header.toString().trim() : ''
          return cleanHeader || `Column_${index + 1}`
        })
        
        return { 
          headers: cleanHeaders.slice(0, this.findLastNonEmptyColumn(cleanHeaders) + 1),
          dataStartRow: i + 1 
        }
      }
    }

    // Fallback: use first row or generate generic headers
    const firstRow = rows[0] || []
    const columnCount = Math.max(...rows.map(row => row.length))
    const headers = Array.from({ length: columnCount }, (_, i) => {
      const value = firstRow[i]
      return value && value.toString().trim() !== '' ? value.toString().trim() : `Column_${i + 1}`
    })

    return { headers, dataStartRow: 1 }
  }

  private static findLastNonEmptyColumn(row: string[]): number {
    for (let i = row.length - 1; i >= 0; i--) {
      if (row[i] && row[i].trim() !== '') {
        return i
      }
    }
    return 0
  }

  private static cleanDataRows(rows: string[][], expectedColumnCount: number): string[][] {
    return rows
      .filter(row => {
        // Keep rows that have at least one non-empty cell
        return row.some(cell => cell && cell.toString().trim() !== '')
      })
      .map(row => {
        // Normalize row length and clean cells
        const cleanedRow = Array.from({ length: expectedColumnCount }, (_, i) => {
          const cell = row[i]
          if (!cell) return ''
          
          const cleanCell = cell.toString().trim()
          
          // Handle currency values (R$ format)
          if (cleanCell.match(/^R\$\s*[\d,.-]+$/)) {
            return cleanCell.replace(/[R$\s]/g, '').replace(',', '.')
          }
          
          return cleanCell
        })
        
        return cleanedRow
      })
      .filter(row => {
        // Remove rows that are completely empty after cleaning
        return row.some(cell => cell !== '')
      })
  }

  static analyzeDataQuality(headers: string[], rows: string[][]): DataQualityReport {
    const totalCells = rows.length * headers.length
    const emptyRows = rows.filter(row => row.every(cell => !cell || cell.trim() === '')).length
    const emptyColumns = headers.filter((_, colIndex) => 
      rows.every(row => !row[colIndex] || row[colIndex].trim() === '')
    ).length

    const inconsistentRows = rows.filter(row => row.length !== headers.length).length
    
    const filledCells = rows.reduce((acc, row) => 
      acc + row.filter(cell => cell && cell.trim() !== '').length, 0
    )
    
    const dataCompleteness = totalCells > 0 ? (filledCells / totalCells) * 100 : 0

    const suggestedCleanup: string[] = []
    
    if (emptyRows > 0) {
      suggestedCleanup.push(`Remover ${emptyRows} linha(s) vazia(s)`)
    }
    
    if (emptyColumns > 0) {
      suggestedCleanup.push(`Remover ${emptyColumns} coluna(s) vazia(s)`)
    }
    
    if (inconsistentRows > 0) {
      suggestedCleanup.push(`Normalizar ${inconsistentRows} linha(s) com tamanho inconsistente`)
    }
    
    if (dataCompleteness < 50) {
      suggestedCleanup.push('Dados muito esparsos - considere revisar a estrutura')
    }

    return {
      emptyRows,
      emptyColumns,
      inconsistentRows,
      dataCompleteness,
      suggestedCleanup
    }
  }
}
