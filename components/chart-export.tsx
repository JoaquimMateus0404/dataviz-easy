"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Download, FileImage, FileText } from "lucide-react"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"

interface ChartExportProps {
  chartRef: React.RefObject<HTMLDivElement>
  chartTitle: string
  className?: string
}

export function ChartExport({ chartRef, chartTitle, className = "" }: ChartExportProps) {
  const exportAsPNG = async () => {
    if (!chartRef.current) return

    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: "#ffffff",
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
      })

      // Create download link
      const link = document.createElement("a")
      link.download = `${chartTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
    } catch (error) {
      console.error("Error exporting PNG:", error)
    }
  }

  const exportAsPDF = async () => {
    if (!chartRef.current) return

    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        allowTaint: true,
      })

      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "landscape" : "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      })

      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height)
      pdf.save(`${chartTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`)
    } catch (error) {
      console.error("Error exporting PDF:", error)
    }
  }

  const exportAsJPEG = async () => {
    if (!chartRef.current) return

    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        allowTaint: true,
      })

      // Create download link
      const link = document.createElement("a")
      link.download = `${chartTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.jpg`
      link.href = canvas.toDataURL("image/jpeg", 0.9)
      link.click()
    } catch (error) {
      console.error("Error exporting JPEG:", error)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportAsPNG}>
          <FileImage className="w-4 h-4 mr-2" />
          Export as PNG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsJPEG}>
          <FileImage className="w-4 h-4 mr-2" />
          Export as JPEG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsPDF}>
          <FileText className="w-4 h-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
