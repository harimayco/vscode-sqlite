# vscode-sqlite

VSCode extension to explore and query SQLite databases.

![static/sqlite_workflow_1](https://raw.githubusercontent.com/AlexCovizzi/vscode-sqlite/master/static/sqlite_workflow_1.gif "SQLite Workflow")


## Requirements
**Windows**, **MacOS**: No requirement.

**Linux**: If the extension is not working out-of-the-box, it may be necessary to install sqlite3 in your system (on Ubuntu: `sudo apt install sqlite3`)


**Note**: The extension includes precompiled binaries for the SQLite CLI (used to execute queries), in case the included binaries do not work (or if you want to use your own binaries) you need to provide the path/command to the sqlite3 CLI executable in the setting `sqlite.sqlite3`.


## Features

* **Dedicated Activity Bar Explorer**: Access SQLite directly from its own dedicated icon in the main left VS Code Activity Bar with a quick Add Database (`+`) button to browse databases, tables, views, and columns.

* **Run Query Toolbar Button**: Play button in the top-right editor title bar to instantly execute the selected query or the entire SQL document.

* **Multi-Tab Query Results**: Query outputs open in separate tabs within the bottom result panel so you can effortlessly compare and switch between past results without losing your work.

* **Interactive Column Header Filtering**: Filter query results directly from table column headers for simple `SELECT` queries. Defaults to `Contains (LIKE %...%)` with support for `Equal`, `Not Equal`, `Starts With`, `Ends With`, `>`, `<`, `>=`, `<=`, `Is NULL`, and `Is NOT NULL`. Automatically synchronizes and updates the SQL `WHERE` clause across all pages.

* **Zebra Striped Results Table & Active Row Highlighting**: Alternating striped table rows for enhanced readability, plus full row highlighting whenever any cell is selected while keeping the active cell distinctly outlined.

* **Searchable Column Show / Hide**: Toggle column visibility with a searchable popup dialog (eye icon in the toolbar), featuring a real-time column filter input and visible column counter.

* **SQL INSERT INTO Export**: Export results to SQL `INSERT INTO` statements via a column selection modal dialog with automatic primary key auto-increment ID detection and exclusion (foreign keys preserved), plus support for multi-row batch insert or single-row statements.

* **Export Formats**: Export query results to `JSON`, `CSV`, `HTML`, and customizable `SQL`.

* **Enhanced Pagination & Settings Shortcut**: Jump to first page (`⏮`) or last page (`⏭`), configure records per page, and access the extension settings page directly via the gear (`⚙️`) button in the result view.

* **Copy SQL Query**: 1-click "Copy SQL" buttons in the result view toolbar and inside the SQL statement viewer with visual confirmation.

* **Autocompletion** for SQLite keywords, table and views names, column names (autocompletion is available for an SQL document once bound to a database via `SQLite: Use Database`).

* **Grammar & Syntax Highlighting** for SQLite documents (documents with language `sqlite` or starting with `-- sqlite`).


## Commands

* **SQLite: Run Query** &nbsp; Execute query script in the editor (also available as a play button in the editor title bar).

* **SQLite: New Query** &nbsp; Create a new untitled `sqlite` file.

* **SQLite: Quick Query** &nbsp; Choose a database and execute a query without creating a new document.

* **SQLite: Use Database** &nbsp; Bind current `sql` document to the selected database.

* **SQLite: Open Database** &nbsp; Open the selected database in the sqlite explorer (available via `+` in the activity bar).

* **SQLite: Close Database** &nbsp; Remove the selected database from the sqlite explorer.

* **SQLite: Refresh Databases** &nbsp; Refresh databases open in the sqlite explorer.

* **SQLite: Show output** &nbsp; Show the extension's output channel.

* **SQLite: Change Workspace Trust** &nbsp; Change the trust of this workspace. By default every workspace is untrusted for security reasons.


## Settings

* `"sqlite.sqlite3": string` &nbsp; sqlite3 command or CLI executable path (this setting is disabled for untrusted workspaces).

* `"sqlite.logLevel": string` &nbsp; Set output channel log level (DEBUG, INFO, WARN, ERROR).

* `"sqlite.recordsPerPage": number` &nbsp; Number of records to show per page (-1 to show all records).

* `"sqlite.insertExportExcludeId": boolean` &nbsp; Exclude auto-increment primary key ID columns by default when exporting to SQL `INSERT INTO` (default: `true`).

* `"sqlite.databaseExtensions": string[]` &nbsp; The file extensions recognized as SQLite database.

* `"sqlite.setupDatabase": { [path]: { sql: string[] } }` &nbsp; Custom query to run when opening a database.

  In each entry the key is the path of the database and the value is an object with the SQL queries to run (in order).

  For example:
  
  ```{ "./users.db": { "sql": ["PRAGMA foreign_keys = ON;"] } }```
  
  Means that every time the database `users.db` is opened, the SQL query `PRAGMA foreign_keys = ON;` is executed.


## Thanks to the [Contributors](https://github.com/AlexCovizzi/vscode-sqlite/graphs/contributors)!
[mandel59 (Ryusei YAMAGUCHI)](https://github.com/mandel59), [LokiSharp (LokiSharp)](https://github.com/LokiSharp), [MrCodingB(MrCodingB)](https://github.com/MrCodingB)