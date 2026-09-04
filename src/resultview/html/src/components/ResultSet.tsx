import * as React from "react";
import { Hideable, Table } from "./Base";
import ResultSetHeader from "./ResultSetHeader";
import { ColumnFilter, ResultSetData } from "../api";

interface Props  extends ResultSetData {
    onExport: (format: string, rows?: (string | number)[][]) => void;
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
}

class ResultSet extends React.Component<Props, State> {

    constructor(props: Props) {
        super(props);
        this.state = {
            showTable: true,
            showStatement: false,
            filters: {},
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
                    onToggleHidden={this.handleToggleShowTable.bind(this)}
                    onSql={this.handleToggleShowStatement.bind(this)}
                    onExport={this.props.onExport}
                    onCopy={this.props.onCopy}
                />
                <Hideable hidden={!this.state.showTable}>
                    <Table
                        offset={this.props.rows.offset}
                        columns={this.props.columns}
                        rows={this.props.rows.rows}
                        canFilter={this.props.canFilter}
                        activeFilters={this.state.filters}
                        onApplyFilter={this.handleApplyFilter.bind(this)}
                        onClearFilter={this.handleClearFilter.bind(this)}
                        onExportSelected={(format, rows) => this.props.onExport(format, rows)}
                        onCopy={this.props.onCopy}
                    />
                </Hideable>
            </div>
        );
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

    private handleToggleShowTable() {
        this.setState({showTable: !this.state.showTable});
    }
}

export default ResultSet;

const styles: {[prop: string]: React.CSSProperties} = {
    resultSet: {
        margin: "8px 0px"
    }
};