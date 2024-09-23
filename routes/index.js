// routes/index.js
const express = require("express");
const router = express.Router();

// Import the database connection
const dbPromise = require("../db");



const knex = require("knex")({
  client: "mysql2",
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  },
});

// Helper function to capitalize the first letter of each word
function capitalizeName(name) {
  if (!name) return "";
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}



//function to generate dynamic where clause for filtering using knex
function generateWhereClause(conditions) {
  let query = knex.select("*").from("person");

  for(const condition of conditions) {
    const { column, value, operator } = condition;
    query = query.where(column, operator, value);
  }

  //remove select * from person and return the where clause
  const whereClause = query.toString().replace("select * from `person` where ", "");

  return whereClause.toString();

}



// This is the relations route
// It will gather all the nodes and edges for the graph
// The nodes will come from the person and organization tables
// The edges will come from the person2document, person2organization, person2religion, and relationship tables
// The edges will be between the person and the document, organization, religion, or another person
// Each node will store all the person's or organization's information
// The query will use joins to get all the information needed
router.post("/relations", async (req, res) => {

  console.log(req.body);

  const conditions = [
    { column: "firstName", value: 'Phineas', operator: 'like' },
    { column: "lastName", value: 'Pemberton', operator: 'like' }
  ];
  
  const whereClause = generateWhereClause(conditions);

  console.log(whereClause);

  

  const query = `
  select 
  id,
  firstName,
  middleName,
  lastName,
  fullName,
  biography,
  gender,
  birthDate,
  deathDate,
  LODwikiData,
  LODVIAF,
  LODLOC,
  first_prefix_id,
  last_prefix_id,
  suffix_id,
  language_id,
  personStdName,
  nodeType,
  documentID,
  importID,
  collection,
  abstract,
  letterDate,
  isJulian,
  researchNotes,
  customCitation,
  docTypeID,
  documentLanguageID,
  repositoryID,
  status,
  whoCheckedOut,
  volume,
  page,
  folder,
  transcription,
  virtual_doc,
  organizationID,
  religionID,
  organizationDesc,
  formationDate,
  dissolutionDate,
  organizationLOD,
  religionDesc,
  senderFullName,
  receiverFullName,
  date
  from
    (SELECT
      -- Select person details
      p.personID AS id,
      p.firstName,
      p.middleName,
      p.lastName,
      CONCAT(p.firstName, ' ', p.lastName) AS fullName,
      p.biography,
      p.gender,
      p.birthDate,
      p.deathDate,
      p.LODwikiData,
      p.LODVIAF,
      p.LODLOC,
      p.first_prefix_id,
      p.last_prefix_id,
      p.suffix_id,
      p.language_id,
      p.personStdName,
      'person' AS nodeType,
      NULL AS documentID,
      NULL AS importID,
      NULL AS collection,
      NULL AS abstract,
      NULL AS letterDate,
      NULL AS isJulian,
      NULL AS researchNotes,
      NULL AS customCitation,
      NULL AS docTypeID,
      NULL AS documentLanguageID,
      NULL AS repositoryID,
      NULL AS status,
      NULL AS whoCheckedOut,
      NULL AS volume,
      NULL AS page,
      NULL AS folder,
      NULL AS transcription,
      NULL AS virtual_doc,
      NULL AS organizationID,
      NULL AS religionID,
      NULL AS organizationDesc,
      NULL AS formationDate,
      NULL AS dissolutionDate,
      NULL AS organizationLOD,
      NULL AS religionDesc,
      NULL AS senderFullName,
      NULL AS receiverFullName,
      NULL AS date
    FROM person p
    UNION
    SELECT
      -- Select person to document relationship details and sender/receiver information
      p2d.personID AS id,
      p.firstName,
      p.middleName,
      p.lastName,
      CONCAT(p.firstName, ' ', p.lastName) AS fullName,
      p.biography,
      p.gender,
      p.birthDate,
      p.deathDate,
      p.LODwikiData,
      p.LODVIAF,
      p.LODLOC,
      p.first_prefix_id,
      p.last_prefix_id,
      p.suffix_id,
      p.language_id,
      p.personStdName,
      'document' AS nodeType,
      d.documentID,
      d.importID,
      d.collection,
      d.abstract,
      d.letterDate,
      d.isJulian,
      d.researchNotes,
      d.customCitation,
      d.docTypeID,
      d.languageID AS documentLanguageID,
      d.repositoryID,
      d.status,
      d.whoCheckedOut,
      d.volume,
      d.page,
      d.folder,
      d.transcription,
      d.virtual_doc,
      NULL AS organizationID,
      NULL AS religionID,
      NULL AS organizationDesc,
      NULL AS formationDate,
      NULL AS dissolutionDate,
      NULL AS organizationLOD,
      NULL AS religionDesc,
      -- Subqueries to get sender and receiver full names using GROUP_CONCAT
      (SELECT GROUP_CONCAT(CONCAT(p1.firstName, ' ', p1.lastName) SEPARATOR ', ')
       FROM person2document p2d1
       JOIN person p1 ON p2d1.personID = p1.personID
       WHERE p2d1.docID = d.documentID AND p2d1.roleID = 1) AS senderFullName,
      (SELECT GROUP_CONCAT(CONCAT(p2.firstName, ' ', p2.lastName) SEPARATOR ', ')
       FROM person2document p2d2
       JOIN person p2 ON p2d2.personID = p2.personID
       WHERE p2d2.docID = d.documentID AND p2d2.roleID = 2) AS receiverFullName,
      DATE_FORMAT(d.sortingDate, '%Y-%m-%d') AS date
    FROM person2document p2d
    JOIN person p ON p2d.personID = p.personID
    JOIN document d ON p2d.docID = d.documentID
    UNION
    SELECT
      -- Select person to organization relationship details
      p2o.personID AS id,
      p.firstName,
      p.middleName,
      p.lastName,
      CONCAT(p.firstName, ' ', p.lastName) AS fullName,
      p.biography,
      p.gender,
      p.birthDate,
      p.deathDate,
      p.LODwikiData,
      p.LODVIAF,
      p.LODLOC,
      p.first_prefix_id,
      p.last_prefix_id,
      p.suffix_id,
      p.language_id,
      p.personStdName,
      'organization' AS nodeType,
      NULL AS documentID,
      NULL AS importID,
      NULL AS collection,
      NULL AS abstract,
      NULL AS letterDate,
      NULL AS isJulian,
      NULL AS researchNotes,
      NULL AS customCitation,
      NULL AS docTypeID,
      NULL AS documentLanguageID,
      NULL AS repositoryID,
      NULL AS status,
      NULL AS whoCheckedOut,
      NULL AS volume,
      NULL AS page,
      NULL AS folder,
      NULL AS transcription,
      NULL AS virtual_doc,
      p2o.organizationID AS organizationID,
      NULL AS religionID,
      NULL AS organizationDesc,
      NULL AS formationDate,
      NULL AS dissolutionDate,
      NULL AS organizationLOD,
      NULL AS religionDesc,
      NULL AS senderFullName,
      NULL AS receiverFullName,
      NULL AS date
    FROM person2organization p2o
    JOIN person p ON p2o.personID = p.personID
    UNION
    SELECT
      -- Select person to religion relationship details
      p2r.personID AS id,
      p.firstName,
      p.middleName,
      p.lastName,
      CONCAT(p.firstName, ' ', p.lastName) AS fullName,
      p.biography,
      p.gender,
      p.birthDate,
      p.deathDate,
      p.LODwikiData,
      p.LODVIAF,
      p.LODLOC,
      p.first_prefix_id,
      p.last_prefix_id,
      p.suffix_id,
      p.language_id,
      p.personStdName,
      'religion' AS nodeType,
      NULL AS documentID,
      NULL AS importID,
      NULL AS collection,
      NULL AS abstract,
      NULL AS letterDate,
      NULL AS isJulian,
      NULL AS researchNotes,
      NULL AS customCitation,
      NULL AS docTypeID,
      NULL AS documentLanguageID,
      NULL AS repositoryID,
      NULL AS status,
      NULL AS whoCheckedOut,
      NULL AS volume,
      NULL AS page,
      NULL AS folder,
      NULL AS transcription,
      NULL AS virtual_doc,
      NULL AS organizationID,
      p2r.religionID AS religionID,
      NULL AS organizationDesc,
      NULL AS formationDate,
      NULL AS dissolutionDate,
      NULL AS organizationLOD,
      NULL AS religionDesc,
      NULL AS senderFullName,
      NULL AS receiverFullName,
      NULL AS date
    FROM person2religion p2r
    JOIN person p ON p2r.personID = p.personID
    UNION
    SELECT
      -- Select organization details
      o.organizationID AS id,
      NULL AS firstName,
      NULL AS middleName,
      NULL AS lastName,
      NULL AS fullName,
      NULL AS biography,
      NULL AS gender,
      NULL AS birthDate,
      NULL AS deathDate,
      NULL AS LODwikiData,
      NULL AS LODVIAF,
      NULL AS LODLOC,
      NULL AS first_prefix_id,
      NULL AS last_prefix_id,
      NULL AS suffix_id,
      NULL AS language_id,
      NULL AS personStdName,
      'organization' AS nodeType,
      NULL AS documentID,
      NULL AS importID,
      NULL AS collection,
      NULL AS abstract,
      NULL AS letterDate,
      NULL AS isJulian,
      NULL AS researchNotes,
      NULL AS customCitation,
      NULL AS docTypeID,
      NULL AS documentLanguageID,
      NULL AS repositoryID,
      NULL AS status,
      NULL AS whoCheckedOut,
      NULL AS volume,
      NULL AS page,
      NULL AS folder,
      NULL AS transcription,
      NULL AS virtual_doc,
      NULL AS organizationID,
      NULL AS religionID,
      o.organizationDesc,
      o.formationDate,
      o.dissolutionDate,
      o.organizationLOD,
      NULL AS religionDesc,
      NULL AS senderFullName,
      NULL AS receiverFullName,
      NULL AS date
    FROM organization o
    UNION
    SELECT
      -- Select religion details
      r.religionID AS id,
      NULL AS firstName,
      NULL AS middleName,
      NULL AS lastName,
      NULL AS fullName,
      NULL AS biography,
      NULL AS gender,
      NULL AS birthDate,
      NULL AS deathDate,
      NULL AS LODwikiData,
      NULL AS LODVIAF,
      NULL AS LODLOC,
      NULL AS first_prefix_id,
      NULL AS last_prefix_id,
      NULL AS suffix_id,
      NULL AS language_id,
      NULL AS personStdName,
      'religion' AS nodeType,
      NULL AS documentID,
      NULL AS importID,
      NULL AS collection,
      NULL AS abstract,
      NULL AS letterDate,
      NULL AS isJulian,
      NULL AS researchNotes,
      NULL AS customCitation,
      NULL AS docTypeID,
      NULL AS documentLanguageID,
      NULL AS repositoryID,
      NULL AS status,
      NULL AS whoCheckedOut,
      NULL AS volume,
      NULL AS page,
      NULL AS folder,
      NULL AS transcription,
      NULL AS virtual_doc,
      NULL AS organizationID,
      r.religionID AS religionID,
      NULL AS organizationDesc,
      NULL AS formationDate,
      NULL AS dissolutionDate,
      NULL AS organizationLOD,
      r.religionDesc AS religionDesc,
      NULL AS senderFullName,
      NULL AS receiverFullName,
      NULL AS date
    FROM religion r
    UNION
    SELECT
      -- Select relationship details
      rel.relationshipID AS id,
      NULL AS firstName,
      NULL AS middleName,
      NULL AS lastName,
      NULL AS fullName,
      NULL AS biography,
      NULL AS gender,
      NULL AS birthDate,
      NULL AS deathDate,
      NULL AS LODwikiData,
      NULL AS LODVIAF,
      NULL AS LODLOC,
      NULL AS first_prefix_id,
      NULL AS last_prefix_id,
      NULL AS suffix_id,
      NULL AS language_id,
      NULL AS personStdName,
      'relationship' AS nodeType,
      NULL AS documentID,
      NULL AS importID,
      NULL AS collection,
      NULL AS abstract,
      NULL AS letterDate,
      NULL AS isJulian,
      NULL AS researchNotes,
      NULL AS customCitation,
      NULL AS docTypeID,
      NULL AS documentLanguageID,
      NULL AS repositoryID,
      NULL AS status,
      NULL AS whoCheckedOut,
      NULL AS volume,
      NULL AS page,
      NULL AS folder,
      NULL AS transcription,
      NULL AS virtual_doc,
      NULL AS organizationID,
      NULL AS religionID,
      NULL AS organizationDesc,
      NULL AS formationDate,
      NULL AS dissolutionDate,
      NULL AS organizationLOD,
      NULL AS religionDesc,
      NULL AS senderFullName,
      NULL AS receiverFullName,
      NULL AS date
    FROM relationship rel)
    allData
    where 1=1;
  `;

  if(whereClause.length > 0) {
    //remove the semicolon from the query
    const queryMod = query.slice(0, -1);
    const whereQuery = queryMod + whereClause;
    console.log(whereQuery);
  }
  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool
      .query(query)
      .then(([rows, fields]) => {
        const nodes = [];
        const edges = [];

        rows.forEach((row) => {
          let node = nodes.find(
            (n) => n.id === row.id && n.nodeType === row.nodeType
          );
          if (!node) {
            node = {
              id: row.id,
              firstName: capitalizeName(row.firstName),
              middleName: capitalizeName(row.middleName),
              lastName: capitalizeName(row.lastName),
              fullName: capitalizeName(row.fullName),
              biography: row.biography,
              gender: row.gender,
              birthDate: row.birthDate,
              deathDate: row.deathDate,
              LODwikiData: row.LODwikiData,
              LODVIAF: row.LODVIAF,
              LODLOC: row.LODLOC,
              first_prefix_id: row.first_prefix_id,
              last_prefix_id: row.last_prefix_id,
              suffix_id: row.suffix_id,
              language_id: row.language_id,
              personStdName: row.personStdName,
              nodeType: row.nodeType,
              organizationDesc: row.organizationDesc,
              formationDate: row.formationDate,
              dissolutionDate: row.dissolutionDate,
              organizationLOD: row.organizationLOD,
              religionDesc: row.religionDesc,
              documents: [],
            };
            nodes.push(node);
          }

          if (row.documentID) {
            edges.push({
              from: row.id,
              to: row.documentID,
              type: "document",
              abstract: row.abstract,
              letterDate: row.letterDate,
              isJulian: row.isJulian,
              researchNotes: row.researchNotes,
              customCitation: row.customCitation,
              docTypeID: row.docTypeID,
              documentLanguageID: row.documentLanguageID,
              repositoryID: row.repositoryID,
              status: row.status,
              whoCheckedOut: row.whoCheckedOut,
              volume: row.volume,
              page: row.page,
              folder: row.folder,
              transcription: row.transcription,
              virtual_doc: row.virtual_doc,
              senderFullName: row.senderFullName,
              receiverFullName: row.receiverFullName,
              documentID: row.documentID,
              date: row.date,
            });
          } 
          else if (row.organizationID) {
            edges.push({
              from: row.id,
              to: row.organizationID,
              type: "organization",
              organizationDesc: row.organizationDesc,
              formationDate: row.formationDate,
              dissolutionDate: row.dissolutionDate,
              organizationLOD: row.organizationLOD,
            });
          } 
          else if (row.religionID) {
            edges.push({
              from: row.id,
              to: row.religionID,
              type: "religion",
              religionDesc: row.religionDesc,
              religionID: row.religionID,
            });
          } 
          else if (row.relationshipID) {
            edges.push({
              from: row.person1ID,
              to: row.person2ID,
              type: "relationship",
              relationship1to2ID: row.relationship1to2ID,
              relationship2to1ID: row.relationship2to1ID,
              uncertain: row.uncertain,
              relationshipType: row.relationshipType,
              relationshipDesc: row.relationshipDesc,
            });
          }
        });

        res.json({ nodes, edges });
      })
      .catch((error) => {
        console.error("Failed to run query:", error);
        res.status(500).json({ error: "Failed to run query" });
      });
  } catch (error) {
    console.error("Failed to run query:", error);
    res.status(500).json({ error: "Failed to run query" });
  }
});

router.get("/receivers", async (req, res) => {
  console.log("GET request received");

  //get all receivers from person2document

  const query = `
  SELECT
  p.personID,
  p.firstName,
  p.middleName,
  p.lastName,
  p.suffix AS suffix,
  p.biography
FROM

  person p
  INNER JOIN person2document pd ON p.personID = pd.personID
  INNER JOIN document d ON pd.docID = d.documentID
  INNER JOIN person2document pd2 ON pd2.docID = d.documentID
  INNER JOIN person r ON pd2.personID = r.personID
  WHERE
    p.personID != r.personID

  `;
  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool.query(query).then(([rows, fields]) => {
      const receivers = rows.map((row) => {
        return {
          name: `${row.firstName} ${row.lastName}`,
          image: "null",
        };
      });
      res.json(receivers);
    });
  } catch (error) {
    console.error("Failed to run query:", error);
    res.status(500).json({ error: "Failed to run query" });
    return;
  }
});

router.get("/base_query", async (req, res) => {
  console.log("GET request received");
  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    // Create an array of queries to fetch data from each table
    const queries = [
      "SELECT * FROM person",
      "SELECT * FROM keyword",
      "SELECT * FROM organization",
      "SELECT * FROM occupationtype",
      "SELECT * FROM place",
      "SELECT * FROM relationshiptype",
      "SELECT * FROM religion",
      "SELECT * FROM repository",
      "SELECT * FROM role",
    ];

    // Execute all queries in parallel
    const results = await Promise.all(
      queries.map((query) => promisePool.query(query))
    );

    // Structure the data into a JSON object
    const [
      person,
      keyword,
      organizationtype,
      occupation,
      place,
      relationshiptype,
      religion,
      repositorie,
      role,
    ] = results.map(([rows]) => rows);

    const result = {
      person,
      keyword,
      organizationtype,
      occupation,
      place,
      relationshiptype,
      religion,
      repositorie,
      role,
    };

    // Send the JSON response
    res.json(result);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
});




router.get("/documents", async (req, res) => {

  const people = `
  select
  *
  from
  person;
  `;

  const documents = `
  select
  *
  from
  document;
  `;

  const connections = `
  select
  *
  from
  person2document
  `;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    const peopleResults = await promisePool.query(people);
    const documentResults = await promisePool.query(documents);
    const connectionResults = await promisePool.query(connections);

    const peopleArr = peopleResults[0];
    const documentsArr = documentResults[0];
    const connectionsArr = connectionResults[0];

    const edges = []
    const nodes = []

    //an edge consists of two rows from the connections table
    //each row represents a connection between a person and a document
    //one row represents the sender and the other represents the receiver of the document
    //the edge is between the sender and the receiver
    //sender and receiver are determined by the roleID column in the connections table
    //roleID = 1 is the sender
    //roleID = 2 is the receiver
    //sender and receivers are nodes in the graph
    //each node has a unique personID
    //each edge has a unique documentID
    connectionsArr.forEach((connection) => {
      const documentID = connection.docID;
      const document = documentsArr.find((doc) => doc.documentID === documentID);
      
      if(connection.roleID === 1) {
        const sender = peopleArr.find((person) => person.personID === connection.personID);
        nodes.push(sender);
      }
      else if(connection.roleID === 2) {
        const receiver = peopleArr.find((person) => person.personID === connection.personID);
        nodes.push(receiver);
      }
      //check to see if the document exists in the edges array
      //if it does not exist, add it to the edges array
      //else add the sender/reciever to the edges array
      //edge object consists of the sender and receiver and the documentID
      const edge = edges.find((edge) => edge.document.documentID === documentID);

      if(!edge) {
        edges.push({
          document: document,
          sender: connection.roleID === 1 ? connection.personID : null,
          receiver: connection.roleID === 2 ? connection.personID : null
        });
      }
      else {
        if(connection.roleID === 1) {
          edge.sender = connection.personID;
        }
        else if(connection.roleID === 2) {
          edge.receiver = connection.personID;
        }
      }
      



    });

    //filter out edges that do not have a sender or receiver

    const filteredEdges = edges.filter((edge) => edge.sender && edge.receiver);

    res.json({filteredEdges, nodes});



   

  }
  catch(error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
}
);


router.get('/religion', async (req, res) => {
  const people = `
  select
  *
  from
  person;
  `;

  const religions = `
  select
  *
  from
  religion;
  `;

  const connections = `
  select
  *
  from
  person2religion
  `;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    const peopleResults = await promisePool.query(people);
    const religionResults = await promisePool.query(religions);
    const connectionResults = await promisePool.query(connections);

    const peopleArr = peopleResults[0];
    const religionsArr = religionResults[0];
    const connectionsArr = connectionResults[0];

    const edges = []
    const nodes = []

    connectionsArr.forEach((connection) => {
      const religionID = connection.religionID;
      const religion = religionsArr.find((religion) => religion.religionID === religionID);
      
      const person = peopleArr.find((person) => person.personID === connection.personID);
      nodes.push(person);

      const edge = edges.find((edgeI) =>{
        edgeI.religion.religionID === religionID
      });

        edges.push({
          religion: religion,
          person: connection.personID
        });
      

    });

    //if the person does not have a religion, remove the person from the nodes array
    const filteredNodes = nodes.filter((node) => {
      if(connectionsArr.find((connection) => connection.personID === node.personID)) {
        return node;
      }
    });

    //add the religion to the nodes array
    religionsArr.forEach((religion) => {
        filteredNodes.push(religion);
    })

    res.json({edges, filteredNodes});

  }

  catch(error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
}
);

router.get('/organization', async (req, res) => {
  const people = `
  select
  *
  from
  person;
  `;

  const organizations = `
  select
  *
  from
  organization;
  `;

  const connections = `
  select
  *
  from
  person2organization
  `;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    const peopleResults = await promisePool.query(people);
    const organizationResults = await promisePool.query(organizations);
    const connectionResults = await promisePool.query(connections);

    const peopleArr = peopleResults[0];
    const organizationsArr = organizationResults[0];
    const connectionsArr = connectionResults[0];

    const edges = []
    const nodes = []

    connectionsArr.forEach((connection) => {
      const organizationID = connection.organizationID;
      const organization = organizationsArr.find((organization) => organization.organizationID === organizationID);
      
      const person = peopleArr.find((person) => person.personID === connection.personID);
      nodes.push(person);

      const edge = edges.find((edgeI) =>{
        edgeI.organization.organizationID === organizationID
      });

        edges.push({
          organization: organization,
          person: connection.personID
        });
      

    });

    
    //if the person does not exist in the connections array, remove the person from the nodes array
    const filteredNodes = nodes.filter((node) => {
      if(connectionsArr.find((connection) => connection.personID === node.personID)) {
        return node;
      }
    });

    //add the organization to the nodes array
    organizationsArr.forEach((organization) => {
        filteredNodes.push(organization);
    })

    res.json({edges, filteredNodes});

  }

  catch(error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
}
);


router.post('/graph', async (req, res) => {
  const peopleQuery = `
    SELECT *
    FROM person;
  `;

  const documentsQuery = `
    SELECT * ,
    DATE_FORMAT(sortingDate, '%Y-%m-%d') AS date
    FROM document;
  `;

  const documentConnectionsQuery = `
    SELECT *
    FROM person2document;
  `;

  const religionsQuery = `
    SELECT *
    FROM religion;
  `;

  const religionConnectionsQuery = `
    SELECT *
    FROM person2religion;
  `;

  const organizationsQuery = `
    SELECT *
    FROM organization;
  `;

  const organizationConnectionsQuery = `
    SELECT *
    FROM person2organization;
  `;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    const [peopleResults] = await promisePool.query(peopleQuery);
    const [documentResults] = await promisePool.query(documentsQuery);
    const [documentConnectionResults] = await promisePool.query(documentConnectionsQuery);
    const [religionResults] = await promisePool.query(religionsQuery);
    const [religionConnectionResults] = await promisePool.query(religionConnectionsQuery);
    const [organizationResults] = await promisePool.query(organizationsQuery);
    const [organizationConnectionResults] = await promisePool.query(organizationConnectionsQuery);

    const peopleArr = peopleResults;
    const documentsArr = documentResults;
    const documentConnectionsArr = documentConnectionResults;
    const religionsArr = religionResults;
    const religionConnectionsArr = religionConnectionResults;
    const organizationsArr = organizationResults;
    const organizationConnectionsArr = organizationConnectionResults;

    const edges = [];
    const nodes = [];

    // Helper function to generate a unique ID based on node type and ID
    const generateUniqueId = (type, id) => `${type}_${id}`;

    // Create nodes for people
    peopleArr.forEach((person) => {
      const uniqueId = generateUniqueId('person', person.personID);
      nodes.push({
        person: { ...person, fullName: `${person.firstName} ${person.lastName}` },
        nodeType: 'person',
        id: uniqueId,
      });
    });

    // Create nodes for documents
    documentsArr.forEach((document) => {
      const uniqueId = generateUniqueId('document', document.documentID);
      nodes.push({ document, nodeType: 'document', id: uniqueId });
    });

    // Ensure each religion node is unique by checking religionID before adding
    religionsArr.forEach((religion) => {
      const uniqueId = generateUniqueId('religion', religion.religionID);
      const existingNode = nodes.find((node) => node.id === uniqueId && node.nodeType === 'religion');
      if (!existingNode) {
        nodes.push({ religion, nodeType: 'religion', id: uniqueId });
      }
    });

    // Create nodes for organizations
    organizationsArr.forEach((organization) => {
      const uniqueId = generateUniqueId('organization', organization.organizationID);
      nodes.push({ organization, nodeType: 'organization', id: uniqueId });
    });

    // Create edges for people to documents (with from/to fields and type)
    documentConnectionsArr.forEach((connection) => {
      const documentId = generateUniqueId('document', connection.docID);
      const document = documentsArr.find((doc) => generateUniqueId('document', doc.documentID) === documentId);

      if (connection.roleID === 1) { // Sender
        const senderId = generateUniqueId('person', connection.personID);
        edges.push({
          document,
          from: senderId,
          to: null,  // Initially null as we may not know receiver yet
          type: 'document',
        });
      } else if (connection.roleID === 2) { // Receiver
        const receiverId = generateUniqueId('person', connection.personID);
        const edge = edges.find((edge) => edge.document.documentID === connection.docID && !edge.to);
        if (edge) {
          edge.to = receiverId;  // Update the 'to' field for receiver
        } else {
          edges.push({
            document,
            from: null,  // Initially null as we may not know sender yet
            to: receiverId,
            type: 'document',
          });
        }
      }
    });

    // Create edges for people to religions (with from/to fields and type)
    religionConnectionsArr.forEach((connection) => {
      const religionId = generateUniqueId('religion', connection.religionID);
      const personId = generateUniqueId('person', connection.personID);
      edges.push({
        from: personId,  // From person node
        to: religionId,  // To religion node
        type: 'religion',
      });
    });

    // Create edges for people to organizations (with from/to fields and type)
    organizationConnectionsArr.forEach((connection) => {
      const organizationId = generateUniqueId('organization', connection.organizationID);
      const personId = generateUniqueId('person', connection.personID);
      edges.push({
        from: personId,  // From person node
        to: organizationId,  // To organization node
        type: 'organization',
      });
    });

    // Filter out edges where 'from' or 'to' is null
    const filteredEdges = edges.filter((edge) => edge.from !== null && edge.to !== null);

    res.json({ edges: filteredEdges, nodes, elength: filteredEdges.length, nlength: nodes.length });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Internal Server Error');
  }
});








module.exports = router;
