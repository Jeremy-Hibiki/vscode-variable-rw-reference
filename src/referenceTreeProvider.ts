import * as vscode from 'vscode'
import * as path from 'path'
import { VariableReference, ReferenceType, ReferenceAnalysisResult } from './types'

export class ReferenceTreeItem extends vscode.TreeItem {
  public parentFilePath?: string  // 用于追踪父文件路径
  
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly reference?: VariableReference,
    public readonly count?: number,
    public readonly type?: 'root' | 'category' | 'file' | 'reference',
    parentFilePath?: string
  ) {
    super(label, collapsibleState)
    this.parentFilePath = parentFilePath
    
    this.tooltip = this.getTooltip()
    this.iconPath = this.getIcon()
    this.contextValue = type
    
    if (reference) {
      this.command = {
        command: 'vscode.open',
        title: 'Open',
        arguments: [
          reference.location.uri,
          {
            selection: reference.location.range,
            viewColumn: vscode.ViewColumn.One
          }
        ]
      }
    }
  }

  private getTooltip(): string {
    if (this.reference) {
      return `${this.reference.context}\nFile: ${this.reference.location.uri.fsPath}\nLine: ${this.reference.location.range.start.line + 1}`
    }
    if (this.count !== undefined) {
      return `${this.count} reference${this.count !== 1 ? 's' : ''}`
    }
    return this.label
  }

  private getIcon(): vscode.ThemeIcon | undefined {
    switch (this.type) {
      case 'category':
        if (this.label.includes('Read')) return new vscode.ThemeIcon('eye')
        if (this.label.includes('Write')) return new vscode.ThemeIcon('edit')
        if (this.label.includes('Read/Write')) return new vscode.ThemeIcon('symbol-operator')
        break
      case 'file':
        return vscode.ThemeIcon.File
      case 'reference':
        if (this.reference?.type === ReferenceType.READ) return new vscode.ThemeIcon('circle-outline')
        if (this.reference?.type === ReferenceType.WRITE) return new vscode.ThemeIcon('circle-filled')
        if (this.reference?.type === ReferenceType.READ_WRITE) return new vscode.ThemeIcon('circle-large-filled')
        break
    }
    return undefined
  }
}

export class ReferenceTreeProvider implements vscode.TreeDataProvider<ReferenceTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ReferenceTreeItem | undefined | null | void> = new vscode.EventEmitter<ReferenceTreeItem | undefined | null | void>()
  readonly onDidChangeTreeData: vscode.Event<ReferenceTreeItem | undefined | null | void> = this._onDidChangeTreeData.event

  private analysisResult: ReferenceAnalysisResult | undefined
  private groupByFile: boolean = true
  private fileItemsMap = new Map<string, ReferenceTreeItem>()

  constructor() {}

  refresh(): void {
    this._onDidChangeTreeData.fire()
  }

  setAnalysisResult(result: ReferenceAnalysisResult, groupByFile: boolean = true): void {
    this.analysisResult = result
    this.groupByFile = groupByFile
    this.refresh()
  }

  clear(): void {
    this.analysisResult = undefined
    this.refresh()
  }

  getTreeItem(element: ReferenceTreeItem): vscode.TreeItem {
    return element
  }

  getChildren(element?: ReferenceTreeItem): Thenable<ReferenceTreeItem[]> {
    if (!this.analysisResult) {
      return Promise.resolve([])
    }

    if (!element) {
      // 根节点
      return Promise.resolve(this.getRootChildren())
    }

    return Promise.resolve(this.getElementChildren(element))
  }

  private getRootChildren(): ReferenceTreeItem[] {
    if (!this.analysisResult) return []

    const result = this.analysisResult
    const items: ReferenceTreeItem[] = []
    this.fileItemsMap.clear()

    if (this.groupByFile) {
      // 按文件分组
      Object.entries(result.groupedByFile).forEach(([filePath, groupedRefs]) => {
        const fileName = path.basename(filePath)
        const totalCount = groupedRefs.reads.length + groupedRefs.writes.length + groupedRefs.readWrites.length
        
        const fileItem = new ReferenceTreeItem(
          `${fileName} (${totalCount})`,
          vscode.TreeItemCollapsibleState.Expanded,
          undefined,
          totalCount,
          'file'
        )
        fileItem.resourceUri = vscode.Uri.file(filePath)
        this.fileItemsMap.set(filePath, fileItem)
        items.push(fileItem)
      })
    } else {
      // 按类型分组
      const { reads, writes, readWrites } = result.groupedByType
      
      if (reads.length > 0) {
        items.push(new ReferenceTreeItem(
          `Reads (${reads.length})`,
          vscode.TreeItemCollapsibleState.Expanded,
          undefined,
          reads.length,
          'category'
        ))
      }
      
      if (writes.length > 0) {
        items.push(new ReferenceTreeItem(
          `Writes (${writes.length})`,
          vscode.TreeItemCollapsibleState.Expanded,
          undefined,
          writes.length,
          'category'
        ))
      }
      
      if (readWrites.length > 0) {
        items.push(new ReferenceTreeItem(
          `Read/Write (${readWrites.length})`,
          vscode.TreeItemCollapsibleState.Expanded,
          undefined,
          readWrites.length,
          'category'
        ))
      }
    }

    return items
  }

  private getElementChildren(element: ReferenceTreeItem): ReferenceTreeItem[] {
    if (!this.analysisResult) return []

    const result = this.analysisResult

    if (this.groupByFile && element.type === 'file') {
      // 文件下的类型分组
      const filePath = element.resourceUri?.fsPath
      if (!filePath || !result.groupedByFile[filePath]) return []

      const groupedRefs = result.groupedByFile[filePath]
      const items: ReferenceTreeItem[] = []

      if (groupedRefs.reads.length > 0) {
        items.push(new ReferenceTreeItem(
          `Reads (${groupedRefs.reads.length})`,
          vscode.TreeItemCollapsibleState.Expanded,
          undefined,
          groupedRefs.reads.length,
          'category',
          filePath
        ))
      }

      if (groupedRefs.writes.length > 0) {
        items.push(new ReferenceTreeItem(
          `Writes (${groupedRefs.writes.length})`,
          vscode.TreeItemCollapsibleState.Expanded,
          undefined,
          groupedRefs.writes.length,
          'category',
          filePath
        ))
      }

      if (groupedRefs.readWrites.length > 0) {
        items.push(new ReferenceTreeItem(
          `Read/Write (${groupedRefs.readWrites.length})`,
          vscode.TreeItemCollapsibleState.Expanded,
          undefined,
          groupedRefs.readWrites.length,
          'category',
          filePath
        ))
      }

      return items
    }

    if (element.type === 'category') {
      // 类型分组下的具体引用
      let references: VariableReference[] = []

      if (this.groupByFile) {
        // 在文件分组模式下，使用parentFilePath来找到对应文件的引用
        if (element.parentFilePath) {
          const groupedRefs = result.groupedByFile[element.parentFilePath]
          if (groupedRefs) {
            if (element.label.includes('Reads')) references = groupedRefs.reads
            else if (element.label.includes('Writes')) references = groupedRefs.writes
            else if (element.label.includes('Read/Write')) references = groupedRefs.readWrites
          }
        }
      } else {
        // 在类型分组模式下
        if (element.label.includes('Reads')) references = result.groupedByType.reads
        else if (element.label.includes('Writes')) references = result.groupedByType.writes
        else if (element.label.includes('Read/Write')) references = result.groupedByType.readWrites
      }

      return references.map(ref => {
        const line = ref.location.range.start.line + 1
        const context = ref.context?.trim() || ''
        const preview = context.length > 60 ? context.substring(0, 60) + '...' : context
        
        return new ReferenceTreeItem(
          `Line ${line}: ${preview}`,
          vscode.TreeItemCollapsibleState.None,
          ref,
          undefined,
          'reference'
        )
      })
    }

    return []
  }


}