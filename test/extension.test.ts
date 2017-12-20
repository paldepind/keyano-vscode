import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as yaml from "js-yaml";
import * as assert from "assert";
import * as vscode from "vscode";
import { window, Selection, workspace } from "vscode";
import { extension } from "../src/extension";

function randomName() {
  return Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, "")
    .substr(0, 10);
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

let originalKeyboardLayout: string;

async function setupWorkspace(fileExtension: string = ""): Promise<void> {
  if (vscode.window.activeTextEditor === undefined) {
    // should only run once before the first test
    const file = await createRandomFile("");
    const doc = await vscode.workspace.openTextDocument(file);
    await vscode.window.showTextDocument(doc);
  }
  assert.ok(vscode.window.activeTextEditor);
}

async function setFileContent(text: string): Promise<vscode.TextEditor> {
  await setupWorkspace();
  extension.setLayout("qwerty");
  const editor = window.activeTextEditor;
  if (editor === undefined) {
    throw new Error("No active editor");
  }
  const { document } = editor;
  const selection = new Selection(
    document.positionAt(0),
    document.positionAt(Infinity)
  );
  await editor.edit((builder) => {
    builder.delete(selection);
    builder.insert(document.positionAt(0), text);
  });
  return editor;
}

type Scenario = {
  it: string;
  start: string;
  input: string;
  "selection is"?: string;
  "selections are"?: string[];
  "text is"?: string;
};

function checkScenario(scenario: object) {
  if (!("input" in scenario)) {
    throw new Error("Scenario misses input key");
  }
}

type Describe = {
  describe: string;
  scenarios?: Scenario[];
  cases?: Describe[];
};

// VSCode compiles this TS file into a JS file in /out/test and the
// yaml file is not copied into this directory
const filePath = path.join(__dirname, "../../test/extension.yaml");

const tests: Describe[] = yaml.safeLoad(fs.readFileSync(filePath, "utf8"));

function testScenarios(scenarios: Scenario[]): void {
  for (const scenario of scenarios) {
    it(scenario.it, async () => {
      checkScenario(scenario);

      // Ensure that we begin each test in command mode
      extension.enterCommandMode();

      const editor = await setFileContent(
        scenario.start
          .replace("|", "")
          .replace("[", "")
          .replace("]", "")
      );
      const { document } = editor;
      // Handle pipe, currently only supports one
      const cursorPosition = scenario.start.indexOf("|");
      if (cursorPosition !== -1) {
        editor.selection = new Selection(
          document.positionAt(cursorPosition),
          document.positionAt(cursorPosition)
        );
      }
      // Handle brackets, currently only supports a single pair
      const openBracket = scenario.start.indexOf("[");
      const closeBracket = scenario.start.indexOf("]");
      if (openBracket !== -1 && closeBracket !== -1) {
        editor.selection = new Selection(
          document.positionAt(openBracket),
          document.positionAt(closeBracket - 1)
        );
      }
      for (const char of scenario.input) {
        await extension.handleInput({ text: char });
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
        assert.strictEqual(document.getText(), scenario["text is"]);
      }
    });
  }
}

function doDescriptions(descriptions: Describe[]): void {
  for (const description of descriptions) {
    describe(description.describe, () => {
      if (description.scenarios !== undefined) {
        testScenarios(description.scenarios);
      }

      if (description.cases !== undefined) {
        doDescriptions(description.cases);
      }
    });
  }
}

doDescriptions(tests);
