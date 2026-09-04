import {
    isSimpleSelectQuery,
    buildFilteredSqlQuery,
    filterRows,
    ColumnFilter
} from "../../../src/utils/sqlFilter";

describe("sqlFilter", () => {
    describe("isSimpleSelectQuery", () => {
        test("returns true for simple SELECT statements", () => {
            expect(isSimpleSelectQuery("SELECT * FROM users;")).toBe(true);
            expect(isSimpleSelectQuery("SELECT id, name FROM users")).toBe(true);
            expect(isSimpleSelectQuery("SELECT * FROM [order_items] WHERE status = 1;")).toBe(true);
            expect(isSimpleSelectQuery("SELECT id, name FROM `employees` ORDER BY id DESC LIMIT 10")).toBe(true);
        });

        test("returns false when isView is true", () => {
            expect(isSimpleSelectQuery("SELECT * FROM v_users;", true)).toBe(false);
        });

        test("returns false for non-SELECT queries", () => {
            expect(isSimpleSelectQuery("INSERT INTO users VALUES (1, 'A');")).toBe(false);
            expect(isSimpleSelectQuery("UPDATE users SET name='B';")).toBe(false);
            expect(isSimpleSelectQuery("DELETE FROM users;")).toBe(false);
            expect(isSimpleSelectQuery("PRAGMA table_info(users);")).toBe(false);
            expect(isSimpleSelectQuery("")).toBe(false);
            expect(isSimpleSelectQuery(undefined)).toBe(false);
        });

        test("returns false for JOIN queries", () => {
            expect(isSimpleSelectQuery("SELECT * FROM a JOIN b ON a.id = b.id;")).toBe(false);
            expect(isSimpleSelectQuery("SELECT * FROM a LEFT JOIN b ON a.id = b.id;")).toBe(false);
            expect(isSimpleSelectQuery("SELECT * FROM a, b WHERE a.id = b.id;")).toBe(false);
        });

        test("returns false for subqueries, CTEs, unions, group by", () => {
            expect(isSimpleSelectQuery("SELECT * FROM (SELECT id FROM users);")).toBe(false);
            expect(isSimpleSelectQuery("WITH t AS (SELECT 1) SELECT * FROM t;")).toBe(false);
            expect(isSimpleSelectQuery("SELECT * FROM a UNION SELECT * FROM b;")).toBe(false);
            expect(isSimpleSelectQuery("SELECT count(*), department FROM employees GROUP BY department;")).toBe(false);
            expect(isSimpleSelectQuery("SELECT * FROM sqlite_master;")).toBe(false);
        });
    });

    describe("buildFilteredSqlQuery", () => {
        test("returns base SQL when no active filters", () => {
            const sql = "SELECT * FROM users;";
            expect(buildFilteredSqlQuery(sql, [])).toBe(sql);
            expect(buildFilteredSqlQuery(sql, [{ column: "name", operator: "(default)", value: "Alice" }])).toBe(sql);
        });

        test("injects single WHERE clause into simple query", () => {
            const sql = "SELECT * FROM users;";
            const filters: ColumnFilter[] = [
                { column: "name", operator: "equal", value: "Alice" }
            ];
            expect(buildFilteredSqlQuery(sql, filters)).toBe("SELECT * FROM users WHERE name = 'Alice';");
        });

        test("handles numeric values without quotes", () => {
            const sql = "SELECT * FROM users;";
            const filters: ColumnFilter[] = [
                { column: "age", operator: "greater than", value: "25" }
            ];
            expect(buildFilteredSqlQuery(sql, filters)).toBe("SELECT * FROM users WHERE age > 25;");
        });

        test("combines multiple filters with AND", () => {
            const sql = "SELECT * FROM users;";
            const filters: ColumnFilter[] = [
                { column: "name", operator: "contains", value: "li" },
                { column: "age", operator: ">=", value: "18" }
            ];
            expect(buildFilteredSqlQuery(sql, filters)).toBe("SELECT * FROM users WHERE name LIKE '%li%' AND age >= 18;");
        });

        test("appends to existing WHERE clause", () => {
            const sql = "SELECT * FROM users WHERE active = 1;";
            const filters: ColumnFilter[] = [
                { column: "name", operator: "equal", value: "Bob" }
            ];
            expect(buildFilteredSqlQuery(sql, filters)).toBe("SELECT * FROM users WHERE (active = 1) AND (name = 'Bob');");
        });

        test("respects ORDER BY and LIMIT clauses", () => {
            const sql = "SELECT * FROM users ORDER BY id DESC LIMIT 50;";
            const filters: ColumnFilter[] = [
                { column: "status", operator: "equal", value: "active" }
            ];
            expect(buildFilteredSqlQuery(sql, filters)).toBe("SELECT * FROM users WHERE status = 'active' ORDER BY id DESC LIMIT 50;");
        });

        test("handles IS NULL and IS NOT NULL", () => {
            const sql = "SELECT * FROM users;";
            const filters: ColumnFilter[] = [
                { column: "email", operator: "is null", value: "" },
                { column: "phone", operator: "is not null", value: "" }
            ];
            expect(buildFilteredSqlQuery(sql, filters)).toBe("SELECT * FROM users WHERE email IS NULL AND phone IS NOT NULL;");
        });
    });

    describe("filterRows", () => {
        const columns = ["id", "name", "age", "email"];
        const rows = [
            ["1", "Alice", 25, "alice@example.com"],
            ["2", "Bob", 30, "NULL"],
            ["3", "Charlie", 35, "charlie@test.org"],
            ["4", "David", 20, "david@example.com"]
        ];

        test("filters by equal operator", () => {
            const result = filterRows(rows, columns, [{ column: "name", operator: "equal", value: "Alice" }]);
            expect(result).toHaveLength(1);
            expect(result[0][1]).toBe("Alice");
        });

        test("filters by contains operator (case-insensitive)", () => {
            const result = filterRows(rows, columns, [{ column: "email", operator: "contains", value: "example.com" }]);
            expect(result).toHaveLength(2);
            expect(result.map(r => r[1])).toEqual(["Alice", "David"]);
        });

        test("filters by greater than numeric", () => {
            const result = filterRows(rows, columns, [{ column: "age", operator: "greater than", value: "25" }]);
            expect(result).toHaveLength(2);
            expect(result.map(r => r[1])).toEqual(["Bob", "Charlie"]);
        });

        test("filters by is null operator", () => {
            const result = filterRows(rows, columns, [{ column: "email", operator: "is null", value: "" }]);
            expect(result).toHaveLength(1);
            expect(result[0][1]).toBe("Bob");
        });

        test("filters by multiple conditions combined", () => {
            const result = filterRows(rows, columns, [
                { column: "age", operator: ">=", value: "25" },
                { column: "name", operator: "contains", value: "ar" }
            ]);
            expect(result).toHaveLength(1);
            expect(result[0][1]).toBe("Charlie");
        });
    });
});
