//// filepath: /C:/Users/benja/Documents/School/UCF/PRINTexpress/controllers/personController.js
const { getPool } = require('../db');
const personQueries = require('../queries/personQueries');

exports.getAllPersons = async (req, res) => {
  const query = `SELECT
    p.personID,
    CONCAT(p.firstName, " ", p.lastName) AS fullName,
    p.firstName, p.middleName, p.lastName,
    p.maidenName, p.biography, p.gender,
    p.birthDate, p.deathDate, p.personStdName,
    GROUP_CONCAT(DISTINCT r.religionDesc) AS religion,
    GROUP_CONCAT(DISTINCT l.languageDesc) AS language,
    GROUP_CONCAT(DISTINCT o.organizationDesc) AS organization
  FROM person p
  LEFT JOIN person2religion pr ON pr.personID = p.personID
  LEFT JOIN religion r ON r.religionID = pr.religionID
  LEFT JOIN language l ON l.languageID = p.language_id
  LEFT JOIN person2organization p2org ON p.personID = p2org.personID
  LEFT JOIN organization o ON o.organizationID = p2org.organizationID
  GROUP BY p.personID`;
  
  let connection;
  try {
    const pool = await getPool();
    connection = await pool.acquire();
    const [rows] = await connection.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Failed to run query:', error);
    res.status(500).json({ error: 'Failed to run query' });
  } finally {
    if (connection) {
      (await getPool()).release(connection);
    }
  }
};

exports.getPersonByName = async (req, res) => {
  const query = `SELECT * FROM person WHERE firstName LIKE '${req.params.name}%' OR lastName LIKE '${req.params.name}%'`;
  let connection;
  try {
    const pool = await getPool();
    connection = await pool.acquire();
    const [rows] = await connection.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Failed to run query:', error);
    res.status(500).json({ error: 'Failed to run query' });
  } finally {
    if(connection) {
      (await getPool()).release(connection);
    }
  }
};

exports.getPersonById = async (req, res) => {
  const query = personQueries.personQuery;
  let connection;
  try {
    const pool = await getPool();
    connection = await pool.acquire();
    const [rows] = await connection.query(query, [req.params.personID]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    if(connection) {
      (await getPool()).release(connection);
    }
  }
};