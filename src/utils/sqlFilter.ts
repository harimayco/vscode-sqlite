import { sqlSafeName } from "./utils";
import { hasJoinClause } from "../resultview/sqlExport";

export interface ColumnFilter {
    column: string;
    operator: string;
    value: string;
}

/**
 * Checks if a SQL query is a simple SELECT statement on a single non-view table.
 */
export function isSimpleSelectQuery(sql?: string, isView?: boolean): boolean {
    if (!sql || isView) {
        return false;
    }

    const trimmed = sql.trim();
    // Must start with SELECT
    if (!/^SELECT\b/i.test(trimmed)) {
        return false;
    }

    // Must have a FROM clause
    if (!/\bFROM\s+/i.test(trimmed)) {
        return false;
    }

    // Must not be a system table
    if (/\bFROM\s+(?:sqlite_master|sqlite_temp_master|sqlite_stat\d*)\b/i.test(trimmed)) {
        return false;
    }

    // Must not contain set operations (UNION, INTERSECT, EXCEPT)
    if (/\b(?:UNION(?:\s+ALL)?|INTERSECT|EXCEPT)\b/i.test(trimmed)) {
        return false;
    }

    // Must not contain explicit JOINs or old-style comma joins
    if (hasJoinClause(trimmed)) {
        return false;
    }

    // Comma join check in FROM clause: FROM tableA, tableB
    if (/\bFROM\s+[^\s,;()]+(?:\s+AS\s+[^\s,;()]+|\s+[a-zA-Z0-9_$]+)?\s*,/i.test(trimmed)) {
        return false;
    }

    // Must not contain subqueries: (SELECT ...)
    if (/\(\s*SELECT\b/i.test(trimmed)) {
        return false;
    }

    // Must not contain CTEs: WITH ... AS
    if (/\bWITH\b/i.test(trimmed)) {
        return false;
    }

    // Must not contain GROUP BY or HAVING
    if (/\b(?:GROUP\s+BY|HAVING)\b/i.test(trimmed)) {
        return false;
    }

    return true;
}

/**
 * Escapes a string literal for SQLite SQL.
 */
export function escapeSqlString(val: string): string {
    return "'" + val.replace(/'/g, "''") + "'";
}

/**
 * Escapes a pattern value for SQLite LIKE clause.
 */
export function escapeLikePattern(val: string): string {
    return val.replace(/'/g, "''");
}

/**
 * Builds an updated SQL query statement containing the given column filters in the WHERE clause.
 */
export function buildFilteredSqlQuery(baseSql: string, filters: ColumnFilter[]): string {
    const activeFilters = filters.filter(f => f.operator && f.operator !== "(default)");
    if (activeFilters.length === 0) {
        return baseSql;
    }

    const conditions: string[] = [];
    for (const f of activeFilters) {
        const colSafe = sqlSafeName(f.column);
        const rawVal = f.value !== undefined ? String(f.value) : "";
        const isNum = rawVal.trim() !== "" && !isNaN(Number(rawVal.trim()));
        const formattedVal = isNum ? rawVal.trim() : escapeSqlString(rawVal);

        switch (f.operator) {
            case "equal":
            case "=":
                conditions.push(`${colSafe} = ${formattedVal}`);
                break;
            case "not equal":
            case "!=":
            case "<>":
                conditions.push(`${colSafe} != ${formattedVal}`);
                break;
            case "contains":
                conditions.push(`${colSafe} LIKE '%${escapeLikePattern(rawVal)}%'`);
                break;
            case "starts with":
                conditions.push(`${colSafe} LIKE '${escapeLikePattern(rawVal)}%'`);
                break;
            case "ends with":
                conditions.push(`${colSafe} LIKE '%${escapeLikePattern(rawVal)}'`);
                break;
            case "greater than":
            case ">":
                conditions.push(`${colSafe} > ${formattedVal}`);
                break;
            case "less than":
            case "<":
                conditions.push(`${colSafe} < ${formattedVal}`);
                break;
            case "greater or equal":
            case ">=":
                conditions.push(`${colSafe} >= ${formattedVal}`);
                break;
            case "less or equal":
            case "<=":
                conditions.push(`${colSafe} <= ${formattedVal}`);
                break;
            case "is null":
            case "IS NULL":
                conditions.push(`${colSafe} IS NULL`);
                break;
            case "is not null":
            case "IS NOT NULL":
                conditions.push(`${colSafe} IS NOT NULL`);
                break;
            default:
                break;
        }
    }

    if (conditions.length === 0) {
        return baseSql;
    }

    const filterClause = conditions.join(" AND ");
    let cleanBase = baseSql.trim();
    if (cleanBase.endsWith(";")) {
        cleanBase = cleanBase.slice(0, -1).trim();
    }

    let resultSql = "";
    const whereMatch = /\bWHERE\b([\s\S]*?)(\bORDER\s+BY\b|\bLIMIT\b|$)/i.exec(cleanBase);
    if (whereMatch) {
        const existingWhere = whereMatch[1].trim();
        const tail = whereMatch[2];
        const tailPart = tail ? ` ${tail} ${cleanBase.substring(whereMatch.index + whereMatch[0].length).trim()}` : "";
        resultSql = `${cleanBase.substring(0, whereMatch.index).trim()} WHERE (${existingWhere}) AND (${filterClause})${tailPart}`.trim();
    } else {
        const tailMatch = /(\bORDER\s+BY\b|\bLIMIT\b|$)/i.exec(cleanBase);
        if (tailMatch && tailMatch.index < cleanBase.length) {
            const beforeTail = cleanBase.substring(0, tailMatch.index).trim();
            const afterTail = cleanBase.substring(tailMatch.index).trim();
            resultSql = `${beforeTail} WHERE ${filterClause} ${afterTail}`.trim();
        } else {
            resultSql = `${cleanBase} WHERE ${filterClause}`;
        }
    }

    return resultSql + ";";
}

/**
 * In-memory row filtering matching the active column filters.
 */
export function filterRows<T extends (string | number)[]>(
    rows: T[],
    columns: string[],
    filters: ColumnFilter[]
): T[] {
    const activeFilters = filters.filter(f => f.operator && f.operator !== "(default)");
    if (activeFilters.length === 0) {
        return rows;
    }

    return rows.filter(row => {
        for (const filter of activeFilters) {
            const colIndex = columns.indexOf(filter.column);
            if (colIndex === -1) continue;

            const cellRaw = row[colIndex];
            const isCellNull = cellRaw === null || cellRaw === undefined || cellRaw === "NULL";
            const cellStr = isCellNull ? "" : String(cellRaw);
            const targetVal = filter.value !== undefined ? String(filter.value) : "";

            switch (filter.operator) {
                case "is null":
                case "IS NULL":
                    if (!isCellNull) return false;
                    break;
                case "is not null":
                case "IS NOT NULL":
                    if (isCellNull) return false;
                    break;
                case "equal":
                case "=": {
                    if (isCellNull) return false;
                    const numA = Number(cellStr);
                    const numB = Number(targetVal);
                    if (!isNaN(numA) && !isNaN(numB) && cellStr.trim() !== "" && targetVal.trim() !== "") {
                        if (numA !== numB) return false;
                    } else {
                        if (cellStr.toLowerCase() !== targetVal.toLowerCase()) return false;
                    }
                    break;
                }
                case "not equal":
                case "!=":
                case "<>": {
                    if (isCellNull) return false;
                    const numA = Number(cellStr);
                    const numB = Number(targetVal);
                    if (!isNaN(numA) && !isNaN(numB) && cellStr.trim() !== "" && targetVal.trim() !== "") {
                        if (numA === numB) return false;
                    } else {
                        if (cellStr.toLowerCase() === targetVal.toLowerCase()) return false;
                    }
                    break;
                }
                case "contains":
                    if (isCellNull) return false;
                    if (!cellStr.toLowerCase().includes(targetVal.toLowerCase())) return false;
                    break;
                case "starts with":
                    if (isCellNull) return false;
                    if (!cellStr.toLowerCase().startsWith(targetVal.toLowerCase())) return false;
                    break;
                case "ends with":
                    if (isCellNull) return false;
                    if (!cellStr.toLowerCase().endsWith(targetVal.toLowerCase())) return false;
                    break;
                case "greater than":
                case ">": {
                    if (isCellNull) return false;
                    const numA = Number(cellStr);
                    const numB = Number(targetVal);
                    if (!isNaN(numA) && !isNaN(numB)) {
                        if (!(numA > numB)) return false;
                    } else {
                        if (!(cellStr > targetVal)) return false;
                    }
                    break;
                }
                case "less than":
                case "<": {
                    if (isCellNull) return false;
                    const numA = Number(cellStr);
                    const numB = Number(targetVal);
                    if (!isNaN(numA) && !isNaN(numB)) {
                        if (!(numA < numB)) return false;
                    } else {
                        if (!(cellStr < targetVal)) return false;
                    }
                    break;
                }
                case "greater or equal":
                case ">=": {
                    if (isCellNull) return false;
                    const numA = Number(cellStr);
                    const numB = Number(targetVal);
                    if (!isNaN(numA) && !isNaN(numB)) {
                        if (!(numA >= numB)) return false;
                    } else {
                        if (!(cellStr >= targetVal)) return false;
                    }
                    break;
                }
                case "less or equal":
                case "<=": {
                    if (isCellNull) return false;
                    const numA = Number(cellStr);
                    const numB = Number(targetVal);
                    if (!isNaN(numA) && !isNaN(numB)) {
                        if (!(numA <= numB)) return false;
                    } else {
                        if (!(cellStr <= targetVal)) return false;
                    }
                    break;
                }
                default:
                    break;
            }
        }
        return true;
    });
}
