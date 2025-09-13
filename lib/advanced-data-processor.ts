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
    fileType: 'simple_table' | 'budget_layout' | 'expense_report' | 'complex_structure'
    extractedSections?: {
      name: string
      headers: string[]
      rows: string[][]
    }[]
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
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
      
      // Smart header detection and data analysis
      const analysisResult = this.analyzeComplexStructure(rawData as string[][])
      
      // Clean and normalize data
      const cleanedRows = this.cleanDataRows(analysisResult.dataRows, analysisResult.headers.length)

      return {
        headers: analysisResult.headers,
        rows: cleanedRows,
        sheets: sheetNames,
        metadata: {
          totalRows: cleanedRows.length,
          totalColumns: analysisResult.headers.length,
          hasMultipleSheets: sheetNames.length > 1,
          detectedHeaders: analysisResult.headers,
          dataStartRow: analysisResult.dataStartRow,
          fileType: analysisResult.fileType,
          extractedSections: analysisResult.extractedSections
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

    // Smart analysis of complex structure
    const analysisResult = this.analyzeComplexStructure(rawRows)
    
    // Clean and normalize data
    const cleanedRows = this.cleanDataRows(analysisResult.dataRows, analysisResult.headers.length)

    return {
      headers: analysisResult.headers,
      rows: cleanedRows,
      metadata: {
        totalRows: cleanedRows.length,
        totalColumns: analysisResult.headers.length,
        hasMultipleSheets: false,
        detectedHeaders: analysisResult.headers,
        dataStartRow: analysisResult.dataStartRow,
        fileType: analysisResult.fileType,
        extractedSections: analysisResult.extractedSections
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

    console.log('🔍 Iniciando detecção inteligente de cabeçalhos...')

    // Strategy 1: Find tables with clear data patterns
    const tableCandidate = this.findDataTable(rows)
    if (tableCandidate) {
      console.log(`✅ Tabela de dados encontrada na linha ${tableCandidate.headerRow}`)
      return {
        headers: tableCandidate.headers,
        dataStartRow: tableCandidate.dataStartRow
      }
    }

    // Strategy 2: Find budget-style layouts (like "Orçamento mensal")
    const budgetLayout = this.findBudgetLayout(rows)
    if (budgetLayout) {
      console.log(`💰 Layout de orçamento detectado na linha ${budgetLayout.headerRow}`)
      return {
        headers: budgetLayout.headers,
        dataStartRow: budgetLayout.dataStartRow
      }
    }

    // Strategy 3: Look for any row that could be headers
    for (let i = 0; i < Math.min(15, rows.length); i++) {
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
        
        console.log(`📋 Cabeçalhos genéricos detectados na linha ${i}`)
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

    console.log('⚠️ Usando cabeçalhos de fallback')
    return { headers, dataStartRow: 1 }
  }

  private static findDataTable(rows: string[][]): { headers: string[], headerRow: number, dataStartRow: number } | null {
    // Look for patterns like "Data, Categoria, Descrição, Valor"
    for (let i = 0; i < Math.min(25, rows.length); i++) {
      const row = rows[i]
      if (!row || row.length < 3) continue

      if (this.isValidHeaderRow(row, i, rows)) {
        const cleanHeaders = row.map((header, index) => {
          const cleanHeader = header ? header.toString().trim() : ''
          return cleanHeader || `Column_${index + 1}`
        })
        
        return {
          headers: cleanHeaders.slice(0, this.findLastNonEmptyColumn(cleanHeaders) + 1),
          headerRow: i,
          dataStartRow: i + 1
        }
      }
    }

    return null
  }

  private static isValidHeaderRow(row: string[], rowIndex: number, allRows: string[][]): boolean {
    const cellsText = row.map(cell => (cell || '').toString().toLowerCase().trim())
    
    // Score this row as potential headers
    let score = 0
    const headerKeywords = [
      'data', 'categoria', 'descrição', 'valor', 'observações', 'nome', 'código',
      'quantidade', 'preço', 'total', 'departamento', 'funcionário', 'cliente'
    ]

    for (const cell of cellsText) {
      if (cell && headerKeywords.some(keyword => cell.includes(keyword))) {
        score += 2
      }
      if (cell && cell.length > 0 && cell.length < 30 && !this.isNumericValue(cell)) {
        score += 1
      }
    }

    // Check if following rows have data
    if (score >= 3 && rowIndex < allRows.length - 2) {
      return allRows.slice(rowIndex + 1, rowIndex + 4).some(nextRow => 
        nextRow?.some(cell => this.isNumericValue(cell))
      )
    }

    return false
  }

  private static findBudgetLayout(rows: string[][]): { headers: string[], headerRow: number, dataStartRow: number } | null {
    // Look for budget-style layouts with categories and values
    for (let i = 0; i < Math.min(30, rows.length); i++) {
      const row = rows[i]
      if (!row || row.length < 3) continue

      const cellsText = row.map(cell => (cell || '').toString().toLowerCase().trim())
      
      if (this.isBudgetHeaderRow(cellsText)) {
        const budgetHeaders = ['Categoria', 'Planejado', 'Real', 'Diferença']
        
        if (this.hasBudgetDataFollowing(rows, i + 1)) {
          return {
            headers: budgetHeaders,
            headerRow: i,
            dataStartRow: i + 1
          }
        }
      }
    }

    return null
  }

  private static isBudgetHeaderRow(cellsText: string[]): boolean {
    return cellsText.some(cell => cell.includes('planejado')) &&
           cellsText.some(cell => cell.includes('real'))
  }

  private static hasBudgetDataFollowing(rows: string[][], startRow: number): boolean {
    for (let j = startRow; j < Math.min(startRow + 10, rows.length); j++) {
      const dataRow = rows[j]
      if (dataRow && dataRow.length >= 3) {
        const hasCategory = dataRow[0] && dataRow[0].toString().trim() !== ''
        const hasValues = dataRow.slice(1).some(cell => this.isMonetaryValue(cell))
        
        if (hasCategory && hasValues) {
          return true
        }
      }
    }
    return false
  }

  private static isNumericValue(cell: any): boolean {
    if (!cell) return false
    const str = cell.toString().trim()
    if (str === '') return false
    
    // Check for currency values
    const currencyRegex = /^R\$\s*[\d,.-]+$/
    if (currencyRegex.exec(str)) return true
    
    // Check for regular numbers
    const num = str.replace(/[,.-]/g, '.')
    return !isNaN(Number(num)) && /\d/.test(str)
  }

  private static isMonetaryValue(cell: any): boolean {
    if (!cell) return false
    const str = cell.toString().trim()
    const currencyRegex = /^R\$\s*[\d,.-]+$/
    return currencyRegex.exec(str) !== null
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
    console.log(`🧹 Iniciando limpeza de ${rows.length} linhas de dados...`)
    
    const cleanedRows: string[][] = []
    
    for (const [rowIndex, row] of rows.entries()) {
      // Skip completely empty rows
      if (!row?.some(cell => cell?.toString().trim() !== '')) {
        continue
      }

      // Handle budget-style data extraction
      const budgetData = this.extractBudgetRow(row)
      if (budgetData) {
        cleanedRows.push(budgetData)
        continue
      }

      // Handle regular table data
      const cleanedRow = Array.from({ length: expectedColumnCount }, (_, j) => {
        const cell = row[j]
        if (!cell) return ''
        
        let cleanCell = cell.toString().trim()
        
        // Handle currency values (R$ format)
        const currencyRegex = /^R\$\s*[\d,.-]+$/
        if (currencyRegex.exec(cleanCell)) {
          cleanCell = cleanCell.replace(/[R$\s]/g, '').replace(',', '.')
          // Convert to number and back to ensure proper formatting
          const numValue = parseFloat(cleanCell)
          return isNaN(numValue) ? '0' : numValue.toString()
        }
        
        // Handle percentage values
        const percentageRegex = /^\+?\d+%$/
        if (percentageRegex.exec(cleanCell)) {
          return cleanCell.replace('%', '')
        }
        
        return cleanCell
      })
      
      // Only keep rows that have meaningful data
      if (cleanedRow.some(cell => cell !== '')) {
        cleanedRows.push(cleanedRow)
      }
    }

    console.log(`✅ Limpeza concluída: ${cleanedRows.length} linhas válidas extraídas`)
    return cleanedRows
  }

  private static extractBudgetRow(row: string[]): string[] | null {
    // Extract budget-style data (Category, Planned, Real, Difference)
    if (!row || row.length < 3) return null
    
    const category = row[0] ? row[0].toString().trim() : ''
    if (!this.isValidBudgetCategory(category)) {
      return null
    }

    // Look for monetary values in the row
    const values: string[] = []
    let foundMonetary = false
    
    for (let i = 1; i < row.length; i++) {
      const cell = row[i] ? row[i].toString().trim() : ''
      
      const currencyRegex = /^R\$\s*[\d,.-]+$/
      if (currencyRegex.exec(cell)) {
        foundMonetary = true
        const cleanValue = cell.replace(/[R$\s]/g, '').replace(',', '.')
        const numValue = parseFloat(cleanValue)
        values.push(isNaN(numValue) ? '0' : numValue.toString())
      } else if (foundMonetary && values.length < 3) {
        // Fill gaps with 0 if we're in the middle of monetary data
        values.push('0')
      }
    }

    // Only return if we have a category and at least one monetary value
    if (category && foundMonetary && values.length > 0) {
      // Ensure we have exactly 3 values (Planned, Real, Difference)
      while (values.length < 3) {
        values.push('0')
      }
      return [category, ...values.slice(0, 3)]
    }

    return null
  }

  private static isValidBudgetCategory(category: string): boolean {
    if (!category || category === '') return false
    
    const lowerCategory = category.toLowerCase()
    
    // Skip meta information rows
    const skipKeywords = ['primeiros passos', 'observação', 'saldo inicial', 'orçamento mensal', 'totais']
    return !skipKeywords.some(keyword => lowerCategory.includes(keyword))
  }

  private static analyzeComplexStructure(rows: string[][]): {
    headers: string[]
    dataRows: string[][]
    dataStartRow: number
    fileType: 'simple_table' | 'budget_layout' | 'expense_report' | 'complex_structure'
    extractedSections?: {
      name: string
      headers: string[]
      rows: string[][]
    }[]
  } {
    console.log('🔍 Analisando estrutura complexa do arquivo...')
    
    // Check for budget layout first
    const budgetResult = this.analyzeBudgetStructure(rows)
    if (budgetResult) {
      return budgetResult
    }

    // Check for expense report layout
    const expenseResult = this.analyzeExpenseReport(rows)
    if (expenseResult) {
      return expenseResult
    }

    // Check for simple table
    const tableResult = this.analyzeSimpleTable(rows)
    if (tableResult) {
      return tableResult
    }

    // Fallback to complex structure
    return this.analyzeComplexMultiSection(rows)
  }

  private static analyzeBudgetStructure(rows: string[][]): {
    headers: string[]
    dataRows: string[][]
    dataStartRow: number
    fileType: 'budget_layout'
    extractedSections: {
      name: string
      headers: string[]
      rows: string[][]
    }[]
  } | null {
    // Look for budget-style keywords
    const budgetKeywords = ['orçamento', 'despesas', 'renda', 'planejado', 'real']
    const hasBudgetContent = rows.some(row => 
      row.some(cell => {
        const cellText = (cell || '').toString().toLowerCase()
        return budgetKeywords.some(keyword => cellText.includes(keyword))
      })
    )

    if (!hasBudgetContent) return null

    console.log('💰 Estrutura de orçamento detectada')

    const sections: Array<{
      name: string
      headers: string[]
      rows: string[][]
    }> = []

    // Extract expenses section
    const expensesData = this.extractBudgetSection(rows, 'despesas')
    if (expensesData) {
      sections.push({
        name: 'Despesas',
        headers: ['Categoria', 'Planejado', 'Real', 'Diferença'],
        rows: expensesData
      })
    }

    // Extract income section
    const incomeData = this.extractBudgetSection(rows, 'renda')
    if (incomeData) {
      sections.push({
        name: 'Renda',
        headers: ['Categoria', 'Planejado', 'Real', 'Diferença'],
        rows: incomeData
      })
    }

    // Combine all data for main table
    const allData = [...(expensesData || []), ...(incomeData || [])]

    return {
      headers: ['Categoria', 'Planejado', 'Real', 'Diferença'],
      dataRows: allData,
      dataStartRow: 0,
      fileType: 'budget_layout',
      extractedSections: sections
    }
  }

  private static analyzeExpenseReport(rows: string[][]): {
    headers: string[]
    dataRows: string[][]
    dataStartRow: number
    fileType: 'expense_report'
    extractedSections: {
      name: string
      headers: string[]
      rows: string[][]
    }[]
  } | null {
    // Look for expense report keywords
    const expenseKeywords = ['relatório', 'despesas', 'data', 'categoria', 'valor']
    const hasExpenseContent = rows.some(row => 
      row.some(cell => {
        const cellText = (cell || '').toString().toLowerCase()
        return expenseKeywords.some(keyword => cellText.includes(keyword))
      })
    )

    if (!hasExpenseContent) return null

    console.log('📊 Relatório de despesas detectado')

    // Find the transaction table
    const tableResult = this.findDataTable(rows)
    if (tableResult) {
      const dataRows = rows.slice(tableResult.dataStartRow)
        .filter(row => row.some(cell => cell && cell.toString().trim() !== ''))
        .map(row => row.map(cell => (cell || '').toString().trim()))

      return {
        headers: tableResult.headers,
        dataRows,
        dataStartRow: tableResult.dataStartRow,
        fileType: 'expense_report',
        extractedSections: [{
          name: 'Transações',
          headers: tableResult.headers,
          rows: dataRows
        }]
      }
    }

    return null
  }

  private static analyzeSimpleTable(rows: string[][]): {
    headers: string[]
    dataRows: string[][]
    dataStartRow: number
    fileType: 'simple_table'
  } | null {
    const tableResult = this.findDataTable(rows)
    if (tableResult) {
      const dataRows = rows.slice(tableResult.dataStartRow)
        .filter(row => row.some(cell => cell && cell.toString().trim() !== ''))

      return {
        headers: tableResult.headers,
        dataRows,
        dataStartRow: tableResult.dataStartRow,
        fileType: 'simple_table'
      }
    }

    return null
  }

  private static analyzeComplexMultiSection(rows: string[][]): {
    headers: string[]
    dataRows: string[][]
    dataStartRow: number
    fileType: 'complex_structure'
    extractedSections: {
      name: string
      headers: string[]
      rows: string[][]
    }[]
  } {
    console.log('🔍 Estrutura complexa multi-seção detectada')

    // Extract all meaningful data
    const allData: string[][] = []
    const sections: Array<{
      name: string
      headers: string[]
      rows: string[][]
    }> = []

    let sectionCount = 1
    for (const [index, row] of rows.entries()) {
      if (!row || !row.some(cell => cell && cell.toString().trim() !== '')) {
        continue
      }

      // Extract meaningful data from this row
      const extractedRow = this.extractMeaningfulData(row)
      if (extractedRow && extractedRow.length > 0) {
        allData.push(extractedRow)
        
        // Create a section for this data
        sections.push({
          name: `Seção ${sectionCount}`,
          headers: extractedRow.map((_, i) => `Campo_${i + 1}`),
          rows: [extractedRow]
        })
        sectionCount++
      }
    }

    return {
      headers: ['Campo_1', 'Campo_2', 'Campo_3', 'Campo_4'],
      dataRows: allData,
      dataStartRow: 0,
      fileType: 'complex_structure',
      extractedSections: sections
    }
  }

  private static extractBudgetSection(rows: string[][], sectionType: string): string[][] | null {
    const data: string[][] = []
    let inSection = false

    for (const row of rows) {
      if (!row) continue

      const rowText = row.join(' ').toLowerCase()
      
      // Check if we're entering the section
      if (rowText.includes(sectionType) && 
          (rowText.includes('planejado') || rowText.includes('real'))) {
        inSection = true
        continue
      }

      // If in section, extract data
      if (inSection) {
        const budgetRow = this.extractBudgetRow(row)
        if (budgetRow) {
          data.push(budgetRow)
        }
        
        // Exit section if we hit another major section
        if (rowText.includes('totais') && data.length > 0) {
          break
        }
      }
    }

    return data.length > 0 ? data : null
  }

  private static extractMeaningfulData(row: string[]): string[] | null {
    const meaningful: string[] = []
    
    for (const cell of row) {
      if (cell && cell.toString().trim() !== '') {
        const cleanCell = cell.toString().trim()
        meaningful.push(cleanCell)
      }
    }

    return meaningful.length >= 2 ? meaningful : null
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
