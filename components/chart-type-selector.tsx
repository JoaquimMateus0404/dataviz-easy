import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { BarChart3, LineChart, PieChart, ScatterChart, AreaChart, TrendingUp } from "lucide-react"

interface ChartType {
  id: string
  name: string
  description: string
  icon: React.ComponentType<any>
  requirements: {
    minColumns: number
    requiresNumeric?: boolean
    requiresCategoric?: boolean
  }
  examples: string[]
}

const CHART_TYPES: ChartType[] = [
  {
    id: "bar",
    name: "Gráfico de Barras",
    description: "Ideal para comparar categorias ou valores discretos",
    icon: BarChart3,
    requirements: { minColumns: 2, requiresCategoric: true },
    examples: ["Vendas por região", "Produtos mais vendidos", "Desempenho por equipe"]
  },
  {
    id: "line",
    name: "Gráfico de Linha",
    description: "Perfeito para mostrar tendências ao longo do tempo",
    icon: LineChart,
    requirements: { minColumns: 2, requiresNumeric: true },
    examples: ["Evolução de vendas", "Crescimento temporal", "Tendências de mercado"]
  },
  {
    id: "pie",
    name: "Gráfico de Pizza",
    description: "Mostra proporções e percentuais de um todo",
    icon: PieChart,
    requirements: { minColumns: 2, requiresCategoric: true },
    examples: ["Participação de mercado", "Distribuição por categoria", "Proporções"]
  },
  {
    id: "area",
    name: "Gráfico de Área",
    description: "Visualiza volumes e tendências acumuladas",
    icon: AreaChart,
    requirements: { minColumns: 2, requiresNumeric: true },
    examples: ["Volume acumulado", "Crescimento total", "Comparação de volumes"]
  },
  {
    id: "scatter",
    name: "Gráfico de Dispersão",
    description: "Analisa correlações entre duas variáveis numéricas",
    icon: ScatterChart,
    requirements: { minColumns: 2, requiresNumeric: true },
    examples: ["Preço vs Qualidade", "Idade vs Renda", "Correlações"]
  }
]

interface ChartTypeSelectorProps {
  columns: Array<{ name: string; type: string }>
  selectedType?: string
  selectedXColumn?: string
  selectedYColumn?: string
  onSelectionChange: (config: {
    chartType: string
    xColumn: string
    yColumn?: string
    title: string
  }) => void
  onCreateChart: () => void
}

export function ChartTypeSelector({
  columns,
  selectedType,
  selectedXColumn,
  selectedYColumn,
  onSelectionChange,
  onCreateChart
}: Readonly<ChartTypeSelectorProps>) {
  const [chartType, setChartType] = useState(selectedType ?? "bar")
  const [xColumn, setXColumn] = useState(selectedXColumn ?? "")
  const [yColumn, setYColumn] = useState(selectedYColumn ?? "")

  const numericColumns = columns.filter(col => col.type === "number")
  const categoricColumns = columns.filter(col => col.type === "string" || col.type === "date")
  const allColumns = columns

  const selectedChartType = CHART_TYPES.find(type => type.id === chartType)

  const isValidSelection = () => {
    if (!chartType || !xColumn) return false
    
    const chartTypeConfig = CHART_TYPES.find(type => type.id === chartType)
    if (!chartTypeConfig) return false

    // For pie charts, we only need one column
    if (chartType === "pie") {
      return xColumn !== ""
    }

    // For other charts, we need both X and Y
    return xColumn !== "" && yColumn !== ""
  }

  const handleSelectionChange = () => {
    if (isValidSelection()) {
      const title = generateChartTitle()
      onSelectionChange({
        chartType,
        xColumn,
        yColumn: chartType === "pie" ? undefined : yColumn,
        title
      })
    }
  }

  const generateChartTitle = () => {
    const xColName = columns.find(col => col.name === xColumn)?.name ?? xColumn
    const yColName = columns.find(col => col.name === yColumn)?.name ?? yColumn
    
    switch (chartType) {
      case "pie":
        return `Distribuição de ${xColName}`
      case "line":
        return `Evolução de ${yColName} por ${xColName}`
      case "bar":
        return `${yColName} por ${xColName}`
      case "area":
        return `Volume de ${yColName} por ${xColName}`
      case "scatter":
        return `${xColName} vs ${yColName}`
      default:
        return `Análise de ${xColName}`
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Seletor de Gráficos
        </CardTitle>
        <CardDescription>
          Escolha o tipo de gráfico e configure as colunas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Chart Type Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Tipo de Gráfico</Label>
          <div className="grid grid-cols-1 gap-3">
            {CHART_TYPES.map((type) => {
              const Icon = type.icon
              const isDisabled = type.requirements.requiresNumeric && numericColumns.length < 1
              
              return (
                <div
                  key={type.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    chartType === type.id
                      ? "border-primary bg-primary/5"
                      : isDisabled
                      ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => !isDisabled && setChartType(type.id)}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 mt-0.5 ${
                      chartType === type.id ? "text-primary" : "text-gray-500"
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{type.name}</h4>
                        {chartType === type.id && (
                          <Badge variant="default" className="text-xs">Selecionado</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{type.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {type.examples.map((example, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {example}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Column Selection */}
        {selectedChartType && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {chartType === "pie" ? "Coluna de Categoria" : "Eixo X (Categorias/Tempo)"}
              </Label>
              <Select value={xColumn} onValueChange={setXColumn}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma coluna..." />
                </SelectTrigger>
                <SelectContent>
                  {(chartType === "pie" ? categoricColumns : allColumns).map((column) => (
                    <SelectItem key={column.name} value={column.name}>
                      <div className="flex items-center gap-2">
                        <span>{column.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {column.type}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {chartType !== "pie" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Eixo Y (Valores)</Label>
                <Select value={yColumn} onValueChange={setYColumn}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma coluna..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(selectedChartType.requirements.requiresNumeric ? numericColumns : allColumns).map((column) => (
                      <SelectItem key={column.name} value={column.name}>
                        <div className="flex items-center gap-2">
                          <span>{column.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {column.type}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Preview */}
            {isValidSelection() && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border">
                <h4 className="font-medium text-sm mb-1">Prévia do Gráfico</h4>
                <p className="text-sm text-gray-600">{generateChartTitle()}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {selectedChartType.name}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    X: {xColumn}
                  </Badge>
                  {yColumn && (
                    <Badge variant="outline" className="text-xs">
                      Y: {yColumn}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleSelectionChange}
                disabled={!isValidSelection()}
                variant="outline"
                className="flex-1"
              >
                Aplicar Configuração
              </Button>
              <Button
                onClick={onCreateChart}
                disabled={!isValidSelection()}
                className="flex-1"
              >
                Criar Gráfico
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
