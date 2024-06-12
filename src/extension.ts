import * as vscode from "vscode";
import { ProblemsView } from "./ProblemsView";
import Api from "./api";
import PdfViewer from "./pdfViewer";
import { getVariables } from "./utils";
import { SubmitCode } from "./submitCode";

export function activate(context: vscode.ExtensionContext) {
    const dataDidChangeEventEmitter = new vscode.EventEmitter<void>();

    const api = new Api(context, dataDidChangeEventEmitter);
    new ProblemsView(
        context,
        api,
        dataDidChangeEventEmitter.event,
        context.extensionUri
    );
    new PdfViewer(context, api);
    new SubmitCode(context, api);

    const refreshContests = vscode.commands.registerCommand(
        "sio2.refreshContests",
        () => {
            dataDidChangeEventEmitter.fire();
        }
    );
    context.subscriptions.push(refreshContests);

    const uploadProblemSolution = vscode.commands.registerCommand(
        "sio2.uploadProblemSolution",
        async (context) => {
            let contestId = context?.contest?.contest?.id;
            let problemId = context?.problem?.short_name;

            const vars = (await getVariables(
                [contestId, problemId],
                ["Provide contest id", "Provide problem id"]
            )) as [string, string] | null;
            if (!vars) {
                return;
            }

            await api.uploadProblemSolution(...vars);
        }
    );
    context.subscriptions.push(uploadProblemSolution);
}

export function deactivate() {}
