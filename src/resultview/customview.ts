import { WebviewPanel, WebviewView, WebviewViewProvider, WebviewViewResolveContext, CancellationToken, window, ViewColumn, Disposable, Uri, commands } from "vscode";
import { EventEmitter } from "events";
import { join } from "path";

export interface Message {
    type: string;
    payload: any;
}

export class CustomView extends EventEmitter implements Disposable, WebviewViewProvider {
    private disposable?: Disposable;

    private resourcesPath: string;
    private panel: WebviewPanel | undefined;
    private webviewView: WebviewView | undefined;
    private pendingRender?: (wv: WebviewView) => void;
    private isHtmlLoaded: boolean = false;

    constructor(private type: string, private title: string, extensionPath: string = "") {
        super();
        this.resourcesPath = extensionPath ? join(extensionPath, "dist") : "";
    }

    resolveWebviewView(
        webviewView: WebviewView,
        _context: WebviewViewResolveContext,
        _token: CancellationToken
    ): Thenable<void> | void {
        this.webviewView = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [Uri.file(this.resourcesPath)]
        };

        webviewView.webview.onDidReceiveMessage((message: Message) => {
            this.handleMessage(message);
        });

        webviewView.onDidDispose(() => {
            this.webviewView = undefined;
            this.isHtmlLoaded = false;
        });

        if (this.pendingRender) {
            this.pendingRender(webviewView);
            this.pendingRender = undefined;
        }
    }

    show(basePath: string, recordsPerPage: number, position: string = "bottom") {
        this.resourcesPath = join(basePath, "dist");
        const jsPath = join(this.resourcesPath, "resultview.js");

        const buildHtml = (webview: any) => `
            <html>
                <head>
                    <title>ResultView</title>
                </head>
                <body>
                    <div id="root"></div>
                    <script>const RECORDS_PER_PAGE=${recordsPerPage || 20}</script>
                    <script src="${webview.asWebviewUri(Uri.file(jsPath)).toString()}"></script>
                </body>
            </html>
        `;

        if (position === "bottom") {
            if (this.panel) {
                this.panel.dispose();
                this.panel = undefined;
            }

            const render = (wv: WebviewView) => {
                wv.show(true);
                if (!this.isHtmlLoaded) {
                    wv.webview.html = buildHtml(wv.webview);
                    this.isHtmlLoaded = true;
                }
            };

            if (this.webviewView) {
                render(this.webviewView);
            } else {
                this.pendingRender = render;
                const focusCmd = commands.executeCommand("sqlite.resultView.focus");
                if (focusCmd && typeof focusCmd.then === "function") {
                    focusCmd.then(undefined, () => {});
                }

                // Fallback for tests or environments where WebviewView is not resolved
                setTimeout(() => {
                    if (!this.webviewView && this.pendingRender) {
                        this.pendingRender = undefined;
                        if (!this.panel) {
                            this.init("beside");
                        }
                        if (!this.isHtmlLoaded) {
                            this.panel!.webview.html = buildHtml(this.panel!.webview);
                            this.isHtmlLoaded = true;
                        }
                    }
                }, 400);
            }
        } else {
            if (!this.panel) {
                this.init(position);
                this.panel!.webview.html = buildHtml(this.panel!.webview);
                this.isHtmlLoaded = true;
            }
        }
    }

    send(message: Message) {
        if (this.webviewView) {
            this.webviewView.webview.postMessage(message);
        }
        if (this.panel) {
            this.panel.webview.postMessage(message);
        }
    }

    handleMessage(message: Message) {
        throw new Error("Method not implemented");
    }

    dispose() {
        if (this.disposable) {
            this.disposable.dispose();
        }
        this.panel = undefined;
        this.webviewView = undefined;
        this.pendingRender = undefined;
        this.isHtmlLoaded = false;
    }

    private init(position: string = "beside") {
        let subscriptions = [];

        let options = {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [Uri.file(this.resourcesPath)]
        };

        let viewColumn = ViewColumn.Two;
        if (position === "current") {
            viewColumn = ViewColumn.Active;
        }

        this.panel = window.createWebviewPanel(this.type, this.title, viewColumn,
            options
        );
        subscriptions.push(this.panel);

        subscriptions.push(this.panel.onDidDispose(() => this.dispose()));

        subscriptions.push(this.panel.webview.onDidReceiveMessage((message: Message) => {
            this.handleMessage(message);
        }));

        this.disposable = Disposable.from(...subscriptions);
    }
}
