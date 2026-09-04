import * as React from "react";
import { Hideable, Table } from "./Base";
import ResultSetHeader from "./ResultSetHeader";
import { ColumnFilter, ResultSetData } from "../api";
import SqlExportModal from "./SqlExportModal";
import ColumnVisibilityPopover from "./ColumnVisibilityPopover";
import { extractTableName } from "../utils";

interface Props  extends ResultSetData {
    onExport: (format: string, rows?: (string | number)[][], exportOptions?: { columns?: string[]; multiValue?: boolean }) => void;
    onRows: (offset: number, limit: number) => void;
    onChangeLimit?: (limit: number, saveAsDefault?: boolean) => void;
    onOpenSettings?: () => void;
    onApplyFilter?: (filters: ColumnFilter[]) => void;
    onCopy?: (text: string) => void;
}

interface State {
    showTable: boolean;
    showStatement: boolean;
    filters: { [column: string]: { operator: string; value: string } };
    hiddenColumns: Set<string>;
    showColumnVisibility: boolean;
    visibilityAnchor?: { top: number; left: number; bottom: number; right: number };
    showSqlExportModal: boolean;
    pendingExportRows?: (string | number)[][];
}

class ResultSet extends React.Component<Props, State> {

    constructor(props: Props) {
        super(props);
        this.state = {
            showTable: true,
            showStatement: false,
            filters: {},
            hiddenColumns: new Set(),
            showColumnVisibility: false,
            showSqlExportModal: false,
        };
    }

    render() {
        const currentLimit = (this.props.rows && this.props.rows.limit) || (typeof RECORDS_PER_PAGE !== "undefined" ? RECORDS_PER_PAGE : 20);
        return (
            <div style={styles.resultSet}>
                <ResultSetHeader
                    statement={this.props.statement}
                    pager={{
                        total: this.props.size,
                        offset: this.props.rows.offset,
                        limit: currentLimit,
                        onPage: this.props.onRows,
                        onChangeLimit: this.props.onChangeLimit,
                        onOpenSettings: this.props.onOpenSettings,
                    }}
                    showStatement={this.state.showStatement}
                    onToggleHidden={this.handleToggleShowHideColumns.bind(this)}
                    onSql={this.handleToggleShowStatement.bind(this)}
                    onExport={this.handleExportRequest.bind(this)}
                    onCopy={this.props.onCopy}
                />
                <Hideable hidden={!this.state.showTable}>
                    <Table
                        offset={this.props.rows.offset}
                        columns={this.props.columns}
                        rows={this.props.rows.rows}
                        canFilter={this.props.canFilter}
                        hiddenColumns={this.state.hiddenColumns}
                        activeFilters={this.state.filters}
                        onApplyFilter={this.handleApplyFilter.bind(this)}
                        onClearFilter={this.handleClearFilter.bind(this)}
                        onExportSelected={(format, rows) => this.handleExportRequest(format, rows)}
                        onCopy={this.props.onCopy}
                    />
                </Hideable>

                <ColumnVisibilityPopover
                    visible={this.state.showColumnVisibility}
                    columns={this.props.columns}
                    hiddenColumns={this.state.hiddenColumns}
                    anchorRect={this.state.visibilityAnchor}
                    onToggleColumn={this.handleToggleColumn.bind(this)}
                    onSetAllColumns={this.handleSetAllColumns.bind(this)}
                    onClose={() => this.setState({ showColumnVisibility: false })}
                />

                <SqlExportModal
                    visible={this.state.showSqlExportModal}
                    columns={this.props.columns}
                    tableName={extractTableName(this.props.statement)}
                    selectedRowsCount={this.state.pendingExportRows ? this.state.pendingExportRows.length : undefined}
                    totalRowsCount={this.props.size}
                    onClose={() => this.setState({ showSqlExportModal: false, pendingExportRows: undefined })}
                    onExport={this.handleConfirmSqlExport.bind(this)}
                />
            </div>
        );
    }

    private handleToggleShowHideColumns(e?: React.MouseEvent<HTMLButtonElement>) {
        if (e && e.currentTarget) {
            const rect = e.currentTarget.getBoundingClientRect();
            this.setState({
                showColumnVisibility: !this.state.showColumnVisibility,
                visibilityAnchor: {
                    top: rect.top,
                    left: rect.left,
                    bottom: rect.bottom,
                    right: rect.right
                }
            });
        } else {
            this.setState({
                showColumnVisibility: !this.state.showColumnVisibility
            });
        }
    }

    private handleToggleColumn(col: string) {
        const next = new Set(this.state.hiddenColumns);
        if (next.has(col)) {
            next.delete(col);
        } else {
            next.add(col);
        }
        this.setState({ hiddenColumns: next });
    }

    private handleSetAllColumns(visible: boolean) {
        if (visible) {
            this.setState({ hiddenColumns: new Set() });
        } else {
            this.setState({ hiddenColumns: new Set(this.props.columns) });
        }
    }

    private handleExportRequest(format: string, rows?: (string | number)[][]) {
        if (format === "sql") {
            this.setState({
                showSqlExportModal: true,
                pendingExportRows: rows
            });
        } else {
            this.props.onExport(format, rows);
        }
    }

    private handleConfirmSqlExport(selectedColumns: string[], multiValue: boolean) {
        this.props.onExport("sql", this.state.pendingExportRows, {
            columns: selectedColumns,
            multiValue
        });
        this.setState({ showSqlExportModal: false, pendingExportRows: undefined });
    }

    private handleApplyFilter(column: string, operator: string, value: string) {
        const nextFilters = { ...this.state.filters, [column]: { operator, value } };
        this.setState({ filters: nextFilters });
        this.notifyFilterChange(nextFilters);
    }

    private handleClearFilter(column: string) {
        const nextFilters = { ...this.state.filters };
        delete nextFilters[column];
        this.setState({ filters: nextFilters });
        this.notifyFilterChange(nextFilters);
    }

    private notifyFilterChange(filtersMap: { [column: string]: { operator: string; value: string } }) {
        if (this.props.onApplyFilter) {
            const filterArray: ColumnFilter[] = Object.keys(filtersMap)
                .filter(col => filtersMap[col].operator && filtersMap[col].operator !== "(default)")
                .map(col => ({
                    column: col,
                    operator: filtersMap[col].operator,
                    value: filtersMap[col].value
                }));
            this.props.onApplyFilter(filterArray);
        }
    }

    private handleToggleShowStatement() {
        this.setState({showStatement: !this.state.showStatement});
    }
}

export default ResultSet;

const styles: {[prop: string]: React.CSSProperties} = {
    resultSet: {
        margin: "8px 0px"
    }
};