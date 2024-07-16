import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    const view = new DirectoryViewer(context);
    vscode.window.registerTreeDataProvider('directoryViewer', view);

    let disposable = vscode.commands.registerCommand('extension.showDirectory', () => {
        vscode.window.showInformationMessage('Directory Viewer is now active!');
    });

    context.subscriptions.push(disposable);
}

class DirectoryViewer implements vscode.TreeDataProvider<FileItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<FileItem | undefined | null | void> = new vscode.EventEmitter<FileItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<FileItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private context: vscode.ExtensionContext) {}

    getTreeItem(element: FileItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: FileItem): Thenable<FileItem[]> {
        if (element) {
            return Promise.resolve(this.getFilesAndDirectories(element.resourceUri.fsPath));
        } else {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders) {
                return Promise.resolve(this.getFilesAndDirectories(workspaceFolders[0].uri.fsPath));
            } else {
                vscode.window.showInformationMessage('No folder or workspace opened');
                return Promise.resolve([]);
            }
        }
    }

    private getFilesAndDirectories(dirPath: string): FileItem[] {
        const files = fs.readdirSync(dirPath);
        return files.map(file => {
            const filePath = path.join(dirPath, file);
            const stat = fs.statSync(filePath);
            return new FileItem(
                vscode.Uri.file(filePath),
                stat.isDirectory() ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
            );
        });
    }
}

class FileItem extends vscode.TreeItem {
    constructor(
        public readonly resourceUri: vscode.Uri,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(resourceUri, collapsibleState);
        this.label = path.basename(resourceUri.fsPath);
    }

    iconPath = {
        light: 'res/build.svg',
        dark: 'res/build.svg',
    };

    contextValue = 'file';
}

export function deactivate() {}