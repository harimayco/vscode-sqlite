import { EOL } from "os";
import { extractTableName, sqlSafeValue, toInsertSql } from "../../../src/resultview/sqlExport";

describe("sqlExport.ts", () => {

    describe("extractTableName", () => {
        test("should extract simple table name", () => {
            expect(extractTableName("SELECT * FROM users;")).toBe("users");
            expect(extractTableName("select id, name from users where active = 1")).toBe("users");
        });

        test("should extract quoted table names", () => {
            expect(extractTableName('SELECT * FROM "users";')).toBe("users");
            expect(extractTableName("SELECT * FROM `orders`;")).toBe("orders");
            expect(extractTableName("SELECT * FROM [order details];")).toBe("order details");
            expect(extractTableName("SELECT * FROM 'products';")).toBe("products");
        });

        test("should extract table name with schema prefix", () => {
            expect(extractTableName("SELECT * FROM main.users;")).toBe("users");
            expect(extractTableName('SELECT * FROM "main"."users";')).toBe("users");
            expect(extractTableName("SELECT * FROM [db].[items];")).toBe("items");
        });

        test("should handle multiline queries", () => {
            const query = `
                SELECT
                    id,
                    name
                FROM
                    customers
                WHERE id > 10;
            `;
            expect(extractTableName(query)).toBe("customers");
        });

        test("should return tableName as fallback when no FROM/INTO is present", () => {
            expect(extractTableName("SELECT 1 + 1;")).toBe("tableName");
            expect(extractTableName(undefined)).toBe("tableName");
            expect(extractTableName("")).toBe("tableName");
        });
    });

    describe("sqlSafeValue", () => {
        test("should format null, undefined, and 'NULL' as NULL", () => {
            expect(sqlSafeValue(null)).toBe("NULL");
            expect(sqlSafeValue(undefined)).toBe("NULL");
            expect(sqlSafeValue("NULL")).toBe("NULL");
        });

        test("should format numeric numbers and numeric strings without quotes", () => {
            expect(sqlSafeValue(42)).toBe("42");
            expect(sqlSafeValue(-3.14)).toBe("-3.14");
            expect(sqlSafeValue("42")).toBe("42");
            expect(sqlSafeValue("-3.14")).toBe("-3.14");
            expect(sqlSafeValue("0")).toBe("0");
            expect(sqlSafeValue(0)).toBe("0");
        });

        test("should preserve numeric strings with leading zeroes as quoted strings", () => {
            expect(sqlSafeValue("007")).toBe("'007'");
            expect(sqlSafeValue("0123")).toBe("'0123'");
        });

        test("should format strings with single quotes escaped", () => {
            expect(sqlSafeValue("hello")).toBe("'hello'");
            expect(sqlSafeValue("O'Reilly")).toBe("'O''Reilly'");
            expect(sqlSafeValue("It's a 'test'")).toBe("'It''s a ''test'''");
            expect(sqlSafeValue("")).toBe("''");
        });

        test("should format boolean values as 1 or 0", () => {
            expect(sqlSafeValue(true)).toBe("1");
            expect(sqlSafeValue(false)).toBe("0");
        });
    });

    describe("toInsertSql", () => {
        test("should return empty string if header or rows are empty", () => {
            expect(toInsertSql("SELECT * FROM users", [], [["1", "Alice"]])).toBe("");
            expect(toInsertSql("SELECT * FROM users", ["id", "name"], [])).toBe("");
        });

        test("should generate single INSERT statement", () => {
            const stmt = "SELECT id, name FROM users;";
            const header = ["id", "name"];
            const rows = [["1", "Alice"]];

            const expected = "INSERT INTO users (id, name) VALUES (1, 'Alice');";
            expect(toInsertSql(stmt, header, rows)).toBe(expected);
        });

        test("should generate multiple INSERT statements with escaping and keywords", () => {
            const stmt = 'SELECT id, "group", description, price FROM "items";';
            const header = ["id", "group", "description", "price"];
            const rows = [
                ["1", "electronics", "Bob's Phone", "299.99"],
                ["2", "books", "NULL", "0"]
            ];

            const expected = [
                "INSERT INTO items (id, `group`, description, price) VALUES (1, 'electronics', 'Bob''s Phone', 299.99);",
                "INSERT INTO items (id, `group`, description, price) VALUES (2, 'books', NULL, 0);"
            ].join(EOL);

            expect(toInsertSql(stmt, header, rows)).toBe(expected);
        });

        test("should use fallback tableName when statement has no table", () => {
            const stmt = "SELECT 1, 'test';";
            const header = ["col1", "col2"];
            const rows = [["1", "test"]];

            const expected = "INSERT INTO tableName (col1, col2) VALUES (1, 'test');";
            expect(toInsertSql(stmt, header, rows)).toBe(expected);
        });
    });
});
