import * as vscode from "vscode";
import { getVariables } from "./utils";
import Api from "./api";

export class SubmitCode {
    constructor(context: vscode.ExtensionContext, readonly api: Api) {
        const provider = new DynamicContentProvider();
        const providerRegistration =
            vscode.workspace.registerTextDocumentContentProvider(
                "sio2-submit-code",
                provider
            );

        context.subscriptions.push(providerRegistration);

        let disposable = vscode.commands.registerCommand(
            "sio2.openSubmitCode",
            async (context) => {
                let submitId = context?.id;
                let contestId = context?.problem?.contest?.contest?.id;
                let fileName = context?.problem?.problem?.short_name;

                const vars = (await getVariables(
                    [contestId, submitId, fileName],
                    [
                        "Provide contest id",
                        "Provide submit id",
                        "Provide filename",
                    ]
                )) as [string, string, string] | null;
                if (!vars) {
                    return;
                }
                [contestId, submitId, fileName] = vars;

                const pc = await api.getProblemCode(contestId, submitId);
                const code = encodeURIComponent(pc.code); //context?.identifier || "defaultIdentifier";
                const title = encodeURIComponent(`${fileName}.${pc.lang}`);
                const uri = vscode.Uri.parse(
                    `sio2-submit-code:/${title}?code=${code}`
                );
                await provider.update(uri);
                let doc = await vscode.workspace.openTextDocument(uri);
                await vscode.window.showTextDocument(doc, { preview: false });
            }
        );

        context.subscriptions.push(disposable);
    }
}

class DynamicContentProvider implements vscode.TextDocumentContentProvider {
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();

    onDidChange?: vscode.Event<vscode.Uri> = this._onDidChange.event;

    async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
        const query = new URLSearchParams(uri.query);
        return query.get("code") as string;
    }

    public update(uri: vscode.Uri) {
        this._onDidChange.fire(uri);
    }
}
