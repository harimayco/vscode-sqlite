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

    test("exports single result to single-row SQL by default", async () => {
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
});
