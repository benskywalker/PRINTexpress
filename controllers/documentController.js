//// filepath: /C:/Users/benja/Documents/School/UCF/PRINTexpress/controllers/documentController.js
const { getPool } = require('../db');
const documentQueries = require('../queries/documentQueries');

exports.getDocumentById = async (req, res) => {
  const query = `SELECT * FROM document WHERE documentID = ${req.params.id}`;
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

exports.getGalleryDocs = async (req, res) => {
  const query = `SELECT * FROM document_all_view`;
  let connection;
  try {
    const pool = await getPool();
    connection = await pool.acquire();
    const [rows] = await connection.query(query);
    const documents = rows.map(documentQueries.formatDocumentData);
    res.json(documents);
  } catch (error) {
    console.error('Failed to run query:', error);
    res.status(500).json({ error: 'Failed to run query' });
  } finally {
    if(connection) {
      (await getPool()).release(connection);
    }
  }
};