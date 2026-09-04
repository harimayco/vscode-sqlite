import * as React from "react";
import { Button, Icons, Pager } from "./Base";
import BtnShowHide from "./BtnShowHide";
import BtnExportJson from "./BtnExportJson";
import BtnExportHtml from "./BtnExportHtml";
import BtnExportCsv from "./BtnExportCsv";
import BtnExportSql from "./BtnExportSql";
import BtnSql from "./BtnSql";
import Statement from "./Statement";

interface Props {
    statement: string;
    showStatement: boolean;
    pager: {
        total: number;
        offset: number;
        limit: number;
        onPage?: (offset: number, limit: number) => void;
        onChangeLimit?: (limit: number, saveAsDefault?: boolean) => void;
        onOpenSettings?: () => void;
    };
    onToggleHidden: (e?: React.MouseEvent<HTMLButtonElement>) => void;
    onExport: (format: "csv"|"html"|"json"|"sql") => void;
    onSql: () => void;
    onCopy?: (text: string) => void;
}

const ResultSetHeader: React.FunctionComponent<Props> = (props) => {
    return (
        <div style={styles.header}>
            <div style={styles.row}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
                    <BtnSql onClick={() => props.onSql()}/>
                    <Button
                        title="Copy SQL Query"
                        onClick={() => {
                            if (navigator.clipboard && navigator.clipboard.writeText) {
                                navigator.clipboard.writeText(props.statement).catch(() => {});
                            }
                            if (props.onCopy) {
                                props.onCopy(props.statement);
                            }
                        }}
                    >
                        <Icons.Copy />
                    </Button>
                </div>
                <Pager {...props.pager}/>
                <div>
                    <BtnExportCsv onClick={() => props.onExport("csv")}/>
                    <BtnExportHtml onClick={() => props.onExport("html")}/>
                    <BtnExportJson onClick={() => props.onExport("json")}/>
                    <BtnExportSql onClick={() => props.onExport("sql")}/>
                    <BtnShowHide onClick={props.onToggleHidden} />
                </div>
            </div>
            {props.showStatement && <div style={styles.row}>
                <Statement value={props.statement} onCopy={props.onCopy} />
            </div>}
        </div>
    );
};

export default ResultSetHeader;

const styles: {[prop: string]: React.CSSProperties} = {
    header: {
        display: "flex",
        flexDirection: "column",
        backgroundColor: "rgba(127, 127, 127, 0.25)",
        boxShadow: "0px 1px 0px rgba(0,0,0,0.5)",
        padding: "2px 2px",
        zIndex: 10,
        margin: "1px 0px"
    },
    row: {
        justifyContent: "space-between",
        display: "flex",
        alignItems: "center"
    }
};