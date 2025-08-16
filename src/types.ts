import * as vscode from 'vscode'

export interface VariableReference {
  location: vscode.Location
  isWrite: boolean
  context?: string // 上下文代码片段
  type: ReferenceType
}

export enum ReferenceType {
  READ = 'read',
  WRITE = 'write',
  READ_WRITE = 'readwrite' // 比如 obj.prop++ 这种既读又写的情况
}

export interface GroupedReferences {
  reads: VariableReference[]
  writes: VariableReference[]
  readWrites: VariableReference[]
}

export interface FileGroupedReferences {
  [filePath: string]: GroupedReferences
}

export interface ReferenceAnalysisResult {
  symbol: string
  totalReferences: number
  groupedByType: GroupedReferences
  groupedByFile: FileGroupedReferences
}