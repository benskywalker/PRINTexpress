exports.getQueryToolFields = async (pool) => {
    const queries = {
        person: "DESCRIBE person",
        document: "DESCRIBE document",
        place: "DESCRIBE place",
        organization: "DESCRIBE organization",
        religion: "DESCRIBE religion",
    };

    const results = await Promise.all(
        Object.entries(queries).map(async ([view, query]) => {
            const [rows] = await pool.query(query);
            return rows.map((row) => ({ field: row.Field, view }));
        })
    );

    return results.flat();
};

exports.buildKnexQuery = (tables, fields, operators, values, dependentFields) => {
    let knexQuery;

    if (tables && tables.length > 1) {
        // Define the first CTE for `secondary_ids`
        const secondaryIdsQuery = knex(tables[0])
            .select(fields[0]) // "docID" in person2document
            .where(fields[1], operators[0], values[0]);
        // Use `.with()` to create the CTE
        knexQuery = knex
            .with("secondary_ids", secondaryIdsQuery)
            .select("*")
            .from(tables[1])
            .whereIn(dependentFields[0], knex.select(fields[0]).from("secondary_ids"));
    } else if (tables && tables.length === 1) {
        // Single table scenario without CTEs
        knexQuery = knex(tables[0]).select("*");
        knexQuery = knexQuery.where(fields[0], operators[0], values[0]);

        for (let i = 1; i < fields.length; i++) {
            if (dependentFields[i - 1] === "AND") {
                knexQuery = knexQuery.andWhere(fields[i], operators[i], values[i]);
            } else {
                knexQuery = knexQuery.orWhere(fields[i], operators[i], values[i]);
            }
        }
    } else {
        console.log("Tables are not defined or empty");
    }

    return knexQuery;
};