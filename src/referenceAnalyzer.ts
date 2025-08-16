import * as vscode from 'vscode'
import { VariableReference, ReferenceType, GroupedReferences, FileGroupedReferences, ReferenceAnalysisResult } from './types'

export class ReferenceAnalyzer {
  
  /**
   * 分析变量引用并按读写类型分类
   */
  async analyzeReferences(
    document: vscode.TextDocument, 
    position: vscode.Position,
    symbol: string
  ): Promise<ReferenceAnalysisResult> {
    // 获取所有引用
    const references = await this.getAllReferences(document, position)
    
    if (!references || references.length === 0) {
      return {
        symbol,
        totalReferences: 0,
        groupedByType: { reads: [], writes: [], readWrites: [] },
        groupedByFile: {}
      }
    }

    // 分析每个引用的读写类型
    const analyzedReferences = await Promise.all(
      references.map(ref => this.analyzeReference(ref, symbol))
    )

    // 按类型分组
    const groupedByType = this.groupReferencesByType(analyzedReferences)
    
    // 按文件分组
    const groupedByFile = this.groupReferencesByFile(analyzedReferences)

    return {
      symbol,
      totalReferences: analyzedReferences.length,
      groupedByType,
      groupedByFile
    }
  }

  /**
   * 获取所有引用位置
   */
  private async getAllReferences(
    document: vscode.TextDocument, 
    position: vscode.Position
  ): Promise<vscode.Location[]> {
    try {
      const locations = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeReferenceProvider',
        document.uri,
        position
      )
      return locations || []
    } catch (error) {
      console.error('Failed to get references:', error)
      return []
    }
  }

  /**
   * 分析单个引用的读写类型
   */
  private async analyzeReference(
    location: vscode.Location, 
    symbol: string
  ): Promise<VariableReference> {
    try {
      const document = await vscode.workspace.openTextDocument(location.uri)
      const line = document.lineAt(location.range.start.line)
      const context = line.text
      
      // 获取符号在行中的位置
      const symbolStart = location.range.start.character
      const symbolEnd = location.range.end.character
      
      // 分析读写类型
      const type = this.determineReferenceType(context, symbolStart, symbolEnd, symbol)
      
      return {
        location,
        isWrite: type === ReferenceType.WRITE || type === ReferenceType.READ_WRITE,
        context,
        type
      }
    } catch (error) {
      console.error('Failed to analyze reference:', error)
      return {
        location,
        isWrite: false,
        context: '',
        type: ReferenceType.READ
      }
    }
  }

  /**
   * 确定引用类型（读/写/读写）
   */
  private determineReferenceType(
    context: string, 
    symbolStart: number, 
    symbolEnd: number, 
    symbol: string
  ): ReferenceType {
    const beforeSymbol = context.substring(0, symbolStart).trim()
    const afterSymbol = context.substring(symbolEnd).trim()
    
    // 检查是否是写操作
    const isWrite = this.isWriteOperation(beforeSymbol, afterSymbol, context, symbolStart, symbolEnd)
    
    // 检查是否是读写操作（如 ++variable, variable++, variable += 1）
    const isReadWrite = this.isReadWriteOperation(beforeSymbol, afterSymbol, context, symbolStart, symbolEnd)
    
    if (isReadWrite) {
      return ReferenceType.READ_WRITE
    } else if (isWrite) {
      return ReferenceType.WRITE
    } else {
      return ReferenceType.READ
    }
  }

  /**
   * 检查是否是写操作
   */
  private isWriteOperation(
    beforeSymbol: string, 
    afterSymbol: string, 
    context: string,
    symbolStart: number,
    symbolEnd: number
  ): boolean {
    // 赋值操作
    if (afterSymbol.startsWith('=') && !afterSymbol.startsWith('==') && !afterSymbol.startsWith('===')) {
      return true
    }
    
    // 解构赋值
    if (beforeSymbol.includes('=') && (beforeSymbol.includes('{') || beforeSymbol.includes('['))) {
      return true
    }
    
    // 函数参数（可能是输出参数）
    if (beforeSymbol.includes('(') && afterSymbol.includes(')')) {
      // 这里可以进一步分析是否是输出参数
      return false
    }
    
    // 对象属性赋值
    if (afterSymbol.match(/^\s*\.\s*\w+\s*=/)) {
      return false // 这种情况下symbol本身是读取，属性是写入
    }
    
    return false
  }

  /**
   * 检查是否是读写操作
   */
  private isReadWriteOperation(
    beforeSymbol: string, 
    afterSymbol: string, 
    context: string,
    symbolStart: number,
    symbolEnd: number
  ): boolean {
    // 前置递增/递减
    if (beforeSymbol.endsWith('++') || beforeSymbol.endsWith('--')) {
      return true
    }
    
    // 后置递增/递减
    if (afterSymbol.startsWith('++') || afterSymbol.startsWith('--')) {
      return true
    }
    
    // 复合赋值操作符
    const compoundOperators = ['+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=', '>>>=']
    for (const op of compoundOperators) {
      if (afterSymbol.startsWith(op)) {
        return true
      }
    }
    
    return false
  }

  /**
   * 按类型分组引用
   */
  private groupReferencesByType(references: VariableReference[]): GroupedReferences {
    return {
      reads: references.filter(ref => ref.type === ReferenceType.READ),
      writes: references.filter(ref => ref.type === ReferenceType.WRITE),
      readWrites: references.filter(ref => ref.type === ReferenceType.READ_WRITE)
    }
  }

  /**
   * 按文件分组引用
   */
  private groupReferencesByFile(references: VariableReference[]): FileGroupedReferences {
    const grouped: FileGroupedReferences = {}
    
    for (const ref of references) {
      const filePath = ref.location.uri.fsPath
      
      if (!grouped[filePath]) {
        grouped[filePath] = { reads: [], writes: [], readWrites: [] }
      }
      
      switch (ref.type) {
        case ReferenceType.READ:
          grouped[filePath].reads.push(ref)
          break
        case ReferenceType.WRITE:
          grouped[filePath].writes.push(ref)
          break
        case ReferenceType.READ_WRITE:
          grouped[filePath].readWrites.push(ref)
          break
      }
    }
    
    return grouped
  }
}