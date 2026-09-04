import * as React from "react";
import ResultSet from "./ResultSet";
import { ColumnFilter, ResultSetData } from "../api";

interface Props {
    list: Array<ResultSetData>;
    onExport: (format: string, result: number, rows?: (string | number)[][]) => void;
    onRows: (offset: number, limit: number, result: number) => void;
    onChangeLimit?: (limit: number, result: number, saveAsDefault?: boolean) => void;
    onOpenSettings?: () => void;
    onApplyFilter?: (filters: ColumnFilter[], resultIndex: number) => void;
    onCopy?: (text: string) => void;
}

const ResultSetList: React.FunctionComponent<Props> = (props) => {
    return (
        <div>
            {props.list.map((item, index) => (
                <ResultSet
                    key={index} {...item}
                    onExport={(format, rows) => props.onExport(format, index, rows)}
                    onRows={(offset, limit) => props.onRows(offset, limit, index)}
                    onChangeLimit={(limit, saveAsDefault) => props.onChangeLimit && props.onChangeLimit(limit, index, saveAsDefault)}
                    onOpenSettings={props.onOpenSettings}
                    onApplyFilter={(filters) => props.onApplyFilter && props.onApplyFilter(filters, index)}
                    onCopy={props.onCopy}
                />
            ))}
        </div>
    );
};

export default ResultSetList;