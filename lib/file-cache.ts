import fs from 'fs'
import path from 'path'
import { StoredFile } from './file-storage'

const CACHE_DIR = path.join(process.cwd(), '.cache')

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
}

export class FileCache {
  private static getCacheFilePath(fileId: string): string {
    return path.join(CACHE_DIR, `${fileId}.json`)
  }

  public static set(fileId: string, data: StoredFile): void {
    try {
      const filePath = this.getCacheFilePath(fileId)
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
      console.log(`💾 Arquivo salvo no cache: ${filePath}`)
    } catch (error) {
      console.error(`❌ Erro ao salvar no cache:`, error)
    }
  }

  public static get(fileId: string): StoredFile | null {
    try {
      const filePath = this.getCacheFilePath(fileId)
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf-8')
        console.log(`📦 Arquivo encontrado no cache: ${filePath}`)
        return JSON.parse(data) as StoredFile
      }
      console.log(`❌ Arquivo não encontrado no cache: ${filePath}`)
      return null
    } catch (error) {
      console.error(`❌ Erro ao ler do cache:`, error)
      return null
    }
  }

  public static has(fileId: string): boolean {
    const filePath = this.getCacheFilePath(fileId)
    return fs.existsSync(filePath)
  }

  public static list(): string[] {
    try {
      return fs.readdirSync(CACHE_DIR)
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''))
    } catch (error) {
      console.error(`❌ Erro ao listar cache:`, error)
      return []
    }
  }

  public static delete(fileId: string): boolean {
    try {
      const filePath = this.getCacheFilePath(fileId)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        console.log(`🗑️ Arquivo removido do cache: ${filePath}`)
        return true
      }
      return false
    } catch (error) {
      console.error(`❌ Erro ao deletar do cache:`, error)
      return false
    }
  }

  public static clear(): void {
    try {
      const files = fs.readdirSync(CACHE_DIR)
      files.forEach(file => {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(CACHE_DIR, file))
        }
      })
      console.log(`🧹 Cache limpo`)
    } catch (error) {
      console.error(`❌ Erro ao limpar cache:`, error)
    }
  }
}
