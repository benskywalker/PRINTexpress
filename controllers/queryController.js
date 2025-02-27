
const { getPool } = require('../db');
const knex = require('knex')(require('../knexfile'));


exports.getQueryToolFields = async (req, res) => {
    const queries = {
        person: "DESCRIBE person",
        document: "DESCRIBE document",
        place: "DESCRIBE place",
        organization: "DESCRIBE organization",
        religion: "DESCRIBE religion"
    };

    try {
        const pool = await getPool();

        const results = await Promise.all(
            Object.entries(queries).map(async ([view, query]) => {
                const [rows] = await pool.query(query);
                return rows.map((row) => ({ field: row.Field, view }));
            })
        );

        // Flatten results into a single array
        const allFields = results.flat();
        res.json(allFields);
    } catch (error) {
        console.error("Error fetching query tool fields:", error);
        res.status(500).send("Internal Server Error");
    }
};

exports.executeKnexQuery = async (req, res) => {
    const { tables, fields, operators, values, dependentFields } = req.body;

    try {
        const pool = await getPool();
        let knexQuery = buildKnexQuery(tables, fields, operators, values, dependentFields);

        if (knexQuery) {
            const [rows] = await pool.query(knexQuery.toString());
            res.json({ rows });
        } else {
            res.status(400).json({ error: 'Invalid query parameters' });
        }
    } catch (error) {
        console.error("Error running knex query:", error);
        res.status(500).send("Internal Server Error");
    }
};


function buildKnexQuery(tables, fields, operators, values, dependentFields) {
    if (!tables || !tables.length || !fields || !operators || !values) {
        return null;
    }

    let knexQuery;

    if (tables.length > 1) {
        const secondaryIdsQuery = knex(tables[0])
            .select(fields[0])
            .where(fields[1], operators[0], values[0]);

        knexQuery = knex
            .with('secondary_ids', secondaryIdsQuery)
            .select('*')
            .from(tables[1])
            .whereIn(
                dependentFields[0],
                knex.select(fields[0]).from('secondary_ids')
            );
    }
    else if (tables.length === 1) {
        knexQuery = buildSingleTableQuery(tables[0], fields, operators, values, dependentFields);
    }

    return knexQuery;
}


function buildSingleTableQuery(table, fields, operators, values, dependentFields) {
    let query = knex(table).select('*');

    query = query.where(fields[0], operators[0], values[0]);

    for (let i = 1; i < fields.length; i++) {
        if (dependentFields[i - 1] === 'AND') {
            query = query.andWhere(fields[i], operators[i], values[i]);
        } else {
            query = query.orWhere(fields[i], operators[i], values[i]);
        }
    }

    return query;
}


function isValidOperator(operator, fieldType) {
    const numericOperators = ['=', '>', '<', '>=', '<=', '<>'];
    const stringOperators = ['=', 'LIKE', 'NOT LIKE'];
    const dateOperators = ['=', '>', '<', '>=', '<=', 'BETWEEN'];

    switch (fieldType.toLowerCase()) {
        case 'int':
        case 'decimal':
        case 'float':
            return numericOperators.includes(operator);
        case 'varchar':
        case 'text':
            return stringOperators.includes(operator);
        case 'date':
        case 'datetime':
            return dateOperators.includes(operator);
        default:
            return false;
    }
}


function sanitizeValue(value, fieldType) {
    switch (fieldType.toLowerCase()) {
        case 'int':
            return parseInt(value);
        case 'decimal':
        case 'float':
            return parseFloat(value);
        case 'date':
        case 'datetime':
            return new Date(value);
        default:
            return value.toString();
    }
}


function validateQueryParams(tables, fields, operators, values, dependentFields) {
    if (!tables?.length || !fields?.length || !operators?.length || !values?.length) {
        return false;
    }

    if (fields.length !== operators.length || fields.length !== values.length) {
        return false;
    }

    if (fields.length > 1 && dependentFields.length !== fields.length - 1) {
        return false;
    }
 
    if (dependentFields?.length) {
        const validDependentValues = ['AND', 'OR'];
        if (!dependentFields.every(field => validDependentValues.includes(field))) {
            return false;
        }
    }

    return true;
}

module.exports.buildKnexQuery = buildKnexQuery;
module.exports.buildSingleTableQuery = buildSingleTableQuery;
module.exports.isValidOperator = isValidOperator;
module.exports.sanitizeValue = sanitizeValue;
module.exports.validateQueryParams = validateQueryParams;