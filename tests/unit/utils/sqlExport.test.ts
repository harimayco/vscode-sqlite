import { EOL } from "os";
import {
    extractTableName,
    sqlSafeValue,
    toInsertSql,
    hasJoinClause,
    stripColumnQualifier,
    isIdColumn
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

    describe("isIdColumn", () => {
        test("should identify standard ID names without table name", () => {
            expect(isIdColumn("id")).toBe(true);
            expect(isIdColumn("ID")).toBe(true);
            expect(isIdColumn("rowid")).toBe(true);
            expect(isIdColumn("ROWID")).toBe(true);
            expect(isIdColumn("_rowid_")).toBe(true);
            expect(isIdColumn("oid")).toBe(true);
        });

        test("should identify table-specific ID columns based on table name", () => {
            expect(isIdColumn("user_id", "users")).toBe(true);
            expect(isIdColumn("users_id", "users")).toBe(true);
            expect(isIdColumn("userid", "users")).toBe(true);
            expect(isIdColumn("category_id", "categories")).toBe(true);
            expect(isIdColumn("categories_id", "categories")).toBe(true);
            expect(isIdColumn("item_id", "items")).toBe(true);
        });

        test("should handle qualified column names", () => {
            expect(isIdColumn("u.id", "users")).toBe(true);
            expect(isIdColumn("users.id", "users")).toBe(true);
            expect(isIdColumn("[users].[user_id]", "users")).toBe(true);
            expect(isIdColumn("`users`.`id`", "users")).toBe(true);
        });

        test("should not flag non-ID columns or foreign keys", () => {
            expect(isIdColumn("name")).toBe(false);
            expect(isIdColumn("email", "users")).toBe(false);
            expect(isIdColumn("user_id", "orders")).toBe(false); // foreign key
            expect(isIdColumn("product_id", "order_items")).toBe(false); // foreign key
            expect(isIdColumn("", "users")).toBe(false);
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

        test("should exclude ID column by default in single-row INSERT statements", () => {
            const stmt = "SELECT id, name FROM users;";
            const header = ["id", "name"];
            const rows = [["1", "Alice"], ["2", "Bob"]];

            const expected = [
                "INSERT INTO users (name) VALUES ('Alice');",
                "INSERT INTO users (name) VALUES ('Bob');"
            ].join(EOL);

            expect(toInsertSql(stmt, header, rows)).toBe(expected);
        });

        test("should include ID column when excludeId is explicitly false", () => {
            const stmt = "SELECT id, name FROM users;";
            const header = ["id", "name"];
            const rows = [["1", "Alice"], ["2", "Bob"]];

            const expected = [
                "INSERT INTO users (id, name) VALUES (1, 'Alice');",
                "INSERT INTO users (id, name) VALUES (2, 'Bob');"
            ].join(EOL);

            expect(toInsertSql(stmt, header, rows, { excludeId: false })).toBe(expected);
        });

        test("should exclude table-specific ID column (e.g. user_id)", () => {
            const stmt = "SELECT user_id, name, email FROM users;";
            const header = ["user_id", "name", "email"];
            const rows = [["10", "Alice", "alice@example.com"]];

            const expected = "INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');";
            expect(toInsertSql(stmt, header, rows)).toBe(expected);
        });

        test("should preserve foreign keys when exporting", () => {
            const stmt = "SELECT id, order_id, product_id, qty FROM order_items;";
            const header = ["id", "order_id", "product_id", "qty"];
            const rows = [["1", "100", "50", "2"]];

            // Only 'id' should be excluded, foreign keys 'order_id' and 'product_id' preserved
            const expected = "INSERT INTO order_items (order_id, product_id, qty) VALUES (100, 50, 2);";
            expect(toInsertSql(stmt, header, rows)).toBe(expected);
        });

        test("should not exclude ID if it is the only column in the table", () => {
            const stmt = "SELECT id FROM ids_only;";
            const header = ["id"];
            const rows = [["1"], ["2"]];

            const expected = [
                "INSERT INTO ids_only (id) VALUES (1);",
                "INSERT INTO ids_only (id) VALUES (2);"
            ].join(EOL);

            expect(toInsertSql(stmt, header, rows)).toBe(expected);
        });

        test("should generate multi-values batch INSERT statements excluding ID by default", () => {
            const stmt = "SELECT id, name FROM users;";
            const header = ["id", "name"];
            const rows = [["1", "Alice"], ["2", "Bob"], ["3", "Charlie"]];

            const result = toInsertSql(stmt, header, rows, { multiValue: true });
            expect(result).toBe(
                `INSERT INTO users (name) VALUES${EOL}  ('Alice'),${EOL}  ('Bob'),${EOL}  ('Charlie');`
            );
        });

        test("should generate multi-values batch INSERT statements including ID when excludeId is false", () => {
            const stmt = "SELECT id, name FROM users;";
            const header = ["id", "name"];
            const rows = [["1", "Alice"], ["2", "Bob"], ["3", "Charlie"]];

            const result = toInsertSql(stmt, header, rows, { multiValue: true, excludeId: false });
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
            expect(result).toContain("INSERT INTO users (name, total) VALUES ('Alice', 100.5);");
        });

        test("should generate multiple INSERT statements with escaping and keywords (excluding ID by default)", () => {
            const stmt = 'SELECT id, "group", description, price FROM "items";';
            const header = ["id", "group", "description", "price"];
            const rows = [
                ["1", "electronics", "Bob's Phone", "299.99"],
                ["2", "books", "NULL", "0"]
            ];

            const expected = [
                "INSERT INTO items (`group`, description, price) VALUES ('electronics', 'Bob''s Phone', 299.99);",
                "INSERT INTO items (`group`, description, price) VALUES ('books', NULL, 0);"
            ].join(EOL);

            expect(toInsertSql(stmt, header, rows)).toBe(expected);
        });

        test("should exclude explicit idColumn when provided in options", () => {
            const stmt = "SELECT custom_pk, name FROM accounts;";
            const header = ["custom_pk", "name"];
            const rows = [["acc_1", "Acme Corp"]];

            const expected = "INSERT INTO accounts (name) VALUES ('Acme Corp');";
            expect(toInsertSql(stmt, header, rows, { idColumn: "custom_pk" })).toBe(expected);
        });

        test("should NOT exclude any column when options.idColumn is __NONE__", () => {
            const stmt = "SELECT id, name FROM non_autoincrement_table;";
            const header = ["id", "name"];
            const rows = [["uuid-1", "Alice"]];

            const expected = "INSERT INTO non_autoincrement_table (id, name) VALUES ('uuid-1', 'Alice');";
            expect(toInsertSql(stmt, header, rows, { idColumn: "__NONE__" })).toBe(expected);
        });
    });
});
