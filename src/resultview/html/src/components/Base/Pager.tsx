import * as React from "react";
import { Button, Icons } from "../Base";

interface Props {
    total: number; // total number of records
    offset: number; // current offset
    limit: number; // limit per page
    onPage?: (offset: number, limit: number) => void;
    onChangeLimit?: (limit: number, saveAsDefault?: boolean) => void;
    onOpenSettings?: () => void;
}

interface State {
}

class Pager extends React.Component<Props, State> {

    constructor(props: Props) {
        super(props);
        this.state = {};
    }

    render() {
        const currentPage = this.getCurrentPage();
        const totalPages = this.getTotalPages();
        const rowStart = this.padLeft(String(this.props.total > 0 ? this.props.offset + 1 : 0), String(this.props.total).length);
        const rowEndNumber = this.props.offset + this.props.limit < this.props.total ? this.props.offset + this.props.limit : this.props.total;
        const rowEnd = this.padLeft(String(rowEndNumber), String(this.props.total).length);

        return (
            <div style={{ display: "inline-flex", alignItems: "center" }}>
                <table style={styles.pager}>
                    <tbody>
                        <tr>
                            <td>
                                <Button
                                    title="First Page"
                                    disabled={currentPage <= 1}
                                    onClick={() => this.changePage(1)}
                                >
                                    <Icons.ArrowFirst />
                                </Button>
                            </td>
                            <td>
                                <Button
                                    title="Previous Page"
                                    disabled={currentPage <= 1}
                                    onClick={(event) => this.handlePrevClick(event, currentPage)}
                                >
                                    <Icons.ArrowLeft />
                                </Button>
                            </td>
                            <td style={{ whiteSpace: "nowrap" }}>
                                {this.renderPageInput(currentPage, totalPages)}{" "}
                                <span>{` / ${totalPages}`}</span>
                            </td>
                            <td>
                                <Button
                                    title="Next Page"
                                    disabled={currentPage >= totalPages}
                                    onClick={(event) => this.handleNextClick(event, currentPage)}
                                >
                                    <Icons.ArrowRight />
                                </Button>
                            </td>
                            <td>
                                <Button
                                    title="Last Page"
                                    disabled={currentPage >= totalPages}
                                    onClick={() => this.changePage(totalPages)}
                                >
                                    <Icons.ArrowLast />
                                </Button>
                            </td>
                            <td style={{ whiteSpace: "nowrap" }}>
                                &nbsp;{`${rowStart} - ${rowEnd} of `}<b>{this.props.total}</b>
                            </td>
                            <td style={{ whiteSpace: "nowrap", paddingLeft: "8px" }}>
                                <select
                                    style={styles.select}
                                    value={this.props.limit}
                                    onChange={this.handleLimitSelect.bind(this)}
                                    title="Change pagination limit"
                                >
                                    <option value={10}>10 / page</option>
                                    <option value={20}>20 / page</option>
                                    <option value={50}>50 / page</option>
                                    <option value={100}>100 / page</option>
                                    <option value={200}>200 / page</option>
                                    <option value={500}>500 / page</option>
                                    {this.props.total > 0 && <option value={this.props.total}>All ({this.props.total})</option>}
                                </select>
                            </td>
                            <td>
                                <Button
                                    title="Open SQLite Extension Settings"
                                    onClick={() => {
                                        if (this.props.onOpenSettings) {
                                            this.props.onOpenSettings();
                                        }
                                    }}
                                >
                                    <Icons.Gear />
                                </Button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }

    private handleLimitSelect(event: React.ChangeEvent<HTMLSelectElement>) {
        const newLimit = parseInt(event.target.value, 10);
        if (this.props.onChangeLimit) {
            this.props.onChangeLimit(newLimit, false);
        }
    }

    private renderPageInput(currentPage: number, totalPages: number) {
        return (
            <input style={{...styles.input, width: (totalPages.toString().length + 1) + "em"}}
                type="number" min={1} max={totalPages} value={currentPage}
                onChange={this.handleInputChange.bind(this)}
            />
        );
    }

    private handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
        this.changePage(Number(event.target.value));
    }

    private handlePrevClick(event: React.MouseEvent, currentPage: number) {
        event.preventDefault();
        this.changePage(currentPage - 1);
    }

    private handleNextClick(event: React.MouseEvent, currentPage: number) {
        event.preventDefault();
        this.changePage(currentPage + 1);
    }

    private changePage(newPage: number) {
        let newOffset = (newPage - 1) * this.props.limit;
        newOffset = Math.min(newOffset, (this.getTotalPages() - 1) * this.props.limit);
        newOffset = Math.max(newOffset, 0);

        if (this.props.onPage){
            this.props.onPage(newOffset, this.props.limit);
        }
    }

    private getCurrentPage() {
        return Math.floor(this.props.offset / this.props.limit) + 1;
    }

    private getTotalPages() {
        return Math.max(1, Math.ceil(this.props.total / this.props.limit));
    }

    private padLeft(str: string, until: number, char: string = ' ') {
        while(str.length < until) {
            str = char + str;
        }
        return str;
    }

}

export default Pager;


const styles: {[prop: string]: React.CSSProperties} = {
    pager: {
        backgroundColor: "transparent",
        fontFamily: "var(--vscode-editor-font-family)",
        fontSize: "var(--vscode-editor-font-size)"
    },
    input: {
        color: "var(--vscode-editor-foreground)",
        fontFamily: "var(--vscode-editor-font-family)",
        fontSize: "var(--vscode-editor-font-size)",
        textAlign: "center",
        backgroundColor: "rgba(127, 127, 127, 0.25)",
        border: "none"
    },
    select: {
        color: "var(--vscode-dropdown-foreground, var(--vscode-editor-foreground))",
        backgroundColor: "var(--vscode-dropdown-background, rgba(127, 127, 127, 0.25))",
        border: "1px solid var(--vscode-dropdown-border, rgba(128, 128, 128, 0.4))",
        borderRadius: "2px",
        padding: "1px 4px",
        fontSize: "11px",
        fontFamily: "var(--vscode-editor-font-family, sans-serif)",
        cursor: "pointer",
        outline: "none",
    }
};