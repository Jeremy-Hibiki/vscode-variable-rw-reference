import { defineConfigObject, computed } from 'reactive-vscode'
import * as vscode from 'vscode'

// 直接使用 vscode.workspace.getConfiguration 来获取配置
export const config = {
  get autoShowPanel(): boolean {
    return vscode.workspace.getConfiguration('variableRwReference').get('autoShowPanel', true)
  },
  
  get groupByFile(): boolean {
    return vscode.workspace.getConfiguration('variableRwReference').get('groupByFile', true)
  },
  
  set groupByFile(value: boolean) {
    vscode.workspace.getConfiguration('variableRwReference').update('groupByFile', value, vscode.ConfigurationTarget.Global)
  }
}
