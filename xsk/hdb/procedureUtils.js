var HDB_UTILS = require('xsk/hdb/hdbUtils');

exports.SQL_TABLE_TYPE = 0;
exports.PROCEDURE_IN_PARAMETER = 1;
exports.PROCEDURE_IN_OUT_PARAMETER = 2;
exports.PROCEDURE_OUT_PARAMETER = 4;

exports.isProcedureInParamType = function (parameterType) {
    return parameterType === exports.PROCEDURE_IN_PARAMETER || parameterType === exports.PROCEDURE_IN_OUT_PARAMETER;
};

exports.isProcedureOutParamType = function (parameterType) {
    return parameterType === exports.PROCEDURE_IN_OUT_PARAMETER || parameterType === exports.PROCEDURE_OUT_PARAMETER;
};

exports.getProcedureParameters = function (connection, procedureName) {
    let parameters = [];
    let resultSet = connection.native.getMetaData().getProcedureColumns(null, null, procedureName, "%");
    while (resultSet.next()) {
        parameters.push({
            parameterName: resultSet.getString("COLUMN_NAME"),
            parameterType: resultSet.getShort("COLUMN_TYPE"),
            parameterTypeName: resultSet.getString("TYPE_NAME"),
            parameterDataType: resultSet.getInt("DATA_TYPE"),
            parameterValue: null
        })
    }
    return parameters;
};

exports.setProcedureParameters = function (preparedCallableStatement, procedureParameters) {
    for (var i = 0, paramIndex = 1; i < procedureParameters.length; i++, paramIndex++) {
        let procedureParameter = procedureParameters[i];
        if (exports.isProcedureInParamType(procedureParameter.parameterType)) {
            HDB_UTILS.setParamByType(preparedCallableStatement, procedureParameter.parameterTypeName, procedureParameter.parameterValue, paramIndex);
        }
    }
};

exports.getProcedureOutParamValue = function (procedureCallStatement, procedureParameter, resultSet) {
    switch (procedureParameter.parameterDataType) {
        case java.sql.Types.TINYINT:
            return procedureCallStatement.getByte(procedureParameter.parameterName);
        case java.sql.Types.VARCHAR:
            return procedureCallStatement.getString(procedureParameter.parameterName);
        case java.sql.Types.NVARCHAR:
            return procedureCallStatement.getNString(procedureParameter.parameterName);
        case java.sql.Types.ARRAY:
            return procedureCallStatement.getArray(procedureParameter.parameterName);
        case java.sql.Types.BIGINT:
            return procedureCallStatement.getInt(procedureParameter.parameterName);
        case java.sql.Types.BOOLEAN:
            return procedureCallStatement.getBoolean(procedureParameter.parameterName);
        case java.sql.Types.INTEGER:
            return procedureCallStatement.getInt(procedureParameter.parameterName);
        case java.sql.Types.TIME:
            return procedureCallStatement.getTime(procedureParameter.parameterName);
        case java.sql.Types.TIMESTAMP:
            return procedureCallStatement.getTimestamp(procedureParameter.parameterName);
        case java.sql.Types.BLOB:
            return procedureCallStatement.getBlob(procedureParameter.parameterName);
        case java.sql.Types.DATE:
            return procedureCallStatement.getDate(procedureParameter.parameterName);
        case java.sql.Types.DOUBLE:
            return procedureCallStatement.getDouble(procedureParameter.parameterName);
        case java.sql.Types.FLOAT:
            return procedureCallStatement.getFloat(procedureParameter.parameterName);
        case java.sql.Types.BIGINT:
            return procedureCallStatement.getInt(procedureParameter.parameterName);
        case java.sql.Types.DECIMAL:
            return procedureCallStatement.getBigDecimal(procedureParameter.parameterName);
        case java.sql.Types.SQLXML:
            return procedureCallStatement.getSQLXML(procedureParameter.parameterName);
        case java.sql.Types.URL:
            return procedureCallStatement.getUrl(procedureParameter.parameterName);
        case java.sql.Types.NUMERIC:
            return procedureCallStatement.getInt(procedureParameter.parameterName);
        case java.sql.Types.NCLOB:
            return procedureCallStatement.getNClob(procedureParameter.parameterName);
        case java.sql.Types.CLOB:
            return procedureCallStatement.getClob(procedureParameter.parameterName);
        case java.sql.Types.NCHAR:
            return procedureCallStatement.getNString(procedureParameter.parameterName);
        case java.sql.Types.REF:
            return procedureCallStatement.getRef(procedureParameter.parameterName);
        case java.sql.Types.JAVA_OBJECT:
            return procedureCallStatement.getObject(procedureParameter.parameterName);
        case java.sql.Types.LONG:
            return procedureCallStatement.getLong(procedureParameter.parameterName);
        case java.sql.Types.ROWID:
            return procedureCallStatement.getRowId(procedureParameter.parameterName);
        case exports.SQL_TABLE_TYPE:
            let tableObj = {
                length: 0
            };
            for (let i = 0; i < resultSet.length; i++) {
                tableObj[i] = resultSet[i];
                tableObj.length++;
            }
            return tableObj;
        default:
            throw new Error(`Unsupported procedure result OUT parameter data type '${procedureParameter.parameterDataType}'`);
    }
};

// -----------------------------------------------------------------------------------------------------------------
// TODO: Related to #1464 [API] Procedure - Input parameter must be a table (https://github.com/SAP/xsk/issues/1464)
// -----------------------------------------------------------------------------------------------------------------
function dropTemporaryTable(connection, tableName) {
    let sql = `DROP TABLE ${tableName}`;
    let ps = null;
    try {
        ps = connection.prepareStatement(sql);
        isCreated = ps.executeUpdate();
    } finally {
        if (ps !== null && ps !== undefined) {
            ps.close();
        }
    }
}

function createTemporaryTable(connection, tableName, tableType) {
    let sql = `CREATE LOCAL TEMPORARY TABLE ${tableName} like ${tableType}`;
    let ps = null;
    try {
        ps = connection.prepareStatement(sql);
        isCreated = ps.executeUpdate();
    } finally {
        if (ps !== null && ps !== undefined) {
            ps.close();
        }
    }
}

function insertTemporaryTableData(connection, tableName, row) {
    let sql = `INSERT INTO ${tableName} (${Object.keys(row).join(",")}) VALUES (${Object.keys(row).map(() => "?").join(",")})`;
    let ps = null;
    try {
        ps = connection.prepareStatement(sql);
        let objKeys = Object.keys(row);
        for (let i = 0; i < objKeys.length; i++) {
            let value = row[objKeys[i]]
            if (Number.isInteger(value)) {
                ps.setInt(i + 1, value);
            } else {
                ps.setString(i + 1, value);
            }
        }
        isCreated = ps.executeUpdate();
    } finally {
        if (ps !== null && ps !== undefined) {
            ps.close();
        }
    }
    return sql;
}

function getTemporaryTableData(connection, tableName) {
    let sql = `SELECT * FROM ${tableName}`;
    let ps = null;
    try {
        ps = connection.prepareStatement(sql);
        let rs = ps.executeQuery();
        return JSON.parse(rs.toJson());
    } finally {
        if (ps !== null && ps !== undefined) {
            ps.close();
        }
    }
}