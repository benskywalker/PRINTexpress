const express = require('express');
const router = express.Router();
const knex = require('knex')(require('../knexfile'));
const fs = require('fs');
const path = require('path');
const scpClient = require('scp2');
require('dotenv').config();

const {
  getAllPersons,
  getPersonByName,
  getPersonById
} = require('../controllers/personController');

const {
  getDocumentById,
  getGalleryDocs
} = require('../controllers/documentController');

const {
  getNodes,
  getEdges,
  getNodesQuery,
  getEdgesQuery
} = require('../controllers/graphController');

const {
  getQueryToolFields,
  executeKnexQuery
} = require('../controllers/queryController');

const {
  getPdf
} = require('../controllers/pdfController');

router.get('/persons', getAllPersons);
router.get('/persons/:name', getPersonByName);
router.get('/person/:personID', getPersonById);

router.get('/documents/:id', getDocumentById);
router.get('/gallery/docs', getGalleryDocs);

router.post('/nodes', getNodes);
router.post('/edges', getEdges);
router.post('/nodes-query', getNodesQuery);
router.post('/edges-query', getEdgesQuery);

router.get('/query-tool-fields', getQueryToolFields);
router.post('/knex-query', executeKnexQuery);

const sshConfig = {
  host: process.env.DB_HOST,
  username: process.env.DB_SSH_USER,
  password: process.env.DB_SSH_PASSWORD,
  port: 22
};

router.get('/pdf/:pdfName', getPdf);

module.exports = router;