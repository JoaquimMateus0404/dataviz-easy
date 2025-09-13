// Global file storage for development
import { FileCache } from './file-cache'

interface StoredFile {
  metadata: any
  columns: any[]
  rows: any[]
  processingLog: string[]
}

// Use globalThis to ensure singleton persists across Next.js hot reloads
declare global {
  // eslint-disable-next-line no-var
  var fileStorageInstance: Map<string, StoredFile> | undefined
}

class FileStorage {
  private storage: Map<string, StoredFile>

  constructor() {
    // Use global storage that persists across hot reloads
    if (typeof globalThis !== 'undefined') {
      if (!globalThis.fileStorageInstance) {
        globalThis.fileStorageInstance = new Map()
      }
      this.storage = globalThis.fileStorageInstance
    } else {
      this.storage = new Map()
    }
  }

  public set(fileId: string, data: StoredFile): void {
    // Store in memory
    this.storage.set(fileId, data)
    
    // Also store in file cache as backup
    FileCache.set(fileId, data)
    
    console.log(`💾 Arquivo armazenado no storage com ID: ${fileId}`)
    console.log(`📊 Total de arquivos no storage: ${this.storage.size}`)
    console.log(`🗂️ IDs no storage: [${Array.from(this.storage.keys()).join(', ')}]`)
  }

  public get(fileId: string): StoredFile | undefined {
    console.log(`🔎 Procurando arquivo com ID: ${fileId}`)
    console.log(`📦 Arquivos no storage: ${Array.from(this.storage.keys()).join(', ')}`)
    
    // Try memory first
    let data = this.storage.get(fileId)
    
    // If not in memory, try file cache
    if (!data) {
      console.log(`🔄 Tentando cache de arquivo...`)
      const cachedData = FileCache.get(fileId)
      if (cachedData) {
        // Restore to memory
        this.storage.set(fileId, cachedData)
        data = cachedData
        console.log(`✅ Arquivo restaurado do cache para memória`)
      }
    }
    
    return data
  }

  public has(fileId: string): boolean {
    return this.storage.has(fileId) || FileCache.has(fileId)
  }

  public keys(): IterableIterator<string> {
    // Combine memory and cache keys
    const memoryKeys = Array.from(this.storage.keys())
    const cacheKeys = FileCache.list()
    const allKeys = new Set([...memoryKeys, ...cacheKeys])
    return allKeys.values()
  }

  public size(): number {
    const memoryKeys = Array.from(this.storage.keys())
    const cacheKeys = FileCache.list()
    const allKeys = new Set([...memoryKeys, ...cacheKeys])
    return allKeys.size
  }
}

export const fileStorage = new FileStorage()
export type { StoredFile }
