const { getPool } = require('../db');
const documentQueries = require('../queries/documentQueries');

exports.getDocumentById = async (req, res) => {
  const query = `SELECT * FROM document WHERE documentID = ${req.params.id}`;
  try {
    const pool = await getPool();
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Failed to run query:', error);
    res.status(500).json({ error: 'Failed to run query' });
  }
};

exports.getGalleryDocs = async (req, res) => {
  const query = `SELECT * FROM document_all_view`;
  try {
    const pool = await getPool();
    const [rows] = await pool.query(query);
    const documents = rows.map(documentQueries.formatDocumentData);
    res.json(documents);
  } catch (error) {
    console.error('Failed to run query:', error);
    res.status(500).json({ error: 'Failed to run query' });
  }
};