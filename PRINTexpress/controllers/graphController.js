//// filepath: /C:/Users/benja/Documents/School/UCF/PRINTexpress/controllers/graphController.js
const { getPool } = require('../db');
const graphService = require('../queries/graphService');

exports.getNodes = async (req, res) => {
  let connection;
  try {
    const pool = await getPool();
    connection = await pool.acquire();
    const nodes = await graphService.getAllNodes(connection);
    res.json(nodes);
  } catch (error) {
    console.error('Error fetching nodes:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    if(connection) {
      (await getPool()).release(connection);
    }
  }
};

exports.getEdges = async (req, res) => {
  let connection;
  try {
    const pool = await getPool();
    connection = await pool.acquire();
    const edges = await graphService.getAllEdges(connection);
    res.json(edges);
  } catch (error) {
    console.error('Error fetching edges:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    if(connection) {
      (await getPool()).release(connection);
    }
  }
};

// And similarly for getNodesQuery and getEdgesQuery

exports.getNodesQuery = async (req, res) => {
  let connection;
  try {
    const pool = await getPool();
	connection = await pool.acquire();
    const nodes = await graphService.getNodesFromQuery(connection, req.body);
    res.json(nodes);
  } catch (error) {
    console.error('Error running nodes query:', error);
    res.status(500).send('Internal Server Error');
  }finally {
    if(connection) {
      (await getPool()).release(connection);
    }
  }
};

exports.getEdgesQuery = async (req, res) => {
  let connection;
  try {
    const pool = await getPool();
	connection = await pool.acquire();
    const edges = await graphService.getEdgesFromQuery(connection, req.body);
    res.json(edges);
  } catch (error) {
    console.error('Error running edges query:', error);
    res.status(500).send('Internal Server Error');
  }finally {
    if(connection) {
      (await getPool()).release(connection);
    }
  }
};