import vscode = require("vscode");
import ResultView from "../../../src/resultview";
import { Result } from "../../../src/common";

jest.mock("vscode");

describe("ResultView Export & Display", () => {
    let resultView: ResultView;

    beforeEach(() => {
        jest.clearAllMocks();
        resultView = new ResultView("/path/to/ext");
    });

    test("exports single result to single-row SQL when configured to single", async () => {
        const mockResult: Result = {
            stmt: "SELECT * FROM users;",
            header: ["id", "name"],
            rows: [["1", "Alice"], ["2", "Bob"]]
        };
        (resultView as any).resultSet = [mockResult];

        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get: jest.fn((key: string, defaultVal: any) => {
                if (key === "insertExportStyle") return "single";
                if (key === "insertExportBatchSize") return 500;
                return defaultVal;
            })
        });

        (resultView as any).handleMessage({
            type: "EXPORT_RESULTS",
            payload: { result: 0, format: "sql" }
        });

        await new Promise(resolve => setTimeout(resolve, 50));

        expect(vscode.workspace.openTextDocument).toHaveBeenCalledTimes(1);
        const openArgs = (vscode.workspace.openTextDocument as jest.Mock).mock.calls[0][0];
        expect(openArgs.language).toBe("sql");
        expect(openArgs.content).toContain("INSERT INTO users (id, name) VALUES (1, 'Alice');");
        expect(openArgs.content).toContain("INSERT INTO users (id, name) VALUES (2, 'Bob');");
    });

    test("prompts with QuickPick by default when insertExportStyle is prompt or unset", async () => {
        const mockResult: Result = {
            stmt: "SELECT * FROM users;",
            header: ["id", "name"],
            rows: [["1", "Alice"]]
        };
        (resultView as any).resultSet = [mockResult];

        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get: jest.fn((key: string, defaultVal: any) => defaultVal)
        });

        (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
            label: "Single-Value INSERT",
            multiValue: false
        });

        (resultView as any).handleMessage({
            type: "EXPORT_RESULTS",
            payload: { result: 0, format: "sql" }
        });

        await new Promise(resolve => setTimeout(resolve, 50));

        expect(vscode.window.showQuickPick).toHaveBeenCalledTimes(1);
        expect(vscode.workspace.openTextDocument).toHaveBeenCalledTimes(1);
        const openArgs = (vscode.workspace.openTextDocument as jest.Mock).mock.calls[0][0];
        expect(openArgs.content).toContain("INSERT INTO users (id, name) VALUES (1, 'Alice');");
    });

    test("exports result to multi-values batch SQL when configured", async () => {
        const mockResult: Result = {
            stmt: "SELECT * FROM users;",
            header: ["id", "name"],
            rows: [["1", "Alice"], ["2", "Bob"]]
        };
        (resultView as any).resultSet = [mockResult];

        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get: jest.fn((key: string, defaultVal: any) => {
                if (key === "insertExportStyle") return "multi";
                if (key === "insertExportBatchSize") return 500;
                return defaultVal;
            })
        });

        (resultView as any).handleMessage({
            type: "EXPORT_RESULTS",
            payload: { result: 0, format: "sql" }
        });

        await new Promise(resolve => setTimeout(resolve, 50));

        expect(vscode.workspace.openTextDocument).toHaveBeenCalledTimes(1);
        const openArgs = (vscode.workspace.openTextDocument as jest.Mock).mock.calls[0][0];
        expect(openArgs.language).toBe("sql");
        expect(openArgs.content).toContain("INSERT INTO users (id, name) VALUES");
        expect(openArgs.content).toContain("  (1, 'Alice'),");
        expect(openArgs.content).toContain("  (2, 'Bob');");
    });

    test("prompts with QuickPick when insertExportStyle is prompt", async () => {
        const mockResult: Result = {
            stmt: "SELECT * FROM users;",
            header: ["id", "name"],
            rows: [["1", "Alice"]]
        };
        (resultView as any).resultSet = [mockResult];

        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get: jest.fn((key: string, defaultVal: any) => {
                if (key === "insertExportStyle") return "prompt";
                if (key === "insertExportBatchSize") return 500;
                return defaultVal;
            })
        });

        (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
            label: "Multi-Values INSERT",
            multiValue: true
        });

        (resultView as any).handleMessage({
            type: "EXPORT_RESULTS",
            payload: { result: 0, format: "sql" }
        });

        await new Promise(resolve => setTimeout(resolve, 50));

        expect(vscode.window.showQuickPick).toHaveBeenCalledTimes(1);
        expect(vscode.workspace.openTextDocument).toHaveBeenCalledTimes(1);
        const openArgs = (vscode.workspace.openTextDocument as jest.Mock).mock.calls[0][0];
        expect(openArgs.content).toContain("INSERT INTO users (id, name) VALUES");
    });

    test("handles undefined result safely when index is out of bounds", async () => {
        (resultView as any).resultSet = [];

        expect(() => {
            (resultView as any).handleMessage({
                type: "EXPORT_RESULTS",
                payload: { result: 0, format: "sql" }
            });
        }).not.toThrow();

        await new Promise(resolve => setTimeout(resolve, 50));
        expect(vscode.workspace.openTextDocument).not.toHaveBeenCalled();
    });

    test("exports only selected rows when rows array is provided in payload", async () => {
        const mockResult: Result = {
            stmt: "SELECT * FROM users;",
            header: ["id", "name"],
            rows: [["1", "Alice"], ["2", "Bob"], ["3", "Charlie"]]
        };
        (resultView as any).resultSet = [mockResult];

        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get: jest.fn((key: string, defaultVal: any) => {
                if (key === "insertExportStyle") return "single";
                if (key === "insertExportBatchSize") return 500;
                return defaultVal;
            })
        });

        // Only export Bob (row 2)
        (resultView as any).handleMessage({
            type: "EXPORT_RESULTS",
            payload: { result: 0, format: "sql", rows: [["2", "Bob"]] }
        });

        await new Promise(resolve => setTimeout(resolve, 50));

        expect(vscode.workspace.openTextDocument).toHaveBeenCalledTimes(1);
        const openArgs = (vscode.workspace.openTextDocument as jest.Mock).mock.calls[0][0];
        expect(openArgs.content).toContain("INSERT INTO users (id, name) VALUES (2, 'Bob');");
        expect(openArgs.content).not.toContain("Alice");
        expect(openArgs.content).not.toContain("Charlie");
    });

    test("copies text to clipboard and shows status message on COPY_TO_CLIPBOARD message", () => {
        (vscode.env.clipboard.writeText as jest.Mock) = jest.fn();
        (vscode.window.setStatusBarMessage as jest.Mock) = jest.fn();

        (resultView as any).handleMessage({
            type: "COPY_TO_CLIPBOARD",
            payload: { text: "1\tAlice\n2\tBob" }
        });

        expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith("1\tAlice\n2\tBob");
        expect(vscode.window.setStatusBarMessage).toHaveBeenCalledWith("Copied to clipboard.", 2000);
    });

    test("resolves WebviewView and handles pending render", () => {
        const mockWebviewView: any = {
            webview: {
                options: {},
                onDidReceiveMessage: jest.fn(),
                asWebviewUri: jest.fn((uri: any) => uri)
            },
            show: jest.fn(),
            onDidDispose: jest.fn()
        };

        resultView.show("/test/path", 50, "bottom");

        resultView.resolveWebviewView(mockWebviewView, {} as any, {} as any);

        expect(mockWebviewView.webview.onDidReceiveMessage).toHaveBeenCalled();
        expect(mockWebviewView.show).toHaveBeenCalledWith(true);
        expect(mockWebviewView.webview.html).toContain("const RECORDS_PER_PAGE=50");
    });
});
