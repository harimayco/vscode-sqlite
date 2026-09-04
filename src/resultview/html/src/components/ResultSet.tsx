import * as React from "react";
import { Hideable, Table } from "./Base";
import ResultSetHeader from "./ResultSetHeader";
import { ResultSetData } from "../api";

interface Props  extends ResultSetData {
    onExport: (format: string, rows?: (string | number)[][]) => void;
    onRows: (offset: number, limit: number) => void;
    onChangeLimit?: (limit: number, saveAsDefault?: boolean) => void;
    onCopy?: (text: string) => void;
}

interface State {
    showTable: boolean;
    showStatement: boolean;
}

class ResultSet extends React.Component<Props, State> {

    constructor(props: Props) {
        super(props);
        this.state = {showTable: true, showStatement: false};
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
                    }}
                    showStatement={this.state.showStatement}
                    onToggleHidden={this.handleToggleShowTable.bind(this)}
                    onSql={this.handleToggleShowStatement.bind(this)}
                    onExport={this.props.onExport}
                />
                <Hideable hidden={!this.state.showTable}>
                    <Table
                        offset={this.props.rows.offset}
                        columns={this.props.columns}
                        rows={this.props.rows.rows}
                        onExportSelected={(format, rows) => this.props.onExport(format, rows)}
                        onCopy={this.props.onCopy}
                    />
                </Hideable>
            </div>
        );
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