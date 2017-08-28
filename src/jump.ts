import * as vscode from "vscode";
import { Range, Position, Selection, ThemeColor } from "vscode";

import { TextObject } from "./textobjects";

const plusMinusLines = 60;
const numCharCodes = 26;

function createCodeArray(): string[] {
  const codeArray = new Array(numCharCodes * numCharCodes);
  let codeIndex = 0;
  for (let i = 0; i < numCharCodes; i++) {
    for (let j = 0; j < numCharCodes; j++) {
      codeArray[codeIndex++] = String.fromCharCode(97 + i) + String.fromCharCode(97 + j);
    }
  }
  return codeArray;
}

let darkDataUriCache: { [index: string]: vscode.Uri } = {};
let lightDataUriCache: { [index: string]: vscode.Uri } = {};

function getSvgDataUri(code: string, backgroundColor: string, fontColor: string) {
  const width = code.length * 7;
  return vscode.Uri.parse(`data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 13" height="13" width="${width}"><rect width="${width}" height="13" rx="2" ry="2" style="fill: ${backgroundColor};"></rect><text font-family="Fira Mono" font-size="11px" fill="${fontColor}" x="1" y="10">${code}</text></svg>`);
}

function createDataUriCaches(codeArray: string[]) {
  codeArray.forEach(code => darkDataUriCache[code] = getSvgDataUri(code, 'rgba(255, 255, 255, 0.6)', 'black'))
  codeArray.forEach(code => lightDataUriCache[code] = getSvgDataUri(code, 'rgba(0, 0, 0, 0.6)', 'white'))
}

function getCodeIndex(code: string): number {
  return (code.charCodeAt(0) - 97) * numCharCodes + code.charCodeAt(1) - 97;
}

function getLines(editor: vscode.TextEditor): { firstLineNumber: number, lines: string[] } {
  const document = editor.document;
  const activePosition = editor.selection.active;

  const startLine = activePosition.line < plusMinusLines ? 0 : activePosition.line - plusMinusLines;
  const endLine = (document.lineCount - activePosition.line) < plusMinusLines ? document.lineCount : activePosition.line + plusMinusLines;

  const lines: string[] = [];
  for (let i = startLine; i < endLine; i++) {
    lines.push(document.lineAt(i).text);
  }

  return {
    firstLineNumber: startLine,
    lines
  };
}

function createTextEditorDecorationType(charsToOffset: number) {
  return vscode.window.createTextEditorDecorationType({
    after: {
      margin: `-6px 0 0 ${charsToOffset * -7}px`,
      height: '13px',
      width: '14px'
    }
  });
}

function createDecorationOptions(line: number, startCharacter: number, endCharacter: number, code: string): vscode.DecorationOptions {
  return {
    range: new vscode.Range(line, startCharacter, line, endCharacter),
    renderOptions: {
      dark: {
        after: {
          contentText: code
        }
      },
      light: {
        after: {
          contentIconPath: lightDataUriCache[code]
        }
      }
    }
  };
}

function createDecorationOptions2(from: Position, to: Position, text: string): vscode.DecorationOptions {
  return {
    range: new Range(from, to),
    renderOptions: {
      dark: {
        after: {
          contentText: text
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

function clearDecorations() {
  const editor = vscode.window.activeTextEditor!;
  editor.setDecorations(decorationTypeOffset2, []);
  editor.setDecorations(decorationTypeOffset1, []);
}

interface JumpyPosition {
  line: number;
  character: number;
  charOffset: number;
}

interface JumpyFn {
  (maxDecorations: number, firstLineNumber: number, lines: string[], regexp: RegExp): JumpyPosition[]
}

function jumpyWord(maxDecorations: number, firstLineNumber: number, lines: string[], regexp: RegExp): JumpyPosition[] {
  let positionIndex = 0;
  const positions: JumpyPosition[] = [];
  for (let i = 0; i < lines.length && positionIndex < maxDecorations; i++) {
    let lineText = lines[i];
    let word: RegExpExecArray;
    while (!!(word = regexp.exec(lineText)) && positionIndex < maxDecorations) {
      positions.push({ line: i + firstLineNumber, character: word.index, charOffset: 2 });
    }
  }
  return positions;
}

function jumpyLine(maxDecorations: number, firstLineNumber: number, lines: string[], regexp: RegExp): JumpyPosition[] {
  let positionIndex = 0;
  const positions: JumpyPosition[] = [];
  for (let i = 0; i < lines.length && positionIndex < maxDecorations; i++) {
    if (!lines[i].match(regexp)) {
      positions.push({ line: i + firstLineNumber, character: 0, charOffset: lines[i].length == 1 ? 1 : 2 });
    }
  }
  return positions;
}

const codeArray = createCodeArray();

createDataUriCaches(codeArray);

const decorationTypeOffset2 = createTextEditorDecorationType(2);
const decorationTypeOffset1 = createTextEditorDecorationType(1);

let firstKeyOfCode: string | null;
let positions: JumpyPosition[];

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
  let from = 0;
  let to = 0;
  let result;
  while (result = textObject.findNext(text, from, to)) {
    const { start, end } = result;
    targets.push({ from: start, to: end, keys: codeArray[targets.length] });
    from = start;
    to = end;
  }

  const decorations = targets.map(({ keys, from, to }, idx) =>
    createDecorationOptions2(
    document.positionAt(from),
    document.positionAt(from + 2),
    keys
  ));

  editor.setDecorations(decorationTypeOffset2, decorations);

  return targets;

  // const getLinesResult = getLines(editor);
  // positions = jumpyFn(codeArray.length, getLinesResult.firstLineNumber, getLinesResult.lines, regexp);

  // const decorationsOffset2 = positions
  //   .map((position, i) => position.charOffset == 1 ? null : createDecorationOptions(position.line, position.character, position.character + 2, codeArray[i]))
  //   .filter(x => !!x);

  // const decorationsOffset1 = positions
  //   .map((position, i) => position.charOffset == 2 ? null : createDecorationOptions(position.line, position.character, position.character + 2, codeArray[i]))
  //   .filter(x => !!x);

  // editor.setDecorations(decorationTypeOffset2, decorationsOffset2);
  // editor.setDecorations(decorationTypeOffset1, decorationsOffset1);

  // setJumpyMode(true);
  // firstKeyOfCode = null;
}

function notCalled(context: vscode.ExtensionContext) {

  let firstLineNumber = 0;
  let isJumpyMode: boolean = false;
  setJumpyMode(false);

  function setJumpyMode(value: boolean) {
    isJumpyMode = value;
    vscode.commands.executeCommand('setContext', 'jumpy.isJumpyMode', value);
  }

  function exitJumpyMode() {
    const editor = vscode.window.activeTextEditor!;
    setJumpyMode(false);
    editor.setDecorations(decorationTypeOffset2, []);
    editor.setDecorations(decorationTypeOffset1, []);
  }

  const jumpyTypeDisposable = vscode.commands.registerCommand('type', args => {
    if (!isJumpyMode) {
      vscode.commands.executeCommand('default:type', args);
      return;
    }

    const editor = vscode.window.activeTextEditor;
    const text: string = args.text;

    if (text.search(/[a-z]/i) === -1) {
      exitJumpyMode();
      return;
    }

    if (!firstKeyOfCode) {
      firstKeyOfCode = text;
      return;
    }

    const code = firstKeyOfCode + text;
    const position = positions[getCodeIndex(code.toLowerCase())];

    editor!.setDecorations(decorationTypeOffset2, []);
    editor!.setDecorations(decorationTypeOffset1, []);

    vscode.window.activeTextEditor!.selection = new vscode.Selection(position.line, position.character, position.line, position.character);

    const reviewType: vscode.TextEditorRevealType = vscode.TextEditorRevealType.Default;
    vscode.window.activeTextEditor!.revealRange(vscode.window.activeTextEditor!.selection, reviewType);

    setJumpyMode(false);
  });
  context.subscriptions.push(jumpyTypeDisposable);

  const exitJumpyModeDisposable = vscode.commands.registerCommand('extension.jumpy-exit', () => {
    exitJumpyMode();
  });
  context.subscriptions.push(exitJumpyModeDisposable);

  const didChangeActiveTextEditorDisposable = vscode.window.onDidChangeActiveTextEditor(event => exitJumpyMode());
  context.subscriptions.push(didChangeActiveTextEditorDisposable);
}
