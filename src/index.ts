import { defineExtension } from 'reactive-vscode'
import * as vscode from 'vscode'
import { ReferenceAnalyzer } from './referenceAnalyzer'
import { ReferenceTreeProvider } from './referenceTreeProvider'
import { config } from './config'

const { activate, deactivate } = defineExtension(() => {
  const analyzer = new ReferenceAnalyzer()
  const treeProvider = new ReferenceTreeProvider()
  
  // 注册树形视图
  const treeView = vscode.window.createTreeView('variableRwReference', {
    treeDataProvider: treeProvider,
    showCollapseAll: true
  })

  // 注册查找引用命令
  const findReferencesCommand = vscode.commands.registerCommand(
    'variableRwReference.findReferences',
    async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor) {
        vscode.window.showWarningMessage('没有活动的编辑器')
        return
      }

      const document = editor.document
      const position = editor.selection.active
      
      // 获取当前位置的符号
      const wordRange = document.getWordRangeAtPosition(position)
      if (!wordRange) {
        vscode.window.showWarningMessage('请将光标放在变量名上')
        return
      }
      
      const symbol = document.getText(wordRange)
      
      try {
        // 显示进度提示
        await vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: `分析变量 "${symbol}" 的引用...`,
          cancellable: false
        }, async (progress) => {
          progress.report({ increment: 0 })
          
          // 分析引用
          const result = await analyzer.analyzeReferences(document, position, symbol)
          
          progress.report({ increment: 50 })
          
          // 更新树形视图
          const groupByFile = config.groupByFile
          treeProvider.setAnalysisResult(result, groupByFile)
          
          progress.report({ increment: 100 })
          
          // 设置上下文来显示视图
          vscode.commands.executeCommand('setContext', 'variableRwReference.hasReferences', result.totalReferences > 0)
          
          // 如果配置了自动显示面板，则聚焦到视图
          if (config.autoShowPanel && result.totalReferences > 0) {
            // 显示视图面板
            vscode.commands.executeCommand('workbench.view.explorer')
          }
          
          // 显示结果摘要
          const { reads, writes, readWrites } = result.groupedByType
          vscode.window.showInformationMessage(
            `找到 "${symbol}" 的 ${result.totalReferences} 个引用：${reads.length} 个读取，${writes.length} 个写入，${readWrites.length} 个读写操作`
          )
        })
      } catch (error) {
        console.error('分析引用时出错:', error)
        vscode.window.showErrorMessage(`分析引用时出错: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  )

  // 注册刷新命令
  const refreshCommand = vscode.commands.registerCommand(
    'variableRwReference.refresh',
    () => {
      treeProvider.refresh()
      vscode.window.showInformationMessage('引用视图已刷新')
    }
  )

  // 注册切换分组模式命令
  const toggleGroupingCommand = vscode.commands.registerCommand(
    'variableRwReference.toggleGrouping',
    () => {
      const currentGroupByFile = config.groupByFile
      config.groupByFile = !currentGroupByFile
      
      // 如果有分析结果，重新应用分组
      if (treeProvider['analysisResult']) {
        treeProvider.setAnalysisResult(treeProvider['analysisResult'], config.groupByFile)
      }
      
      vscode.window.showInformationMessage(
        `分组模式已切换为: ${config.groupByFile ? '按文件分组' : '按类型分组'}`
      )
    }
  )

  // 监听配置变化
  const configChangeListener = vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('variableRwReference')) {
      // 重新应用分析结果（如果有的话）
      if (treeProvider['analysisResult']) {
        treeProvider.setAnalysisResult(treeProvider['analysisResult'], config.groupByFile)
      }
    }
  })

  // 注册上下文菜单项（右键菜单）
  const contextMenuCommand = vscode.commands.registerCommand(
    'variableRwReference.findReferencesContext',
    async (uri: vscode.Uri, position: vscode.Position) => {
      // 打开文档并设置光标位置
      const document = await vscode.workspace.openTextDocument(uri)
      const editor = await vscode.window.showTextDocument(document)
      editor.selection = new vscode.Selection(position, position)
      
      // 执行查找引用
      vscode.commands.executeCommand('variableRwReference.findReferences')
    }
  )

  // 清理函数
  return () => {
    findReferencesCommand.dispose()
    refreshCommand.dispose()
    toggleGroupingCommand.dispose()
    contextMenuCommand.dispose()
    configChangeListener.dispose()
    treeView.dispose()
  }
})

export { activate, deactivate }
