import { EOL } from "os";
import {
    extractTableName,
    sqlSafeValue,
    toInsertSql,
    hasJoinClause,
    stripColumnQualifier
} from "../../../src/resultview/sqlExport";

describe("sqlExport.ts", () => {

    describe("hasJoinClause", () => {
        test("should return true for queries with explicit JOINs", () => {
            expect(hasJoinClause("SELECT * FROM users JOIN orders ON users.id = orders.user_id;")).toBe(true);
            expect(hasJoinClause("SELECT * FROM users LEFT JOIN orders ON users.id = orders.user_id;")).toBe(true);
            expect(hasJoinClause("SELECT * FROM users INNER JOIN orders ON users.id = orders.user_id;")).toBe(true);
            expect(hasJoinClause("SELECT * FROM users CROSS JOIN orders;")).toBe(true);
        });

        test("should return true for queries with old-style comma joins", () => {
            expect(hasJoinClause("SELECT * FROM users, orders WHERE users.id = orders.user_id;")).toBe(true);
            expect(hasJoinClause("SELECT * FROM [users], [orders];")).toBe(true);
        });

        test("should return false for single-table queries", () => {
            expect(hasJoinClause("SELECT * FROM users WHERE active = 1;")).toBe(false);
            expect(hasJoinClause("SELECT 1 + 1;")).toBe(false);
            expect(hasJoinClause("")).toBe(false);
            expect(hasJoinClause(undefined)).toBe(false);
        });
    });

    describe("stripColumnQualifier", () => {
        test("should strip table and alias prefixes", () => {
            expect(stripColumnQualifier("users.name")).toBe("name");
            expect(stripColumnQualifier("u.id")).toBe("id");
            expect(stripColumnQualifier("orders.total_price")).toBe("total_price");
        });

        test("should handle quoted column identifiers", () => {
            expect(stripColumnQualifier("`users`.`name`")).toBe("name");
            expect(stripColumnQualifier('"users"."name"')).toBe("name");
            expect(stripColumnQualifier("[users].[name]")).toBe("name");
        });

        test("should leave unqualified column names unchanged", () => {
            expect(stripColumnQualifier("id")).toBe("id");
            expect(stripColumnQualifier("name")).toBe("name");
            expect(stripColumnQualifier("")).toBe("");
        });
    });

    describe("extractTableName", () => {
        test("should extract simple table name", () => {
            expect(extractTableName("SELECT * FROM users;")).toBe("users");
            expect(extractTableName("select id, name from users where active = 1")).toBe("users");
        });

        test("should extract primary table from JOIN queries", () => {
            expect(extractTableName("SELECT * FROM users u JOIN orders o ON u.id = o.user_id;")).toBe("users");
            expect(extractTableName("SELECT * FROM `customers` c LEFT JOIN orders o ON c.id = o.cust_id;")).toBe("customers");
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
        test("should return empty string if header is empty", () => {
            expect(toInsertSql("SELECT * FROM users", [], [["1", "Alice"]])).toBe("");
        });

        test("should return informative comment if rows are empty", () => {
            const result = toInsertSql("SELECT * FROM users", ["id", "name"], []);
            expect(result).toContain("-- No records found to export for table 'users'.");
        });

        test("should generate single-row INSERT statements by default", () => {
            const stmt = "SELECT id, name FROM users;";
            const header = ["id", "name"];
            const rows = [["1", "Alice"], ["2", "Bob"]];

            const expected = [
                "INSERT INTO users (id, name) VALUES (1, 'Alice');",
                "INSERT INTO users (id, name) VALUES (2, 'Bob');"
            ].join(EOL);

            expect(toInsertSql(stmt, header, rows)).toBe(expected);
        });

        test("should generate multi-values batch INSERT statements when multiValue is true", () => {
            const stmt = "SELECT id, name FROM users;";
            const header = ["id", "name"];
            const rows = [["1", "Alice"], ["2", "Bob"], ["3", "Charlie"]];

            const result = toInsertSql(stmt, header, rows, { multiValue: true });
            expect(result).toBe(
                `INSERT INTO users (id, name) VALUES${EOL}  (1, 'Alice'),${EOL}  (2, 'Bob'),${EOL}  (3, 'Charlie');`
            );
        });

        test("should batch multi-values statements according to batchSize", () => {
            const stmt = "SELECT id FROM items;";
            const header = ["id"];
            const rows = [["1"], ["2"], ["3"], ["4"], ["5"]];

            const result = toInsertSql(stmt, header, rows, { multiValue: true, batchSize: 2 });
            const expected = [
                `INSERT INTO items (id) VALUES${EOL}  (1),${EOL}  (2);`,
                `INSERT INTO items (id) VALUES${EOL}  (3),${EOL}  (4);`,
                `INSERT INTO items (id) VALUES${EOL}  (5);`
            ].join(EOL + EOL);

            expect(result).toBe(expected);
        });

        test("should handle JOIN queries with warning comments and stripped column qualifiers", () => {
            const stmt = "SELECT u.id, u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id;";
            const header = ["u.id", "u.name", "o.total"];
            const rows = [["1", "Alice", "100.5"]];

            const result = toInsertSql(stmt, header, rows);
            expect(result).toContain("-- WARNING: Query contains JOIN clauses.");
            expect(result).toContain("INSERT INTO users (id, name, total) VALUES (1, 'Alice', 100.5);");
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
    });
});
