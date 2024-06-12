import * as vscode from "vscode";
import Api from "./api";
import * as dto from "./dto";

export interface TreeDataSubProvider<T> {
    getTreeItem(element: T): vscode.TreeItem | Thenable<vscode.TreeItem>;
    getChildren(element?: T): vscode.ProviderResult<T[]>;
    getParent?(element: T): vscode.ProviderResult<T>;
}

export class SubmitItem implements TreeDataSubProvider<TreeItem> {
    constructor(
        readonly id: number,
        readonly problem: ProblemItem,
        readonly date: string,
        readonly score: string | null,
        readonly status: string,
        readonly extensionUri: vscode.Uri
    ) {}

    getChildren() {
        return [];
    }

    getParent() {
        return this.problem;
    }

    getTreeItem() {
        let points = parseInt(this.score ?? "");
        if (points < 0 || points > 100) {
            points = NaN;
        }
        const pointsStr = Number.isNaN(points)
            ? this.status === "CE"
                ? "ce"
                : "null"
            : points.toString();
        return {
            label: {
                label: this.date,
            },
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            contextValue: "submit",
            resourceUri: vscode.Uri.parse(
                `submitdecorationprovider://${pointsStr}`
            ),
            iconPath: vscode.Uri.joinPath(
                this.extensionUri,
                "assets",
                "points",
                `${pointsStr}.svg`
            ),
        };
    }
}

export class ProblemItem implements TreeDataSubProvider<TreeItem> {
    constructor(
        readonly api: Api,
        readonly contest: ContestItem,
        readonly problem: dto.Problem,
        readonly extensionUri: vscode.Uri
    ) {}

    async getChildren() {
        const submitList = await this.api.getSubmissions(
            this.contest.contest.id,
            this.problem.short_name
        );
        return submitList.submissions.map(
            (submit) =>
                new SubmitItem(
                    submit.id,
                    this,
                    submit.date.replace("T", " ").split(".")[0],
                    submit.score,
                    submit.status,
                    this.extensionUri
                )
        );
    }

    getParent() {
        return this.contest;
    }

    getTreeItem() {
        return {
            label: {
                label: this.problem.full_name,
            },
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: "problem",
        };
    }
}

export class ContestItem implements TreeDataSubProvider<TreeItem> {
    constructor(
        private api: Api,
        readonly contest: dto.Contest,
        readonly extensionUri: vscode.Uri
    ) {}

    async getChildren() {
        const problemList = await this.api.getProblems(this.contest.id);
        return problemList.map(
            (problem) =>
                new ProblemItem(this.api, this, problem, this.extensionUri)
        );
    }

    getParent() {
        return undefined;
    }

    getTreeItem(): vscode.TreeItem {
        return {
            label: {
                label: this.contest.name,
            },
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        };
    }
}

export class ErrorItem {
    constructor(private detail: string) {}

    getChildren() {
        return [];
    }

    getParent() {
        return undefined;
    }

    getTreeItem() {
        return {
            label: {
                label: this.detail,
            },
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            contextValue: "error",
        };
    }
}

type TreeItem = SubmitItem | ProblemItem | ContestItem | ErrorItem;

export class ProblemsView {
    constructor(
        context: vscode.ExtensionContext,
        private api: Api,
        private dataChangedEvent: vscode.Event<void>,
        private extensionUri: vscode.Uri
    ) {
        vscode.window.registerFileDecorationProvider(
            new SubmitDecorationProvider()
        );
        const view = vscode.window.createTreeView("sio2-problems", {
            treeDataProvider: this.treeDataProvider(),
            showCollapseAll: true,
        });
        context.subscriptions.push(view);
    }

    treeDataProvider(): vscode.TreeDataProvider<TreeItem> {
        const getContests = async () => {
            try {
                const contests = await this.api.getContests();
                return contests.map(
                    (contest) =>
                        new ContestItem(this.api, contest, this.extensionUri)
                );
            } catch (e) {
                return [new ErrorItem(e?.toString() ?? "Unknown error")];
            }
        };
        return {
            getChildren: (element) =>
                element ? element.getChildren() : getContests(),
            getParent: (element) => element.getParent(),
            getTreeItem: (element) => element.getTreeItem(),
            onDidChangeTreeData: this.dataChangedEvent,
        };
    }
}

class SubmitDecorationProvider implements vscode.FileDecorationProvider {
    provideFileDecoration(
        uri: vscode.Uri,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.FileDecoration> {
        if (uri.scheme === "submitdecorationprovider") {
            const points = uri.authority;
            // TODO: define custom colors
            return {
                color: new vscode.ThemeColor(
                    points === "100"
                        ? "terminal.ansiBrightGreen"
                        : points === "0"
                        ? "terminal.ansiRed"
                        : points === "null"
                        ? ""
                        : "terminal.ansiYellow"
                ),
            };
        }
        return undefined;
    }
}
