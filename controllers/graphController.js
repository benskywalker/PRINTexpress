const dbPromise = require('../db');
const graphService = require('../queries/graphService');

exports.getNodes = async (req, res) => {
    try {
        const db = await dbPromise;
        const promisePool = db.promise();
        const nodes = await graphService.getAllNodes(promisePool);
        res.json(nodes);
    } catch (error) {
        console.error('Error fetching nodes:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.getEdges = async (req, res) => {
    try {
        const db = await dbPromise;
        const promisePool = db.promise();
        const edges = await graphService.getAllEdges(promisePool);
        res.json(edges);
    } catch (error) {
        console.error('Error fetching edges:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.getNodesQuery = async (req, res) => {
    try {
        const db = await dbPromise;
        const promisePool = db.promise();
        const nodes = await graphService.getNodesFromQuery(promisePool, req.body);
        res.json(nodes);
    } catch (error) {
        console.error('Error running nodes query:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.getEdgesQuery = async (req, res) => {
    try {
        const db = await dbPromise;
        const promisePool = db.promise();
        const edges = await graphService.getEdgesFromQuery(promisePool, req.body);
        res.json(edges);
    } catch (error) {
        console.error('Error running edges query:', error);
        res.status(500).send('Internal Server Error');
    }
};