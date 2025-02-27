//// filepath: /C:/Users/benja/Documents/School/UCF/PRINTexpress/controllers/graphController.js
const { getPool } = require('../db');
const graphService = require('../queries/graphService');

exports.getNodes = async (req, res) => {
  try {
    const pool = await getPool();
    const nodes = await graphService.getAllNodes(pool);
    res.json(nodes);
  } catch (error) {
    console.error('Error fetching nodes:', error);
    res.status(500).send('Internal Server Error');
  }
};

exports.getEdges = async (req, res) => {
  try {
    const pool = await getPool();
    const edges = await graphService.getAllEdges(pool);
    res.json(edges);
  } catch (error) {
    console.error('Error fetching edges:', error);
    res.status(500).send('Internal Server Error');
  }
};

exports.getNodesQuery = async (req, res) => {
  try {
    const pool = await getPool();
    const nodes = await graphService.getNodesFromQuery(pool, req.body);
    res.json(nodes);
  } catch (error) {
    console.error('Error running nodes query:', error);
    res.status(500).send('Internal Server Error');
  }
};

exports.getEdgesQuery = async (req, res) => {
  try {
    const pool = await getPool();
    const edges = await graphService.getEdgesFromQuery(pool, req.body);
    res.json(edges);
  } catch (error) {
    console.error('Error running edges query:', error);
    res.status(500).send('Internal Server Error');
  }
};