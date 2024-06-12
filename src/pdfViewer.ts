import * as vscode from "vscode";
import Api from "./api";
import JSZip from "jszip";
import { ProblemItem } from "./ProblemsView";
import { getVariables } from "./utils";

export default class PdfViewer {
    constructor(context: vscode.ExtensionContext, api: Api) {
        const openProblemContent = vscode.commands.registerCommand(
            "sio2.openProblemContent",
            async (context: ProblemItem | undefined) => {
                let contestId = context?.contest?.contest?.id;
                let problemId = context?.problem?.short_name;

                const vars = (await getVariables(
                    [contestId, problemId],
                    ["Provide contest id", "Provide problem id"]
                )) as [string, string] | null;
                if (!vars) {
                    return;
                }

                const pdfUrl = await api.getProblemUrl(...vars);
                [contestId, problemId] = vars;

                const panel = vscode.window.createWebviewPanel(
                    problemId,
                    problemId + ".pdf",
                    vscode.ViewColumn.One,
                    {
                        enableScripts: true,
                    }
                );

                async function getFileData() {
                    const res = await fetch(pdfUrl);
                    const fileData = new Uint8Array(await res.arrayBuffer());

                    return await PdfFileDataProvider.fromUint8Array(
                        fileData
                    ).getFileData();
                }

                getWebviewContent(getFileData, panel, api.getExtensionUri());
            }
        );

        context.subscriptions.push(openProblemContent);
    }
}

class DataTypeEnum {
    static BASE64STRING = "base64";
    static UINT8ARRAY = "u8array";
}

class PdfFileDataProvider {
    static DataTypeEnum = DataTypeEnum;

    type;
    data;
    name;

    constructor(type: DataTypeEnum, data: string | Uint8Array) {
        this.type = type;
        this.data = data;
        this.name = "PDF Preview (via API)";
    }

    static fromBase64String(base64Data: any) {
        return new PdfFileDataProvider(DataTypeEnum.BASE64STRING, base64Data);
    }

    static fromUint8Array(u8array: any) {
        return new PdfFileDataProvider(DataTypeEnum.UINT8ARRAY, u8array);
    }

    withName(newName: any) {
        this.name = newName;
        return this;
    }

    getFileData() {
        var _data = this.data;
        var _type = this.type;
        return new Promise(function (resolve, reject) {
            if (typeof _data === "undefined") {
                reject(
                    new TypeError(
                        "Cannot get file data because data is undefined."
                    )
                );
            }
            switch (_type) {
                case DataTypeEnum.BASE64STRING:
                    resolve(_data);
                    break;
                case DataTypeEnum.UINT8ARRAY:
                    var z = new JSZip();
                    z.file("filename.pdf", _data);
                    z.files["filename.pdf"].async("base64").then(
                        function (f: any) {
                            resolve(f);
                        },
                        function (err: any) {
                            reject(err);
                            console.error(
                                "HINT from PDF Viewer API: There was an error converting the pdf file data from a Uint8Array to a base64 string using JSZip."
                            );
                        }
                    );
                    break;

                default:
                    reject(new TypeError("Unknown data type " + _type));
                    break;
            }
        });
    }
}

function getWebviewContent(getFileData: any, panel: any, extUri: any) {
    panel.webview.options = {
        enableScripts: true,
    };
    panel.webview.html = `<!DOCTYPE html>
    <html>
    
    <head>
      <script defer src="${panel.webview.asWebviewUri(
          vscode.Uri.joinPath(extUri, "media", "pdf.min.js")
      )}"></script>
      <script defer src="${panel.webview.asWebviewUri(
          vscode.Uri.joinPath(extUri, "media", "editor.js")
      )}"></script>
      <link rel="stylesheet" href="${panel.webview.asWebviewUri(
          vscode.Uri.joinPath(extUri, "media", "editor.css")
      )}">
    </head>
    
    <body>
    
      <div id="loading">
        <h1>Your PDF is loading...</h1>
        <p>If you see this screen for more than a few seconds, close this editor tab and reopen the file.</p>
      </div>
      <div id="canvas"></div>
    
    </body>
    
    </html>`;
    getFileData().then(function (data: any) {
        panel.webview.postMessage({
            command: "base64",
            data: data,
            workerUri: panel.webview
                .asWebviewUri(
                    vscode.Uri.joinPath(extUri, "media", "pdf.worker.min.js")
                )
                .toString(true),
        });
    });
}
