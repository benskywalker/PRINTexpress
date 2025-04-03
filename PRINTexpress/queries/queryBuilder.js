const knex = require('knex')(require('../knexfile'));

exports.buildQueryFromParams = (queryParams) => {
  const { tables, fields, operators, values, dependentFields } = queryParams;
  
  let query = knex(tables[0]).select('*');
  
  for (let i = 0; i < fields.length; i++) {
    if (i === 0) {
      query = query.where(fields[i], operators[i], values[i]);
    } else {
      if (dependentFields[i - 1] === 'AND') {
        query = query.andWhere(fields[i], operators[i], values[i]);
      } else {
        query = query.orWhere(fields[i], operators[i], values[i]);
      }
    }
  }
  
  return query;
};