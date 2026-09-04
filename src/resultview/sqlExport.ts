import { EOL } from "os";
import { sqlSafeName } from "../utils/utils";

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
export function toInsertSql(stmt: string, header: string[], rows: string[][]): string {
    if (!header || header.length === 0 || !rows || rows.length === 0) {
        return "";
    }

    const tableName = sqlSafeName(extractTableName(stmt));
    const columns = header.map(col => sqlSafeName(col)).join(", ");

    const lines = rows.map(row => {
        const values = row.map(sqlSafeValue).join(", ");
        return `INSERT INTO ${tableName} (${columns}) VALUES (${values});`;
    });

    return lines.join(EOL);
}
