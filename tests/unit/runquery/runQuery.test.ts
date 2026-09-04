import * as vscode from "vscode";
import { Commands } from "../../../src/commands";
import { RunQueryCommandsHandler } from "../../../src/runQueryCommandsHandler";

jest.mock("vscode");

describe("runQuery", () => {
    let handler: RunQueryCommandsHandler;
    let mockSqlWorkspace: any;
    let mockSqlite: any;
    let mockResultView: any;
    let registeredCommands: { [cmd: string]: (...args: any[]) => any } = {};

    beforeEach(() => {
        jest.clearAllMocks();
        registeredCommands = {};

        (vscode.commands.registerCommand as jest.Mock).mockImplementation(
            (command: string, callback: (...args: any[]) => any, thisArg?: any) => {
                registeredCommands[command] = thisArg ? callback.bind(thisArg) : callback;
                return { dispose: jest.fn() };
            }
        );

        mockSqlWorkspace = {
            getDocumentDatabase: jest.fn(),
            bindDatabaseToDocument: jest.fn(),
        };

        mockSqlite = {
            query: jest.fn().mockResolvedValue({ resultSet: [], error: null }),
        };

        mockResultView = {
            display: jest.fn(),
        };

        handler = new RunQueryCommandsHandler(
            mockSqlWorkspace,
            mockSqlite,
            mockResultView,
            50,
            ["db", "sqlite", "sqlite3"],
            {},
            "bottom"
        );

        const mockContext: any = { subscriptions: [] };
        handler.activate(mockContext);
    });

    test("registers sqlite.runQuery command", () => {
        expect(registeredCommands[Commands.runQuery]).toBeDefined();
    });

    test("runs full document query when selection is empty", async () => {
        const fullSql = "SELECT * FROM users;\nSELECT * FROM orders;";
        const mockDoc = {
            languageId: "sqlite",
            isUntitled: false,
            getText: jest.fn((range) => (range ? "" : fullSql)),
            uri: { toString: () => "file:///test.sqlite" },
        };

        (vscode.window as any).activeTextEditor = {
            document: mockDoc,
            selection: { isEmpty: true },
        };

        mockSqlWorkspace.getDocumentDatabase.mockReturnValue("/path/to/db.sqlite");

        await registeredCommands[Commands.runQuery]();

        expect(mockSqlite.query).toHaveBeenCalledWith(
            "/path/to/db.sqlite",
            fullSql,
            expect.anything()
        );
        expect(mockResultView.display).toHaveBeenCalled();
    });

    test("runs only selected text when selection is non-empty", async () => {
        const fullSql = "SELECT * FROM users;\nSELECT * FROM orders;";
        const selectedSql = "SELECT * FROM orders;";
        const mockSelection = { isEmpty: false };
        const mockDoc = {
            languageId: "sql",
            isUntitled: false,
            getText: jest.fn((range) => (range === mockSelection ? selectedSql : fullSql)),
            uri: { toString: () => "file:///test.sql" },
        };

        (vscode.window as any).activeTextEditor = {
            document: mockDoc,
            selection: mockSelection,
        };

        mockSqlWorkspace.getDocumentDatabase.mockReturnValue("/path/to/db.sqlite");

        await registeredCommands[Commands.runQuery]();

        expect(mockSqlite.query).toHaveBeenCalledWith(
            "/path/to/db.sqlite",
            selectedSql,
            expect.anything()
        );
    });

    test("prompts for database when document has no database bound", async () => {
        const mockDoc = {
            languageId: "sqlite",
            isUntitled: false,
            getText: jest.fn().mockReturnValue("SELECT 1;"),
            uri: { toString: () => "file:///test.sqlite" },
        };

        (vscode.window as any).activeTextEditor = {
            document: mockDoc,
            selection: { isEmpty: true },
        };

        mockSqlWorkspace.getDocumentDatabase.mockReturnValueOnce(undefined);
        (vscode.commands.executeCommand as jest.Mock).mockResolvedValueOnce(undefined);

        await registeredCommands[Commands.runQuery]();

        expect(vscode.commands.executeCommand).toHaveBeenCalledWith(Commands.useDatabase);
        expect(mockSqlite.query).not.toHaveBeenCalled();
    });

    test("sets untitled document language to sqlite when running query", async () => {
        const querySql = "PRAGMA user_version;";
        const mockDoc = {
            languageId: "plaintext",
            isUntitled: true,
            getText: jest.fn().mockReturnValue(querySql),
            uri: { toString: () => "untitled:Untitled-11" },
        };

        (vscode.window as any).activeTextEditor = {
            document: mockDoc,
            selection: { isEmpty: true },
        };

        mockSqlWorkspace.getDocumentDatabase.mockReturnValue("/path/to/db.sqlite");

        await registeredCommands[Commands.runQuery]();

        expect(vscode.languages.setTextDocumentLanguage).toHaveBeenCalledWith(mockDoc, "sqlite");
        expect(mockSqlite.query).toHaveBeenCalledWith(
            "/path/to/db.sqlite",
            querySql,
            expect.anything()
        );
    });
});
