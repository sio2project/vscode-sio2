import * as vscode from "vscode";

export async function getVariables(
    vars: (string | undefined)[],
    prompts: string[]
) {
    if (vars.length !== prompts.length) {
        throw new Error("vars and prompts must have the same length");
    }

    let newVars: (string | undefined)[] = [];

    for (let i = 0; i < vars.length; i++) {
        newVars.push(
            vars[i]
                ? vars[i]
                : await vscode.window.showInputBox({
                      title: prompts[i],
                  })
        );
    }

    let anyEmpty = false;
    for (let i = 0; i < vars.length; i++) {
        if (!newVars[i]) {
            anyEmpty = true;
            break;
        }
    }

    if (anyEmpty) {
        vscode.window.showErrorMessage("You must provide all variables");
        return null;
    }

    return newVars as string[];
}
