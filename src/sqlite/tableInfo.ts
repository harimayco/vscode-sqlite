import SQLite from "./index";
import { sqlSafeName } from "../utils/utils";
import { logger } from "../logging/logger";

export interface PrimaryKeyInfo {
    tableName: string;
    pkColumns: string[];
    isSingleIntegerPk: boolean;
    hasAutoincrement: boolean;
    isWithoutRowid: boolean;
    autoIncrementColumn?: string;
}

const tableInfoCache = new Map<string, PrimaryKeyInfo>();

export function clearTableInfoCache(): void {
    tableInfoCache.clear();
}

/**
 * Clean table name by removing quotes, brackets, or qualifiers
 */
export function cleanTableName(tableName: string): string {
    if (!tableName) return "";
    let cleaned = tableName.trim();
    // Strip schema prefix if present e.g. main.users -> users
    const dotIdx = cleaned.lastIndexOf(".");
    if (dotIdx !== -1 && dotIdx < cleaned.length - 1) {
        cleaned = cleaned.substring(dotIdx + 1).trim();
    }
    // Strip quotes or brackets
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
        (cleaned.startsWith("`") && cleaned.endsWith("`")) ||
        (cleaned.startsWith("'") && cleaned.endsWith("'")) ||
        (cleaned.startsWith("[") && cleaned.endsWith("]"))) {
        cleaned = cleaned.slice(1, -1);
    }
    return cleaned;
}

/**
 * Inspect SQLite database to determine primary key and auto-increment properties of a table
 */
export async function getTablePrimaryKeyInfo(
    sqlite: SQLite,
    dbPath: string,
    rawTableName: string
): Promise<PrimaryKeyInfo | undefined> {
    const tableName = cleanTableName(rawTableName);
    if (!tableName || !dbPath || !sqlite) {
        return undefined;
    }

    const cacheKey = `${dbPath}::${tableName.toLowerCase()}`;
    if (tableInfoCache.has(cacheKey)) {
        return tableInfoCache.get(cacheKey);
    }

    try {
        const safeTable = sqlSafeName(tableName);
        const pragmaQuery = `PRAGMA table_info(${safeTable});`;
        const ddlQuery = `SELECT sql FROM sqlite_master WHERE (type = 'table' OR type = 'view') AND name = '${tableName.replace(/'/g, "''")}';`;

        const [pragmaRes, ddlRes] = await Promise.all([
            sqlite.query(dbPath, pragmaQuery).catch(() => undefined),
            sqlite.query(dbPath, ddlQuery).catch(() => undefined)
        ]);

        const pragmaResult = pragmaRes && pragmaRes.resultSet && pragmaRes.resultSet[0];
        if (!pragmaResult || !pragmaResult.header || !pragmaResult.rows) {
            return undefined;
        }

        const nameIdx = pragmaResult.header.findIndex(h => h.toLowerCase() === "name");
        const typeIdx = pragmaResult.header.findIndex(h => h.toLowerCase() === "type");
        const pkIdx = pragmaResult.header.findIndex(h => h.toLowerCase() === "pk");

        if (nameIdx === -1 || pkIdx === -1) {
            return undefined;
        }

        const pkCols: { name: string; type: string; pk: number }[] = [];
        for (const row of pragmaResult.rows) {
            const pkVal = parseInt(row[pkIdx], 10) || 0;
            if (pkVal > 0) {
                const colName = row[nameIdx];
                const colType = typeIdx !== -1 && row[typeIdx] ? String(row[typeIdx]).trim().toUpperCase() : "";
                pkCols.push({ name: colName, type: colType, pk: pkVal });
            }
        }

        let createSql = "";
        const ddlResult = ddlRes && ddlRes.resultSet && ddlRes.resultSet[0];
        if (ddlResult && ddlResult.rows && ddlResult.rows.length > 0 && ddlResult.rows[0][0]) {
            createSql = String(ddlResult.rows[0][0]);
        }

        const isWithoutRowid = /\bWITHOUT\s+ROWID\b/i.test(createSql);
        const hasAutoincrement = /\bAUTOINCREMENT\b/i.test(createSql);

        const isSingleIntegerPk = pkCols.length === 1 && pkCols[0].type === "INTEGER";

        let autoIncrementColumn: string | undefined = undefined;
        if (!isWithoutRowid && pkCols.length === 1) {
            // In SQLite, any single-column INTEGER PRIMARY KEY is the rowid alias and auto-increments
            if (pkCols[0].type === "INTEGER" || hasAutoincrement) {
                autoIncrementColumn = pkCols[0].name;
            }
        }

        const info: PrimaryKeyInfo = {
            tableName,
            pkColumns: pkCols.map(c => c.name),
            isSingleIntegerPk,
            hasAutoincrement,
            isWithoutRowid,
            autoIncrementColumn
        };

        tableInfoCache.set(cacheKey, info);
        return info;
    } catch (err) {
        logger.debug(`Error inspecting primary key info for table ${tableName}: ${err}`);
        return undefined;
    }
}
