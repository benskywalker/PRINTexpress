const dbPromise = require('../db');

exports.getDocumentById = async (req, res) => {
    const query = `SELECT * FROM document WHERE documentID = ${req.params.id}`;
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

exports.getGalleryDocs = async (req, res) => {
    const query = `SELECT * FROM document_all_view`;
    try {
        const db = await dbPromise;
        const promisePool = db.promise();
        const [rows] = await promisePool.query(query);
        const documents = rows.map(documentQueries.formatDocumentData);
        res.json(documents);
    } catch (error) {
        console.error('Failed to run query:', error);
        res.status(500).json({ error: 'Failed to run query' });
    }
};