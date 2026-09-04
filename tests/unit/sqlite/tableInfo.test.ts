import { getTablePrimaryKeyInfo, cleanTableName, clearTableInfoCache } from "../../../src/sqlite/tableInfo";
import SQLite from "../../../src/sqlite";

describe("tableInfo.ts", () => {
    beforeEach(() => {
        clearTableInfoCache();
    });

    describe("cleanTableName", () => {
        test("should strip quotes, brackets, and schema prefix", () => {
            expect(cleanTableName("users")).toBe("users");
            expect(cleanTableName("main.users")).toBe("users");
            expect(cleanTableName('"users"')).toBe("users");
            expect(cleanTableName("[order details]")).toBe("order details");
            expect(cleanTableName("`items`")).toBe("items");
            expect(cleanTableName("'products'")).toBe("products");
            expect(cleanTableName("schema.[my_table]")).toBe("my_table");
            expect(cleanTableName("")).toBe("");
        });
    });

    describe("getTablePrimaryKeyInfo", () => {
        test("should detect single INTEGER PRIMARY KEY AUTOINCREMENT column", async () => {
            const mockSqlite = {
                query: jest.fn((_dbPath: string, query: string) => {
                    if (query.includes("PRAGMA table_info")) {
                        return Promise.resolve({
                            resultSet: [{
                                stmt: query,
                                header: ["cid", "name", "type", "notnull", "dflt_value", "pk"],
                                rows: [
                                    ["0", "id", "INTEGER", "1", "NULL", "1"],
                                    ["1", "name", "TEXT", "0", "NULL", "0"]
                                ]
                            }]
                        });
                    }
                    if (query.includes("sqlite_master")) {
                        return Promise.resolve({
                            resultSet: [{
                                stmt: query,
                                header: ["sql"],
                                rows: [["CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);"]]
                            }]
                        });
                    }
                    return Promise.resolve({});
                })
            } as unknown as SQLite;

            const info = await getTablePrimaryKeyInfo(mockSqlite, "/path/to/db.sqlite", "users");
            expect(info).toBeDefined();
            expect(info!.tableName).toBe("users");
            expect(info!.pkColumns).toEqual(["id"]);
            expect(info!.isSingleIntegerPk).toBe(true);
            expect(info!.hasAutoincrement).toBe(true);
            expect(info!.isWithoutRowid).toBe(false);
            expect(info!.autoIncrementColumn).toBe("id");
        });

        test("should detect single INTEGER PRIMARY KEY as rowid alias even without AUTOINCREMENT keyword", async () => {
            const mockSqlite = {
                query: jest.fn((_dbPath: string, query: string) => {
                    if (query.includes("PRAGMA table_info")) {
                        return Promise.resolve({
                            resultSet: [{
                                stmt: query,
                                header: ["cid", "name", "type", "notnull", "dflt_value", "pk"],
                                rows: [
                                    ["0", "cust_id", "INTEGER", "0", "NULL", "1"],
                                    ["1", "email", "TEXT", "0", "NULL", "0"]
                                ]
                            }]
                        });
                    }
                    if (query.includes("sqlite_master")) {
                        return Promise.resolve({
                            resultSet: [{
                                stmt: query,
                                header: ["sql"],
                                rows: [["CREATE TABLE customers (cust_id INTEGER PRIMARY KEY, email TEXT);"]]
                            }]
                        });
                    }
                    return Promise.resolve({});
                })
            } as unknown as SQLite;

            const info = await getTablePrimaryKeyInfo(mockSqlite, "/path/to/db.sqlite", "customers");
            expect(info).toBeDefined();
            expect(info!.pkColumns).toEqual(["cust_id"]);
            expect(info!.isSingleIntegerPk).toBe(true);
            expect(info!.hasAutoincrement).toBe(false);
            expect(info!.autoIncrementColumn).toBe("cust_id");
        });

        test("should NOT treat non-integer primary keys (e.g. TEXT PRIMARY KEY) as auto-increment", async () => {
            const mockSqlite = {
                query: jest.fn((_dbPath: string, query: string) => {
                    if (query.includes("PRAGMA table_info")) {
                        return Promise.resolve({
                            resultSet: [{
                                stmt: query,
                                header: ["cid", "name", "type", "notnull", "dflt_value", "pk"],
                                rows: [
                                    ["0", "sku", "TEXT", "1", "NULL", "1"],
                                    ["1", "price", "REAL", "0", "NULL", "0"]
                                ]
                            }]
                        });
                    }
                    if (query.includes("sqlite_master")) {
                        return Promise.resolve({
                            resultSet: [{
                                stmt: query,
                                header: ["sql"],
                                rows: [["CREATE TABLE products (sku TEXT PRIMARY KEY, price REAL);"]]
                            }]
                        });
                    }
                    return Promise.resolve({});
                })
            } as unknown as SQLite;

            const info = await getTablePrimaryKeyInfo(mockSqlite, "/path/to/db.sqlite", "products");
            expect(info).toBeDefined();
            expect(info!.pkColumns).toEqual(["sku"]);
            expect(info!.isSingleIntegerPk).toBe(false);
            expect(info!.autoIncrementColumn).toBeUndefined();
        });

        test("should NOT treat composite primary keys as auto-increment", async () => {
            const mockSqlite = {
                query: jest.fn((_dbPath: string, query: string) => {
                    if (query.includes("PRAGMA table_info")) {
                        return Promise.resolve({
                            resultSet: [{
                                stmt: query,
                                header: ["cid", "name", "type", "notnull", "dflt_value", "pk"],
                                rows: [
                                    ["0", "order_id", "INTEGER", "1", "NULL", "1"],
                                    ["1", "line_id", "INTEGER", "1", "NULL", "2"],
                                    ["2", "qty", "INTEGER", "0", "NULL", "0"]
                                ]
                            }]
                        });
                    }
                    if (query.includes("sqlite_master")) {
                        return Promise.resolve({
                            resultSet: [{
                                stmt: query,
                                header: ["sql"],
                                rows: [["CREATE TABLE lines (order_id INTEGER, line_id INTEGER, qty INTEGER, PRIMARY KEY (order_id, line_id));"]]
                            }]
                        });
                    }
                    return Promise.resolve({});
                })
            } as unknown as SQLite;

            const info = await getTablePrimaryKeyInfo(mockSqlite, "/path/to/db.sqlite", "lines");
            expect(info).toBeDefined();
            expect(info!.pkColumns).toEqual(["order_id", "line_id"]);
            expect(info!.isSingleIntegerPk).toBe(false);
            expect(info!.autoIncrementColumn).toBeUndefined();
        });

        test("should NOT treat WITHOUT ROWID tables as auto-increment", async () => {
            const mockSqlite = {
                query: jest.fn((_dbPath: string, query: string) => {
                    if (query.includes("PRAGMA table_info")) {
                        return Promise.resolve({
                            resultSet: [{
                                stmt: query,
                                header: ["cid", "name", "type", "notnull", "dflt_value", "pk"],
                                rows: [
                                    ["0", "id", "INTEGER", "1", "NULL", "1"],
                                    ["1", "data", "TEXT", "0", "NULL", "0"]
                                ]
                            }]
                        });
                    }
                    if (query.includes("sqlite_master")) {
                        return Promise.resolve({
                            resultSet: [{
                                stmt: query,
                                header: ["sql"],
                                rows: [["CREATE TABLE fast_cache (id INTEGER PRIMARY KEY, data TEXT) WITHOUT ROWID;"]]
                            }]
                        });
                    }
                    return Promise.resolve({});
                })
            } as unknown as SQLite;

            const info = await getTablePrimaryKeyInfo(mockSqlite, "/path/to/db.sqlite", "fast_cache");
            expect(info).toBeDefined();
            expect(info!.isWithoutRowid).toBe(true);
            expect(info!.autoIncrementColumn).toBeUndefined();
        });

        test("should cache table info and avoid repeated queries", async () => {
            const mockQuery = jest.fn((_dbPath: string, query: string) => {
                if (query.includes("PRAGMA table_info")) {
                    return Promise.resolve({
                        resultSet: [{
                            stmt: query,
                            header: ["cid", "name", "type", "notnull", "dflt_value", "pk"],
                            rows: [["0", "id", "INTEGER", "1", "NULL", "1"]]
                        }]
                    });
                }
                return Promise.resolve({
                    resultSet: [{
                        stmt: query,
                        header: ["sql"],
                        rows: [["CREATE TABLE cached_tbl (id INTEGER PRIMARY KEY AUTOINCREMENT);"]]
                    }]
                });
            });

            const mockSqlite = { query: mockQuery } as unknown as SQLite;

            const info1 = await getTablePrimaryKeyInfo(mockSqlite, "/path/to/db.sqlite", "cached_tbl");
            expect(mockQuery).toHaveBeenCalledTimes(2);

            const info2 = await getTablePrimaryKeyInfo(mockSqlite, "/path/to/db.sqlite", "cached_tbl");
            expect(mockQuery).toHaveBeenCalledTimes(2); // cached, no new calls
            expect(info1).toEqual(info2);
        });

        test("should return undefined on query failure", async () => {
            const mockSqlite = {
                query: jest.fn().mockRejectedValue(new Error("DB locked"))
            } as unknown as SQLite;

            const info = await getTablePrimaryKeyInfo(mockSqlite, "/path/to/db.sqlite", "broken");
            expect(info).toBeUndefined();
        });
    });
});
