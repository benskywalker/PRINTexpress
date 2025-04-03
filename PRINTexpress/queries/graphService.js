const { getBasicQueries } = require('./queries');
const processNodes = require('./nodeProcessors');
const processRelationships = require('./relationshipProcessors');
const processEdges = require('./edgeProcessors');
const fetchData = require('./dataFetcher');
const { buildQueryFromParams } = require('./queryBuilder');

exports.getAllNodes = async (pool) => {
  try {
    const queries = getBasicQueries();
    
    // Execute all queries in parallel
    const [
      [peopleResults],
      [documentResults],
      [religionResults],
      [organizationResults],
      [people2documentResults],
      [relationshipsResults],
      [keywordsResults],
    ] = await Promise.all([
      pool.query(queries.peopleQuery),
      pool.query(queries.documentsQuery),
      pool.query(queries.religionsQuery),
      pool.query(queries.organizationsQuery),
      pool.query(queries.person2documentQuery),
      pool.query(queries.relationshipsQuery),
      pool.query(queries.keywordsQuery),
    ]);

    const nodesMap = new Map([
      ...processNodes.processPeople(peopleResults),
      ...processNodes.processDocuments(documentResults),
      ...processNodes.processReligions(religionResults),
      ...processNodes.processOrganizations(organizationResults)
    ]);

    processNodes.processKeywords(keywordsResults, nodesMap);
    processRelationships.processPerson2Document(people2documentResults, nodesMap, peopleResults);
    processRelationships.processRelationships(relationshipsResults, nodesMap);

    return Array.from(nodesMap.values());
  } catch (error) {
    console.error('Error in getAllNodes:', error);
    throw error;
  }
};

exports.getAllEdges = async (pool) => {
  try {
    const queries = getBasicQueries();
    
    const [
      [person2documentResults],
      [person2religionResults],
      [person2organizationResults],
      [relationshipResults]
    ] = await Promise.all([
      pool.query(queries.person2documentQuery),
      pool.query('SELECT * FROM person2religion'),
      pool.query('SELECT * FROM person2organization'),
      pool.query(queries.relationshipsQuery)
    ]);

    const edgesMap = new Map([
      ...processEdges.processPersonDocumentEdges(person2documentResults),
      ...processEdges.processReligionEdges(person2religionResults),
      ...processEdges.processOrganizationEdges(person2organizationResults),
      ...processEdges.processRelationshipEdges(relationshipResults)
    ]);

    return Array.from(edgesMap.values());
  } catch (error) {
    console.error('Error in getAllEdges:', error);
    throw error;
  }
};

exports.getNodesFromQuery = async (pool, queryParams) => {
  try {
    const query = buildQueryFromParams(queryParams);
    const [rows] = await pool.query(query.toString());

    const ids = {
      personIDs: new Set(),
      documentIDs: new Set(),
      organizationIDs: new Set(),
      religionIDs: new Set()
    };

    rows.forEach(row => {
      const { tables } = queryParams;
      if (tables[0] === 'person') ids.personIDs.add(row.personID);
      else if (tables[0] === 'document') ids.documentIDs.add(row.documentID);
      else if (tables[0] === 'organization') ids.organizationIDs.add(row.organizationID);
      else if (tables[0] === 'religion') ids.religionIDs.add(row.religionID);
    });

    const person2documentResults = [];
    
    if (ids.personIDs.size > 0) {
      const personDocs = await fetchData.getPersonDocuments(pool, Array.from(ids.personIDs));
      
      person2documentResults.push(...personDocs);
      
      personDocs.forEach(doc => ids.documentIDs.add(doc.docID));

      const relationships = await fetchData.getPersonRelationships(pool, Array.from(ids.personIDs));
      relationships.forEach(rel => {
        ids.personIDs.add(rel.person1ID);
        ids.personIDs.add(rel.person2ID);
      });
    }

    const data = await fetchData.getBasicData(pool, ids);
    const nodesMap = new Map();
    
    if (data.persons.length) {
      processNodes.processPeople(data.persons).forEach((value, key) => nodesMap.set(key, value));
    }
    if (data.documents.length) {
      processNodes.processDocuments(data.documents).forEach((value, key) => nodesMap.set(key, value));
    }
    if (data.organizations.length) {
      processNodes.processOrganizations(data.organizations).forEach((value, key) => nodesMap.set(key, value));
    }
    if (data.religions.length) {
      processNodes.processReligions(data.religions).forEach((value, key) => nodesMap.set(key, value));
    }

    if (person2documentResults.length > 0) {
      let documentsQuery = 'SELECT * FROM document WHERE documentID IN (?)';
      const [fullDocResults] = await pool.query(documentsQuery, [Array.from(ids.documentIDs)]);
      
      const docIdsArray = Array.from(ids.documentIDs);
      let p2dQuery = 'SELECT * FROM person2document WHERE docID IN (?)';
      const [allP2DResults] = await pool.query(p2dQuery, [docIdsArray]);
      
      const allDocPersonIds = new Set(allP2DResults.map(p2d => p2d.personID));
      
      const [allPeopleResults] = await pool.query(
        'SELECT * FROM person WHERE personID IN (?)', 
        [Array.from(allDocPersonIds)]
      );
      
      allPeopleResults.forEach(person => {
        const personKey = `person_${person.personID}`;
        if (!nodesMap.has(personKey)) {
          const processedPerson = processNodes.processPeople([person]).get(personKey);
          nodesMap.set(personKey, processedPerson);
        }
      });
      
      fullDocResults.forEach(doc => {
        const docKey = `document_${doc.documentID}`;
        if (!nodesMap.has(docKey)) {
          const processedDoc = processNodes.processDocuments([doc]).get(docKey);
          nodesMap.set(docKey, processedDoc);
        }
      });
      
      processRelationships.processPerson2Document(allP2DResults, nodesMap, allPeopleResults);
    }

    if (ids.personIDs.size > 0) {
      const relationships = await fetchData.getPersonRelationships(pool, Array.from(ids.personIDs));
      processRelationships.processRelationships(relationships, nodesMap);
    }
    
    return Array.from(nodesMap.values());
  } catch (error) {
    console.error('Error in getNodesFromQuery:', error);
    throw error;
  }
};

exports.getEdgesFromQuery = async (pool, queryParams) => {
  try {
    const nodes = await this.getNodesFromQuery(pool, queryParams);
    const ids = {
      personIDs: new Set(),
      documentIDs: new Set(),
      organizationIDs: new Set(),
      religionIDs: new Set()
    };

    nodes.forEach(node => {
      if (node.nodeType === 'person') ids.personIDs.add(node.personID);
      else if (node.nodeType === 'document') ids.documentIDs.add(node.documentID);
      else if (node.nodeType === 'organization') ids.organizationIDs.add(node.organizationID);
      else if (node.nodeType === 'religion') ids.religionIDs.add(node.religionID);
    });

    const edgesMap = new Map();

    if (ids.personIDs.size > 0 && ids.documentIDs.size > 0) {
      const docIdsArray = Array.from(ids.documentIDs);
      let p2dQuery = 'SELECT * FROM person2document WHERE docID IN (?)';
      const [allDocEdges] = await pool.query(p2dQuery, [docIdsArray]);
      
      const processedEdges = processEdges.processPersonDocumentEdges(allDocEdges);
      processedEdges.forEach((value, key) => {
        edgesMap.set(key, value);
      });
    }

    if (ids.personIDs.size > 0 && ids.religionIDs.size > 0) {
      const personReligionEdges = await fetchData.getPersonReligionEdges(
        pool,
        Array.from(ids.personIDs),
        Array.from(ids.religionIDs)
      );
      
      const processedEdges = processEdges.processReligionEdges(personReligionEdges);
      processedEdges.forEach((value, key) => {
        edgesMap.set(key, value);
      });
    }

    if (ids.personIDs.size > 0 && ids.organizationIDs.size > 0) {
      const personOrgEdges = await fetchData.getPersonOrganizationEdges(
        pool,
        Array.from(ids.personIDs),
        Array.from(ids.organizationIDs)
      );
      
      const processedEdges = processEdges.processOrganizationEdges(personOrgEdges);
      processedEdges.forEach((value, key) => {
        edgesMap.set(key, value);
      });
    }

    if (ids.personIDs.size > 0) {
      const relationships = await fetchData.getPersonRelationships(
        pool,
        Array.from(ids.personIDs)
      );
      
      const processedEdges = processEdges.processRelationshipEdges(relationships);
      processedEdges.forEach((value, key) => {
        edgesMap.set(key, value);
      });
    }

    return Array.from(edgesMap.values());
  } catch (error) {
    console.error('Error: ', error);
    throw error;
  }
};