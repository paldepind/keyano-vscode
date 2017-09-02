import { workspace, window, Selection, TextDocument } from "vscode";

// Helper functions for interacting with VSCode

export type Range = {
  start: number,
  end: number
};

export function rangeToSelection(document: TextDocument, range: Range): Selection {
  return new Selection(
    document.positionAt(range.start),
    document.positionAt(range.end)
  );
}

export function selectionToRange(document: TextDocument, selection: Selection): Range {
  return { start: document.offsetAt(selection.start), end: document.offsetAt(selection.end) };
}

export function getSelections(): Selection[] {
  const editor = window.activeTextEditor!;
  return editor.selections;
}

export function setSelections(selections: Selection[]): void {
  window.activeTextEditor!.selections = selections;
}

/**
 * Gets the text inside a selection as a string
 */
export function getText(selection: Selection): string {
  const editor = window.activeTextEditor!;
  return editor.document.getText(selection);
}

export function replaceText(selection: Selection, newText: string): Thenable<any> {
  return window.activeTextEditor!.edit((builder) => {
    builder.replace(selection, newText);
  });
}
