import { EOL } from "os";
import { sqlSafeName } from "../utils/utils";

export interface InsertSqlOptions {
    multiValue?: boolean;
    batchSize?: number;
}

/**
 * Check if a SQL query statement contains JOIN clauses
 */
export function hasJoinClause(stmt?: string): boolean {
    if (!stmt) {
        return false;
    }
    // Match explicit JOIN syntax (INNER JOIN, LEFT JOIN, CROSS JOIN, etc.)
    // or old-style comma join in FROM clause
    const explicitJoin = /\b(?:LEFT|RIGHT|INNER|CROSS|FULL|NATURAL)?\s*JOIN\b/i;
    const commaJoin = /\bFROM\s+(?:(?:\[[^\]]+\]|`[^`]+`|"[^"]+"|'[^']+'|[a-zA-Z0-9_$]+)\s*,\s*(?:\[[^\]]+\]|`[^`]+`|"[^"]+"|'[^']+'|[a-zA-Z0-9_$]+))/i;
    return explicitJoin.test(stmt) || commaJoin.test(stmt);
}

/**
 * Strip table qualifier from column name (e.g. "users.name" -> "name", "u.id" -> "id")
 */
export function stripColumnQualifier(col: string): string {
    if (!col) {
        return col;
    }
    const dotIndex = col.lastIndexOf('.');
    if (dotIndex !== -1 && dotIndex < col.length - 1) {
        let stripped = col.substring(dotIndex + 1);
        // Strip matching surrounding quotes or brackets if present
        if ((stripped.startsWith('`') && stripped.endsWith('`')) ||
            (stripped.startsWith('"') && stripped.endsWith('"')) ||
            (stripped.startsWith("'") && stripped.endsWith("'")) ||
            (stripped.startsWith('[') && stripped.endsWith(']'))) {
            stripped = stripped.slice(1, -1);
        } else if ((stripped.endsWith('`') && !stripped.startsWith('`')) ||
            (stripped.endsWith('"') && !stripped.startsWith('"')) ||
            (stripped.endsWith(']') && !stripped.startsWith('['))) {
            stripped = stripped.slice(0, -1);
        }
        return stripped;
    }
    return col;
}

/**
 * Extract table name from a SQL query statement (e.g. SELECT * FROM <table>)
 */
export function extractTableName(stmt?: string): string {
    if (!stmt) {
        return "tableName";
    }

    // Match FROM or INTO followed by optional schema and table name
    // Handles identifiers unquoted, or quoted with "", ``, [], or ''
    const pattern = /\b(?:FROM|INTO)\s+(?:(?:\[([^\]]+)\]|`([^`]+)`|"([^"]+)"|'([^']+)'|([a-zA-Z0-9_$]+))\.)?(?:\[([^\]]+)\]|`([^`]+)`|"([^"]+)"|'([^']+)'|([a-zA-Z0-9_$]+))/i;
    const match = pattern.exec(stmt);

    if (match) {
        // Group 6..10 is the table name (or group 1..5 if no schema dot was present)
        const table = match[6] || match[7] || match[8] || match[9] || match[10]
            || match[1] || match[2] || match[3] || match[4] || match[5];
        if (table) {
            return table;
        }
    }

    return "tableName";
}

/**
 * Format a value into a safe SQL literal
 */
export function sqlSafeValue(val: any): string {
    if (val === null || val === undefined || val === "NULL") {
        return "NULL";
    }

    if (typeof val === "number") {
        return Number.isFinite(val) ? val.toString() : "NULL";
    }

    if (typeof val === "boolean") {
        return val ? "1" : "0";
    }

    const str = String(val);

    // Number check: matches integer or float, but NOT values with leading zeroes like "007"
    if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(str)) {
        return str;
    }

    // Escape single quotes by doubling them
    return `'${str.replace(/'/g, "''")}'`;
}

/**
 * Converts query results (stmt, header, rows) to INSERT INTO SQL statements
 */
export function toInsertSql(
    stmt: string,
    header: string[],
    rows: (string | number | any)[][],
    options?: InsertSqlOptions
): string {
    if (!header || header.length === 0) {
        return "";
    }

    const rawTableName = extractTableName(stmt);
    const tableName = sqlSafeName(rawTableName);
    const columns = header.map(col => sqlSafeName(stripColumnQualifier(col))).join(", ");

    let prefix = "";
    if (hasJoinClause(stmt)) {
        prefix = `-- WARNING: Query contains JOIN clauses.${EOL}` +
            `-- Standard SQL only supports INSERT INTO a single table at a time.${EOL}` +
            `-- Generated statements target primary table '${rawTableName}'.${EOL}` +
            `-- Please review columns and adjust if inserting into multiple tables or a VIEW.${EOL}${EOL}`;
    }

    if (!rows || rows.length === 0) {
        return prefix + `-- No records found to export for table '${rawTableName}'.`;
    }

    const isMultiValue = !!options?.multiValue;
    const batchSize = options?.batchSize && options.batchSize > 0 ? options.batchSize : 500;

    if (!isMultiValue) {
        // Single-statement per row format
        const lines = rows.map(row => {
            const rowArr = Array.isArray(row) ? row : [];
            const values = rowArr.map(sqlSafeValue).join(", ");
            return `INSERT INTO ${tableName} (${columns}) VALUES (${values});`;
        });
        return prefix + lines.join(EOL);
    } else {
        // Multi-values batch format
        const batches: string[] = [];
        for (let i = 0; i < rows.length; i += batchSize) {
            const chunk = rows.slice(i, i + batchSize);
            const valueRows = chunk.map(row => {
                const rowArr = Array.isArray(row) ? row : [];
                const values = rowArr.map(sqlSafeValue).join(", ");
                return `  (${values})`;
            });
            batches.push(`INSERT INTO ${tableName} (${columns}) VALUES${EOL}${valueRows.join(`,${EOL}`)};`);
        }
        return prefix + batches.join(EOL + EOL);
    }
}
