const dbPromise = require('../db');
const knex = require('knex')(require('../knexfile'));

exports.getAllPersons = async (req, res) => {
    const query = `SELECT
    p.personID,
    CONCAT(p.firstName, " ", p.lastName) as fullName,
    p.firstName,
    p.middleName,
    p.lastName,
    p.maidenName,
    p.biography,
    p.gender,
    p.birthDate,
    p.deathDate,
    p.personStdName,
    GROUP_CONCAT(DISTINCT r.religionDesc) as religion,
    GROUP_CONCAT(DISTINCT l.languageDesc) as language,
    GROUP_CONCAT(DISTINCT o.organizationDesc) AS organization
  FROM person p
  LEFT JOIN person2religion pr ON pr.personID = p.personID
  LEFT JOIN religion r ON r.religionID = pr.religionID
  LEFT JOIN language l on l.languageID = p.language_id
  LEFT JOIN person2organization p2org ON p.personID = p2org.personID
  LEFT JOIN organization o ON o.organizationID = p2org.organizationID
  GROUP BY p.personID`;

    try {
        const db = await dbPromise;
        const promisePool = db.promise();
        const [rows] = await promisePool.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Failed to run query:', error);
        res.status(500).json({ error: 'Failed to run query' });
    }
};

exports.getPersonByName = async (req, res) => {
    const query = `SELECT * FROM person WHERE firstName LIKE '${req.params.name}%' OR lastName LIKE '${req.params.name}%'`;
    try {
        const db = await dbPromise;
        const promisePool = db.promise();
        const [rows] = await promisePool.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Failed to run query:', error);
        res.status(500).json({ error: 'Failed to run query' });
    }
};

exports.getPersonById = async (req, res) => {
    try {
        const db = await dbPromise;
        const promisePool = db.promise();
        const personData = await personQueries.getPersonData(promisePool, req.params.personID);
        res.json(personData);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Internal Server Error');
    }
};