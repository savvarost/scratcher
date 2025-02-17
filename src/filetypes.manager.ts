import * as fs from "fs";
import * as vscode from "vscode";
import * as path from "path";
import { window } from "vscode";
import * as utils from "./utils";

export interface Filetype {
  name: string;
  ext: string;
}
fs.copyFile
export interface FiletypeQuickPickItem extends vscode.QuickPickItem {
  type?: Filetype;
}

export class FiletypesManager {
  private recentFiletypes: Filetype[] = [];
  private mainFiletypes: Filetype[] = [];
  private: Filetype[] = [];
  private filetypeItems: FiletypeQuickPickItem[] = [];
  private isFiletypeItemsDirty: boolean = false;

  constructor() {
    this.loadFiletypes();
    this.prepareItems();
  }

  /**
   * Select the type of the scratchpad file
   */
  public async selectFiletype(): Promise<Filetype | undefined> {
    this.prepareItems();

    const selection = await window.showQuickPick(this.filetypeItems);

    if (!selection?.type) {
      return;
    }

    this.addTypeToRecentFiletypes(selection.type);
    return selection.type;
  }
  // TODO подумать над тем что в vscode уже есть выбор языка и соответственно расширения, зачем чтото лишнее делать
  /**
   * Add a new filetype
   */
  public async newFiletype(): Promise<Filetype | undefined> {
    const ext = await vscode.window.showInputBox({
      placeHolder: "Enter file extension",
    });

    if (!ext) {
      window.showInformationMessage("Canceled...");
    } else {
      const existingFiletype = this.getFileType(ext);

      if (existingFiletype) {
        window.showInformationMessage(
          `Extension already exists (${existingFiletype.name})`
        );
      } else {
        const defaultName = this.normalizeExtension(ext).toUpperCase();
        const name = await vscode.window.showInputBox({
          placeHolder: `Enter filetype's name (Hit enter for '${defaultName}')`,
        });

        if (name !== undefined) {
          const newFileType = {
            name: name || defaultName,
            ext: `.${this.normalizeExtension(ext)}`,
          };

          this.addTypeToRecentFiletypes(newFileType);
          return newFileType;
        }
      }
    }

    return undefined;
  }

  /**
   * Load the file types based on https://github.com/blakeembrey/language-map
   */
  private loadFiletypes() {
    const langMap: Record<string, any> = require("language-map");

    for (const [name, data] of Object.entries(langMap)) {
      if (data.extensions && data.extensions !== undefined) {
        for (const ext of data.extensions) {
          // Skip extensions with multiple dots (E.G. .rest.txt)
          if (ext.lastIndexOf(".") > 0) {
            continue;
          }

          this.mainFiletypes.push({ name, ext: ext });
        }
      }
    }

    // Load recent Filetypes

    const pathVSCode = path.join(utils.getScratcherDirectory(), ".vscode");
    utils.ensureDirectoryExists(pathVSCode);

    const pathRecentFiletypes = path.join(
      pathVSCode,
      ".recentFiletypes.json"
    );
    if (fs.existsSync(pathRecentFiletypes)) {
      const data = fs.readFileSync(pathRecentFiletypes, "utf8");
      const filetypes: Filetype[] = JSON.parse(data);

      for (const fileType of filetypes) {
        this.recentFiletypes.push(fileType);
      }
    }

    this.mainFiletypes.sort(this.filetypesCompareFn);
  }

  /**
   * Make sure the file type items are up-to-date and ordered correctly
   */
  private prepareItems() {
    if (!this.filetypeItems.length || this.isFiletypeItemsDirty) {
      this.filetypeItems = [];
      this.addFiletypeOptionsToSection("Recent", this.recentFiletypes);
      this.addFiletypeOptionsToSection("File types", [
        ...this.filterOutRecentFiletypes(this.mainFiletypes),
      ]);

      this.isFiletypeItemsDirty = false;
    }
  }

  /**
   * Compare function for sorting file types array (used in sort())
   * @param a The first element for comparison.
   * @param b The second element for comparison.
   * @returns '-1/0/1' based on the extension string
   */
  private filetypesCompareFn(a: Filetype, b: Filetype) {
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  }

  /**
   * Add the given file type to the recent array
   * New filetypes are also added to this array making it a hybrid DB for custom and recent filetypes
   * @param {object} typeToAdd The filetype to add
   */
  private addTypeToRecentFiletypes(typeToAdd: Filetype) {
    if (
      !this.recentFiletypes.length ||
      this.recentFiletypes[0].ext !== typeToAdd.ext
    ) {
      this.recentFiletypes = this.recentFiletypes.filter((type) => {
        return type.ext !== typeToAdd.ext;
      });

      this.recentFiletypes.unshift(typeToAdd);

      const pathVSCode = path.join(utils.getScratcherDirectory(), ".vscode");
      utils.ensureDirectoryExists(pathVSCode);

      const pathRecentFiletypes = path.join(
        pathVSCode,
        ".recentFiletypes.json"
      );
      fs.writeFileSync(
        pathRecentFiletypes,
        JSON.stringify(this.recentFiletypes, undefined, 2)
      );
      this.isFiletypeItemsDirty = true;
    }
  }

  /**
   * Add an array of file types to the filetypesOptions to be used in QuickPick.
   * It will also add a QuickPickItemKind.Separator with the given title
   * @param sectionTitle The title to the section
   * @param typesToAdd The types array
   */
  private addFiletypeOptionsToSection(
    sectionTitle: string,
    typesToAdd: Filetype[]
  ) {
    this.filetypeItems.push({
      label: sectionTitle,
      kind: vscode.QuickPickItemKind.Separator,
    });

    for (const type of typesToAdd) {
      this.filetypeItems.push({ label: `${type.name} (${type.ext})`, type });
    }
  }

  /**
   * Remove all items that already exist in the recentFiletypes array from the given array
   * @param items The array to filter
   * @returns The filtered array
   */
  private filterOutRecentFiletypes(items: Filetype[]) {
    return items.filter(
      (item) => !this.recentFiletypes.find((recent) => recent.ext === item.ext)
    );
  }

  /**
   * Returns a @Filetype object if it exists in the current list
   * @param ext The extension of the Filetype
   * @returns True if the extension exists in the list, otherwise false
   */
  private getFileType(ext: string): Filetype | undefined {
    for (const item of this.filetypeItems) {
      if (
        item.type &&
        this.normalizeExtension(item.type.ext) === this.normalizeExtension(ext)
      ) {
        return item.type;
      }
    }

    return undefined;
  }

  /**
   * Remove the dot (if exists) and convert to lowercase.
   * Used for comparison.
   * @param ext The extension to normalize
   * @returns The normalized extension
   */
  private normalizeExtension(ext: string): string {
    return ext.replace(".", "").toLowerCase();
  }
}
