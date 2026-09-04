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
                if (key === "insertExportExcludeId") return true;
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
        expect(openArgs.content).toContain("INSERT INTO users (name) VALUES ('Alice');");
        expect(openArgs.content).toContain("INSERT INTO users (name) VALUES ('Bob');");
    });

    test("exports result including ID when insertExportExcludeId is configured to false", async () => {
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
                if (key === "insertExportExcludeId") return false;
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
            label: "Single-Value INSERT (Exclude ID)",
            multiValue: false,
            excludeId: true
        });

        (resultView as any).handleMessage({
            type: "EXPORT_RESULTS",
            payload: { result: 0, format: "sql" }
        });

        await new Promise(resolve => setTimeout(resolve, 50));

        expect(vscode.window.showQuickPick).toHaveBeenCalledTimes(1);
        const quickPickItems = (vscode.window.showQuickPick as jest.Mock).mock.calls[0][0];
        expect(quickPickItems[0].excludeId).toBe(true);
        expect(quickPickItems[0].label).toContain("Exclude ID");

        expect(vscode.workspace.openTextDocument).toHaveBeenCalledTimes(1);
        const openArgs = (vscode.workspace.openTextDocument as jest.Mock).mock.calls[0][0];
        expect(openArgs.content).toContain("INSERT INTO users (name) VALUES ('Alice');");
    });

    test("orders Include ID options first in QuickPick when insertExportExcludeId is false", async () => {
        const mockResult: Result = {
            stmt: "SELECT * FROM users;",
            header: ["id", "name"],
            rows: [["1", "Alice"]]
        };
        (resultView as any).resultSet = [mockResult];

        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get: jest.fn((key: string, defaultVal: any) => {
                if (key === "insertExportStyle") return "prompt";
                if (key === "insertExportExcludeId") return false;
                return defaultVal;
            })
        });

        (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
            label: "Single-Value INSERT (Include ID)",
            multiValue: false,
            excludeId: false
        });

        (resultView as any).handleMessage({
            type: "EXPORT_RESULTS",
            payload: { result: 0, format: "sql" }
        });

        await new Promise(resolve => setTimeout(resolve, 50));

        expect(vscode.window.showQuickPick).toHaveBeenCalledTimes(1);
        const quickPickItems = (vscode.window.showQuickPick as jest.Mock).mock.calls[0][0];
        expect(quickPickItems[0].excludeId).toBe(false);
        expect(quickPickItems[0].label).toContain("Include ID");

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
                if (key === "insertExportExcludeId") return true;
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
        expect(openArgs.content).toContain("INSERT INTO users (name) VALUES");
        expect(openArgs.content).toContain("  ('Alice'),");
        expect(openArgs.content).toContain("  ('Bob');");
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
                if (key === "insertExportExcludeId") return true;
                return defaultVal;
            })
        });

        (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
            label: "Multi-Values INSERT (Exclude ID)",
            multiValue: true,
            excludeId: true
        });

        (resultView as any).handleMessage({
            type: "EXPORT_RESULTS",
            payload: { result: 0, format: "sql" }
        });

        await new Promise(resolve => setTimeout(resolve, 50));

        expect(vscode.window.showQuickPick).toHaveBeenCalledTimes(1);
        expect(vscode.workspace.openTextDocument).toHaveBeenCalledTimes(1);
        const openArgs = (vscode.workspace.openTextDocument as jest.Mock).mock.calls[0][0];
        expect(openArgs.content).toContain("INSERT INTO users (name) VALUES");
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
        expect(openArgs.content).toContain("INSERT INTO users (name) VALUES ('Bob');");
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

    test("updates sqlite configuration and shows status message on UPDATE_CONFIG message", () => {
        const mockUpdate = jest.fn();
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            update: mockUpdate
        });
        (vscode.window.setStatusBarMessage as jest.Mock) = jest.fn();

        (resultView as any).handleMessage({
            type: "UPDATE_CONFIG",
            payload: { recordsPerPage: 100 }
        });

        expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith("sqlite");
        expect(mockUpdate).toHaveBeenCalledWith("recordsPerPage", 100, true);
        expect(vscode.window.setStatusBarMessage).toHaveBeenCalledWith("SQLite: Records per page set to 100", 3000);
    });

    test("opens extension settings on OPEN_SETTINGS message", () => {
        (vscode.commands.executeCommand as jest.Mock) = jest.fn();

        (resultView as any).handleMessage({
            type: "OPEN_SETTINGS"
        });

        expect(vscode.commands.executeCommand).toHaveBeenCalledWith("workbench.action.openSettings", "@ext:alexcvzz.vscode-sqlite");
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

    test("manages multiple query tabs and scopes FETCH_ROWS and EXPORT_RESULTS to queryId", async () => {
        const mockSend = jest.fn();
        (resultView as any).send = mockSend;
        (resultView as any).show = jest.fn();

        const rs1: Result[] = [{
            stmt: "SELECT * FROM users;",
            header: ["id", "name"],
            rows: [["1", "Alice"], ["2", "Bob"]]
        }];
        const rs2: Result[] = [{
            stmt: "SELECT * FROM products;",
            header: ["id", "item"],
            rows: [["10", "Laptop"], ["20", "Phone"]]
        }];

        // Execute query 1
        resultView.display(Promise.resolve(rs1), 50, "bottom");
        await new Promise(resolve => setTimeout(resolve, 20));

        expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
            type: "FETCH_RESULTS",
            payload: expect.objectContaining({
                title: expect.stringContaining("users"),
                statement: "SELECT * FROM users;"
            })
        }));

        const q1Id = mockSend.mock.calls[0][0].payload.queryId;

        // Execute query 2
        resultView.display(Promise.resolve(rs2), 50, "bottom");
        await new Promise(resolve => setTimeout(resolve, 20));

        expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
            type: "FETCH_RESULTS",
            payload: expect.objectContaining({
                title: expect.stringContaining("products"),
                statement: "SELECT * FROM products;"
            })
        }));

        const q2Id = mockSend.mock.calls[1][0].payload.queryId;
        expect(q1Id).not.toEqual(q2Id);

        // Fetch rows for Query 1
        (resultView as any).handleMessage({
            type: "FETCH_ROWS",
            payload: { queryId: q1Id, result: 0, offset: 0, limit: 1 }
        });

        expect(mockSend).toHaveBeenCalledWith({
            type: "FETCH_ROWS",
            payload: {
                queryId: q1Id,
                result: 0,
                rows: [["1", "Alice"]],
                offset: 0,
                limit: 1
            }
        });

        // Close query 1
        (resultView as any).handleMessage({
            type: "CLOSE_QUERY",
            payload: { queryId: q1Id }
        });
        expect((resultView as any).queryResults.has(q1Id)).toBe(false);
        expect((resultView as any).queryResults.has(q2Id)).toBe(true);

        // Clear all queries
        (resultView as any).handleMessage({
            type: "CLEAR_ALL_QUERIES"
        });
        expect((resultView as any).queryResults.size).toBe(0);
        expect((resultView as any).queryTabs.length).toBe(0);
    });

    test("handles APPLY_FILTER message and updates filtered results and query statement", async () => {
        const mockSend = jest.fn();
        (resultView as any).send = mockSend;
        (resultView as any).show = jest.fn();

        const rs: Result[] = [{
            stmt: "SELECT * FROM users;",
            header: ["id", "name", "age"],
            rows: [["1", "Alice", "25"], ["2", "Bob", "30"], ["3", "Charlie", "35"]]
        }];

        resultView.display(Promise.resolve(rs), 50, "bottom");
        await new Promise(resolve => setTimeout(resolve, 20));

        const qId = mockSend.mock.calls[0][0].payload.queryId;

        // Apply filter: name contains 'li'
        (resultView as any).handleMessage({
            type: "APPLY_FILTER",
            payload: {
                queryId: qId,
                result: 0,
                filters: [{ column: "name", operator: "contains", value: "li" }]
            }
        });

        expect(mockSend).toHaveBeenCalledWith({
            type: "UPDATE_FILTER_RESULTS",
            payload: {
                queryId: qId,
                result: 0,
                statement: "SELECT * FROM users WHERE name LIKE '%li%';",
                size: 2,
                rows: [["1", "Alice", "25"], ["3", "Charlie", "35"]],
                offset: 0,
                limit: 50,
                filters: [{ column: "name", operator: "contains", value: "li" }]
            }
        });
    });

    test("inspects database table primary key info when dbPath and sqlite are provided", async () => {
        const mockSqlite: any = {
            query: jest.fn((_dbPath: string, query: string) => {
                if (query.includes("PRAGMA table_info")) {
                    return Promise.resolve({
                        resultSet: [{
                            stmt: query,
                            header: ["cid", "name", "type", "notnull", "dflt_value", "pk"],
                            rows: [
                                ["0", "cust_id", "INTEGER", "1", "NULL", "1"],
                                ["1", "company", "TEXT", "0", "NULL", "0"]
                            ]
                        }]
                    });
                }
                return Promise.resolve({
                    resultSet: [{
                        stmt: query,
                        header: ["sql"],
                        rows: [["CREATE TABLE clients (cust_id INTEGER PRIMARY KEY, company TEXT);"]]
                    }]
                });
            })
        };

        resultView.setSqlite(mockSqlite);

        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get: jest.fn((key: string, defaultVal: any) => {
                if (key === "insertExportStyle") return "single";
                if (key === "insertExportExcludeId") return true;
                return defaultVal;
            })
        });

        const mockSend = jest.fn();
        (resultView as any).send = mockSend;
        (resultView as any).show = jest.fn();

        const rs: Result[] = [{
            stmt: "SELECT cust_id, company FROM clients;",
            header: ["cust_id", "company"],
            rows: [["100", "Acme Corp"]]
        }];

        resultView.display(Promise.resolve(rs), 50, "bottom", { dbPath: "/dummy/clients.db" });
        await new Promise(resolve => setTimeout(resolve, 20));

        const qId = mockSend.mock.calls[0][0].payload.queryId;

        (resultView as any).handleMessage({
            type: "EXPORT_RESULTS",
            payload: { queryId: qId, result: 0, format: "sql" }
        });

        await new Promise(resolve => setTimeout(resolve, 50));

        expect(mockSqlite.query).toHaveBeenCalled();
        expect(vscode.workspace.openTextDocument).toHaveBeenCalledTimes(1);
        const openArgs = (vscode.workspace.openTextDocument as jest.Mock).mock.calls[0][0];
        // cust_id was accurately detected and excluded from column & values list
        expect(openArgs.content).toContain("INSERT INTO clients (company) VALUES ('Acme Corp');");
    });
});


