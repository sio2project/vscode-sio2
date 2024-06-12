import * as vscode from "vscode";
import * as dto from "./dto";

interface StoredUrl {
    name: string;
    url: string;
    token: string;
}

export default class Api {
    apiData?: StoredUrl;

    constructor(
        private context: vscode.ExtensionContext,
        private onApiUrlUpdate: vscode.EventEmitter<void>
    ) {
        const setApiUrlDisposable = vscode.commands.registerCommand(
            "sio2.setApiUrl",
            () => {
                this.updateApiUrl();
            },
            this
        );
        context.subscriptions.push(setApiUrlDisposable);

        const resetApiUrls = vscode.commands.registerCommand(
            "sio2.resetApiUrls",
            async () => {
                await this.context.globalState.update(
                    "sio2.apiSavedUrls",
                    undefined
                );
                await this.context.globalState.update(
                    "sio2.apiData",
                    undefined
                );
                this.apiData = undefined;
                this.onApiUrlUpdate.fire();
            }
        );
        context.subscriptions.push(resetApiUrls);
    }

    getExtensionUri() {
        return this.context.extensionUri;
    }

    async updateApiUrl() {
        const _savedUrls = await this.context.globalState.get(
            "sio2.apiSavedUrls"
        );
        let savedUrls: StoredUrl[];
        if (_savedUrls === undefined || typeof _savedUrls !== "string") {
            savedUrls = [
                { name: "mimuw", url: "https://sio2.mimuw.edu.pl", token: "" },
                { name: "szkopul", url: "https://szkopul.edu.pl", token: "" },
            ];
            await this.context.globalState.update(
                "sio2.apiSavedUrls",
                JSON.stringify(savedUrls)
            );
        } else {
            savedUrls = JSON.parse(_savedUrls);
        }
        const editIcon = new vscode.ThemeIcon(`notebook-edit`);
        const deleteIcon = new vscode.ThemeIcon(`notebook-delete-cell`);
        const buttons = [
            {
                iconPath: editIcon,
            },
            {
                iconPath: deleteIcon,
            },
        ];
        return new Promise<StoredUrl>((resolve, reject) => {
            const qp = vscode.window.createQuickPick();
            qp.title = "Select which SIO2 API URL you want to use";
            const addItem = {
                label: "Add new URL to the list",
            };
            const qpItems: vscode.QuickPickItem[] = [
                ...savedUrls.map(
                    (url) =>
                        ({
                            label: url.name,
                            detail: url.url,
                            buttons,
                        } satisfies vscode.QuickPickItem)
                ),
                {
                    label: "",
                    kind: vscode.QuickPickItemKind.Separator,
                },
                addItem,
            ];
            qp.items = qpItems;

            qp.onDidAccept(async () => {
                if (qp.selectedItems[0] === addItem) {
                    const name = await vscode.window.showInputBox({
                        title: "Name your API URL",
                        placeHolder: "Name",
                    });
                    if (name === undefined) {
                        vscode.window.showErrorMessage("Name is required");
                        return;
                    }
                    const url = await vscode.window.showInputBox({
                        title: "Enter a valid API URL",
                        placeHolder: "URL",
                        value: "https://",
                        valueSelection: [-1, -1],
                    });
                    if (url === undefined) {
                        vscode.window.showErrorMessage("URL is required");
                        return;
                    }
                    const token = await vscode.window.showInputBox({
                        title: "Enter your API token",
                        placeHolder: "Token",
                    });
                    if (token === undefined) {
                        vscode.window.showErrorMessage("Token is required");
                        return;
                    }
                    await this.context.globalState.update(
                        "sio2.apiSavedUrls",
                        JSON.stringify([{ name, url, token }, ...savedUrls])
                    );
                    await this.updateApiUrl();
                } else {
                    const selectedItem = qp.selectedItems[0];
                    const itemIndex = qpItems.indexOf(selectedItem);
                    this.apiData = savedUrls[itemIndex];
                    if (this.apiData.token === "") {
                        const token = await vscode.window.showInputBox({
                            title: "Enter your API token",
                            placeHolder: "Token",
                        });
                        this.apiData.token = token ?? "";
                    }
                    await this.context.globalState.update(
                        "sio2.apiData",
                        JSON.stringify(this.apiData)
                    );

                    this.onApiUrlUpdate.fire();

                    qp.dispose();
                    resolve(this.apiData);
                }
            });
            qp.onDidHide(() => {
                reject("No API selected");
            });
            qp.onDidTriggerItemButton(async (b) => {
                const index = qp.items.findIndex((v) => v === b.item);

                if (b.button.iconPath === deleteIcon) {
                    const currentlySelected = JSON.stringify(this.apiData);
                    savedUrls = savedUrls.filter((_, i) => i !== index);

                    await this.context.globalState.update(
                        "sio2.apiSavedUrls",
                        JSON.stringify(savedUrls)
                    );
                    qp.items = qp.items.filter((_, i) => i !== index);

                    if (currentlySelected === JSON.stringify(this.apiData)) {
                        this.apiData = undefined;
                        await this.context.globalState.update(
                            "sio2.apiData",
                            undefined
                        );
                        this.onApiUrlUpdate.fire();
                    }
                } else {
                    const oldUrl = JSON.stringify(savedUrls[index]);
                    const name = await vscode.window.showInputBox({
                        title: "Name your API URL",
                        placeHolder: "Name",
                        value: savedUrls[index].name,
                        valueSelection: [0, -1],
                    });
                    const url = await vscode.window.showInputBox({
                        title: "Enter a valid API URL",
                        placeHolder: "URL",
                        value: savedUrls[index].url,
                        valueSelection: [0, -1],
                    });
                    const token = await vscode.window.showInputBox({
                        title: "Enter your API token",
                        placeHolder: "Token",
                        value: savedUrls[index].token,
                        valueSelection: [0, -1],
                    });
                    savedUrls[index] = {
                        name: name ?? savedUrls[index].name,
                        url: url ?? savedUrls[index].url,
                        token: token ?? savedUrls[index].token,
                    };
                    await this.context.globalState.update(
                        "sio2.apiSavedUrls",
                        JSON.stringify(savedUrls)
                    );
                    qp.items = qp.items.map((item, i) => {
                        if (i === index) {
                            return {
                                label: savedUrls[i].name,
                                detail: savedUrls[i].url,
                                buttons,
                            };
                        }
                        return item;
                    });

                    if (
                        (await this.context.globalState.get("sio2.apiData")) ===
                        oldUrl
                    ) {
                        await this.context.globalState.update(
                            "sio2.apiData",
                            JSON.stringify(savedUrls[index])
                        );
                        this.apiData = savedUrls[index];
                        this.onApiUrlUpdate.fire();
                    }
                }
            });
            qp.show();
        });
    }

    private async getApi() {
        if (this.apiData === undefined) {
            const apiData = (await this.context.globalState.get(
                "sio2.apiData"
            )) as string | undefined;
            this.apiData =
                apiData === undefined ? undefined : JSON.parse(apiData);
        }
        if (this.apiData === undefined) {
            await this.updateApiUrl();
        }
        if (this.apiData === undefined) {
            throw new Error("No API selected");
        }
        return this.apiData;
    }

    async getContests() {
        const api = await this.getApi();
        const { url, token } = api;
        if (token === "") {
            throw new Error(`No token provided for ${url}`);
        }
        const res = await fetch(`${url}/api/contest_list`, {
            headers: {
                Accept: "application/json",
                Authorization: `Token ${token}`,
            },
        });
        if (res.status !== 200) {
            throw new Error(`Failed to fetch contests: ${res.statusText}`);
        }
        return (await res.json()) as dto.Contest[];
    }

    async getProblems(contestId: string) {
        const api = await this.getApi();
        const res = await fetch(`${api.url}/api/c/${contestId}/problem_list/`, {
            headers: {
                Accept: "application/json",
                Authorization: `Token ${api.token}`,
            },
        });
        if (res.status !== 200) {
            throw new Error(`Failed to fetch problems: ${res.statusText}`);
        }
        return (await res.json()) as dto.Problem[];
    }

    async getSubmissions(contestId: string, problemId: string) {
        const api = await this.getApi();
        const res = await fetch(
            `${api.url}/api/c/${contestId}/problem_submissions/${problemId}/`,
            {
                headers: {
                    Accept: "application/json",
                    Authorization: `Token ${api.token}`,
                },
            }
        );
        if (res.status !== 200) {
            throw new Error(`Failed to fetch problems: ${res.statusText}`);
        }
        return (await res.json()) as dto.SubmitsInfo;
    }

    async getProblemUrl(contestId: string, problemId: string) {
        const api = await this.getApi();
        return `${api.url}/c/${contestId}/p/${problemId}`;
    }

    async uploadProblemSolution(contestId: string, problemId: string) {
        const api = await this.getApi();
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const text = editor.document.getText();
            const filename = editor.document.fileName.split("/").at(-1)!;
            if (filename.indexOf(".") === -1) {
                vscode.window.showErrorMessage(
                    "Uploading problem solution failed.\nFile must have an extension."
                );
                return;
            }

            if (
                !(await vscode.window.showInformationMessage(
                    `Do you want to submit ${filename} as your solution to ${problemId}?`,
                    { modal: true },
                    { title: "Submit" }
                ))
            ) {
                return;
            }

            let formData = new FormData();
            formData.append("file", new Blob([text]), filename);

            let payload = {
                method: "POST",
                headers: {
                    Authorization: `Token ${api.token}`,
                },
                body: formData,
            };

            const res = await fetch(
                `${api.url}/api/c/${contestId}/submit/${problemId}`,
                payload
            );
            if (res.status !== 200) {
                vscode.window.showErrorMessage(
                    `Uploading problem solution failed.\n${await res.text()}`
                );
                return;
            }
            const submitId = await res.text();
            vscode.window.showInformationMessage(
                `Problem solution uploaded successfully.\nSubmit ID: ${submitId}`
            );
        }
    }

    async getProblemCode(contestId: string, submitId: string) {
        const api = await this.getApi();
        const res = await fetch(
            `${api.url}/api/c/${contestId}/problem_submission_code/${submitId}/`,
            {
                headers: {
                    Accept: "application/json",
                    Authorization: `Token ${api.token}`,
                },
            }
        );
        if (res.status !== 200) {
            throw new Error(`Failed to fetch problems: ${res.statusText}`);
        }
        return (await res.json()) as dto.SubmitCode;
    }
}
