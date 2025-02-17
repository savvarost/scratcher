import * as vscode from "vscode";
import * as os from "os";
import * as fs from "fs";

export function getScratcherDirectory(): string {
  const config = vscode.workspace.getConfiguration("scratcher");
  const homeDir = os.homedir();
  let directory = config.get("directory") as string;

  directory = directory.replace("~", homeDir);
  return directory;
}

export function ensureDirectoryExists(directory: string) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}
