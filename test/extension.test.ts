import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as yaml from "js-yaml";
import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { window, Selection, workspace, ConfigurationTarget } from "vscode";
import { extension } from "../src/extension";

function randomName() {
  return Math.random().toString(36).replace(/[^a-z]+/g, "").substr(0, 10);
}

async function createRandomFile(contents: string): Promise<vscode.Uri> {
  const tmpFile = path.join(os.tmpdir(), randomName());

  try {
    fs.writeFileSync(tmpFile, contents);
    return vscode.Uri.file(tmpFile);
  } catch (error) {
    throw error;
  }
}

export async function setupWorkspace(fileExtension: string = ""): Promise<void> {
  if (vscode.window.activeTextEditor === undefined) {
    // should only run once before the first test
    const file = await createRandomFile("");
    const doc = await vscode.workspace.openTextDocument(file);
    await vscode.window.showTextDocument(doc);
    // await workspace.getConfiguration("keyano").update("keyboardLayout", "qwerty", ConfigurationTarget.Workspace);
  }
  assert.ok(vscode.window.activeTextEditor);

  // always use qwerty in tests
}

export async function setFileContent(text: string): Promise<vscode.TextEditor> {
  await setupWorkspace();
  const editor = window.activeTextEditor;
  if (editor === undefined) {
    throw new Error("No active editor");
  }
  const { document } = editor;
  const selection = new Selection(document.positionAt(0), document.positionAt(Infinity));
  await editor.edit((builder) => {
    builder.delete(selection);
    builder.insert(document.positionAt(0), text);
  });
  return editor;
}

type Scenario = {
  it: string,
  start: string,
  input: string,
  "selection is"?: string,
  "selections are"?: string[],
  "text is"?: string
};

type Describe = {
  describe: string,
  scenarios: Scenario[]
};

// VSCode compiles this TS file into a JS file in /out/test and the
// yaml file is not copied into this directory
const filePath = path.join(__dirname, "../../test/extension.yaml");

const tests: Describe[] = yaml.safeLoad(fs.readFileSync(filePath, "utf8"));

for (const description of tests) {

  describe(description.describe, () => {
    for (const scenario of description.scenarios) {
      it(scenario.it, async () => {
        const editor = await setFileContent(scenario.start.replace("|", ""));
        const { document } = editor;
        const cursorPosition = document.positionAt(scenario.start.indexOf("|"));
        editor.selection = new Selection(cursorPosition, cursorPosition);
        for (const char of scenario.input) {
          await extension.handleKey(char);
        }
        // handle the asserts
        if (scenario["selection is"] !== undefined) {
          assert.strictEqual(
            document.getText(editor.selection),
            scenario["selection is"]
          );
        }
        if (scenario["selections are"] !== undefined) {
          const actual = editor.selections.map((sel) => document.getText(sel));
          assert.deepEqual(actual, scenario["selections are"]);
        }
        if (scenario["text is"] !== undefined) {
          assert.strictEqual(
            document.getText(),
            scenario["text is"]
          );
        }
      });
    }
  });
}
