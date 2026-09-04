import * as React from "react";
import ResultSet from "./ResultSet";
import { ResultSetData } from "../api";

interface Props {
    list: Array<ResultSetData>;
    onExport: (format: string, result: number, rows?: (string | number)[][]) => void;
    onRows: (offset: number, limit: number, result: number) => void;
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
                    onCopy={props.onCopy}
                />
            ))}
        </div>
    );
};

export default ResultSetList;