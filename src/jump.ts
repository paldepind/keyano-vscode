import * as vscode from "vscode";
import { Range, Position, Selection, ThemeColor } from "vscode";

import { TextObject } from "./textobjects";

const numCharCodes = 26;

function createCodeArray(): string[] {
  const arr = new Array(numCharCodes * numCharCodes);
  let codeIndex = 0;
  for (let i = 0; i < numCharCodes; i++) {
    for (let j = 0; j < numCharCodes; j++) {
      arr[codeIndex++] = String.fromCharCode(97 + i) + String.fromCharCode(97 + j);
    }
  }
  return arr;
}

let darkDataUriCache: { [index: string]: vscode.Uri } = {};
let lightDataUriCache: { [index: string]: vscode.Uri } = {};

function getSvgDataUri(code: string, backgroundColor: string, fontColor: string) {
  const width = code.length * 7;
  return vscode.Uri.parse(`data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 13" height="13" width="${width}"><rect width="${width}" height="13" rx="2" ry="2" style="fill: ${backgroundColor};"></rect><text font-family="Fira Mono" font-size="11px" fill="${fontColor}" x="1" y="10">${code}</text></svg>`);
}

function createDataUriCaches(codes: string[]) {
  codes.forEach(code => darkDataUriCache[code] = getSvgDataUri(code, "rgba(255, 255, 255, 0.8)", "black"));
  codes.forEach(code => lightDataUriCache[code] = getSvgDataUri(code, "rgba(0, 0, 0, 0.8)", "white"));
}

function getCodeIndex(code: string): number {
  return (code.charCodeAt(0) - 97) * numCharCodes + code.charCodeAt(1) - 97;
}

function createTextEditorDecorationType(charsToOffset: number) {
  return vscode.window.createTextEditorDecorationType({
    after: {
      margin: `-6px 0 0 ${charsToOffset * -7}px`,
      height: "13px",
      width: "14px"
    }
  });
}

function createDecorationOptions(from: Position, to: Position, text: string): vscode.DecorationOptions {
  return {
    range: new Range(from, to),
    renderOptions: {
      dark: {
        after: {
          contentIconPath: darkDataUriCache[text]
        }
      },
      light: {
        after: {
          contentIconPath: lightDataUriCache[text]
        }
      }
    }
  };
}

const codeArray = createCodeArray();

createDataUriCaches(codeArray);

const decorationTypeOffset2 = createTextEditorDecorationType(2);
const decorationTypeOffset1 = createTextEditorDecorationType(1);

function clearDecorations() {
  const editor = vscode.window.activeTextEditor!;
  editor.setDecorations(decorationTypeOffset2, []);
  editor.setDecorations(decorationTypeOffset1, []);
}

type Target = {
  from: number,
  to: number,
  keys: string
};

export function goToTarget(givenKeys: string, targets: Target[]) {
  const editor = vscode.window.activeTextEditor!;
  const { document } = editor;
  clearDecorations();
  const target = targets.find(({keys}) => givenKeys === keys);
  if (target === undefined) {
    return undefined;
  }
  editor.selection = new Selection(document.positionAt(target.from), document.positionAt(target.to));
}

export function setTargets(textObject: TextObject): Target[] {
  const editor = vscode.window.activeTextEditor!;
  const { document } = editor;
  const text = document.getText();

  const targets = [];
  let result = textObject.findNext(text, { start: 0, end: 0 });
  while (result !== undefined) {
    const { start, end } = result;
    targets.push({ from: start, to: end, keys: codeArray[targets.length] });
    result = textObject.findNext(text, result);
  }

  const decorations = targets.map(({ keys, from, to }, idx) =>
    createDecorationOptions(
    document.positionAt(from),
    document.positionAt(from + 2),
    keys
  ));

  editor.setDecorations(decorationTypeOffset2, decorations);

  return targets;
}