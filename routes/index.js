// routes/index.js
const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const scpClient = require("scp2");
const knex = require("knex")(require("../knexfile"));
require("dotenv").config();

// Import the database connection
const dbPromise = require("../db");
const { type } = require("os");

router.get("/", async (req, res) => {
  console.log("GET request received");

  // Define the query
  const query = `SELECT
  p.personID,
  p.firstName,
  p.middleName,
  p.lastName,
  p.suffix,
  p.biography,
  p.gender,
  p.birthDate,
  p.deathDate,
  p.last_prefix,
  p.LODwikiData,
  p.LODVIAF,
  p.LODLOC,
  p.first_prefix_id,
  p.last_prefix_id,
  p.suffix_id,
  p.language_id,
  p.personStdName,
  
  -- From person2document
  pd.docID AS documentID,
  d.importID,
  d.collection,
  d.abstract,
  d.sortingDate,
  d.letterDate,
  d.isJulian,
  d.researchNotes,
  d.customCitation,
  d.docTypeID,
  d.languageID AS documentLanguageID,
  d.repositoryID,
  d.dateAdded,
  d.status,
  d.whoCheckedOut,
  d.volume,
  d.page,
  d.folder,
  d.transcription,
  d.translation,
  d.virtual_doc,

  -- From person2occupation
  po.occupationID,
  po.dateSpan AS occupationDateSpan,
  po.uncertain AS occupationUncertain,
  ot.occupationDesc,

  -- From person2organization
  po2.organizationID,
  po2.dateSpan AS organizationDateSpan,
  po2.uncertain AS organizationUncertain,
  org.organizationName,
  org.formationDate,
  org.dissolutionDate,
  org.organizationLOD,

  -- From person2religion
  pr.religionID,
  pr.dateSpan AS religionDateSpan,
  pr.uncertain AS religionUncertain,
  r.religionDesc,

  -- From mentions
  m.documentID AS mentionDocumentID,
  m.placeID AS mentionPlaceID,
  m.keywordID AS mentionKeywordID,
  m.organizationID AS mentionOrganizationID,
  m.religionID AS mentionReligionID,
  m.dateStart AS mentionDateStart,
  m.comment AS mentionComment,
  m.person_uncertain AS mentionPersonUncertain,
  m.place_uncertain AS mentionPlaceUncertain,
  m.keyword_uncertain AS mentionKeywordUncertain,
  m.organization_uncertain AS mentionOrganizationUncertain,
  m.religion_uncertain AS mentionReligionUncertain,
  m.dateStart_uncertain AS mentionDateStartUncertain,
  m.dateFinish AS mentionDateFinish,
  m.dateFinish_uncertain AS mentionDateFinishUncertain,
  m.mentiontypeID,
  m.mentionNodeID,
  mt.mentionDesc,
  mn.comment AS mentionNodeComment,

  -- From relatedletters
  rl.relatedLetterID

FROM
  person p
LEFT JOIN person2document pd ON p.personID = pd.personID
LEFT JOIN document d ON pd.docID = d.documentID
LEFT JOIN person2occupation po ON p.personID = po.personID
LEFT JOIN occupationtype ot ON po.occupationID = ot.occupationtypeID
LEFT JOIN person2organization po2 ON p.personID = po2.personID
LEFT JOIN organization org ON po2.organizationID = org.organizationID
LEFT JOIN person2religion pr ON p.personID = pr.personID
LEFT JOIN religion r ON pr.religionID = r.religionID
LEFT JOIN mentions m ON p.personID = m.personID
LEFT JOIN mentiontype mt ON m.mentiontypeID = mt.mentiontypeID
LEFT JOIN mention_nodes mn ON m.mentionNodeID = mn.mentionNodeID
LEFT JOIN relatedletters rl ON p.personID = rl.documentID
`;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool.query(query).then(([rows, fields]) => {
      res.json(rows);
    });
  } catch (error) {
    console.error("Failed to run query:", error);
    res.status(500).json({ error: "Failed to run query" });
    return;
  }
});

async function runQuery(query) {
  // Get the database connection
  const db = await dbPromise;
  const promisePool = db.promise();

  try {
    promisePool.query(query).then(([rows, fields]) => {
      return rows;
    });
  } catch (error) {
    console.error("Failed to run query:", error);
  } finally {
    if (db && db.end) {
      db.end();
    }
  }
}

//get all persons
router.get("/persons", async (req, res) => {
  console.log("GET request received");
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
    r.religionDesc as religion,
    l.languageDesc as language
  FROM
	  person p
  LEFT JOIN person2religion pr ON pr.personID = p.personID
  LEFT JOIN religion r ON r.religionID = pr.religionID
  LEFT JOIN language l on l.languageID = p.language_id`;
  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool.query(query).then(([rows, fields]) => {
      res.json(rows);
    });
  } catch (error) {
    console.error("Failed to run query:", error);
    res.status(500).json({ error: "Failed to run query" });
    return;
  }
});

//search for specific document
router.get("/documents/:id", async (req, res) => {
  console.log("GET request received");
  const query = `SELECT * FROM document WHERE documentID = ${req.params.id}`;
  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool.query(query).then(([rows, fields]) => {
      res.json(rows);
    });
  } catch (error) {
    console.error("Failed to run query:", error);
    res.status(500).json({ error: "Failed to run query" });
    return;
  }
});

//get person by name and wildcard search for uncomplete names
router.get("/persons/:name", async (req, res) => {
  console.log("GET request received");
  const query = `SELECT * FROM person WHERE firstName LIKE '${req.params.name}%' OR lastName LIKE '${req.params.name}%'`;
  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool.query(query).then(([rows, fields]) => {
      res.json(rows);
    });
  } catch (error) {
    console.error("Failed to run query:", error);
    res.status(500).json({ error: "Failed to run query" });
    return;
  }
});

//get all connections between persons and documents and join sender and receiver based on documentID
router.get("/connections/:id", async (req, res) => {
  console.log("GET request received");

  const personID = req.params.id;

  //get all senders from person2document
  //get all receivers from those senders
  //organize by documentID and join sender and receiver
  const query = `
  SELECT
    p.personID AS senderID,
    CONCAT(p.firstName, ' ', p.lastName) AS sender,
    p.firstName AS senderFirstName,
    p.middleName AS senderMiddleName,
    p.lastName AS senderLastName,
    p.suffix AS senderSuffix,
    p.biography AS senderBiography,
    r.personID AS receiverID,
    CONCAT(r.firstName, ' ', r.lastName) AS receiver,  
    r.firstName AS receiverFirstName,
    r.middleName AS receiverMiddleName,
    r.lastName AS receiverLastName,
    r.suffix AS receiverSuffix,
    r.biography AS receiverBiography,
    pd.docID AS document,
    d.importID,
    d.collection,
    d.abstract,
    DATE_FORMAT(d.sortingDate, '%Y-%m-%d') AS date,
    d.letterDate,
    d.isJulian,
    d.researchNotes,
    d.customCitation,
    d.docTypeID,
    d.languageID AS documentLanguageID,
    d.repositoryID,
    d.dateAdded,
    d.status,
    d.whoCheckedOut,
    d.volume,
    d.page,
    d.folder,
    d.transcription,
    d.translation,
    d.virtual_doc,
    pdf.pdfURL
  FROM
    person p
  LEFT JOIN person2document pd ON p.personID = pd.personID
  LEFT JOIN document d ON pd.docID = d.documentID
  LEFT JOIN person2document pd2 ON pd2.docID = pd.docID
  LEFT JOIN person r ON pd2.personID = r.personID
  LEFT JOIN pdf_documents pdf ON d.documentID = pdf.documentID
  WHERE
    p.personID != r.personID 
  AND (p.personID = ? OR r.personID = ?)
  ORDER BY
    pd.docID`;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool.query(query, [personID, personID]).then(([rows, fields]) => {
      res.json(rows);
    });
  } catch (error) {
    console.error("Failed to run query:", error);
    res.status(500).json({ error: "Failed to run query" });
    return;
  }
});

//get all documents sent and received by a person
router.get("/documents", async (req, res) => {
  console.log("GET request received");

  const query = `
  SELECT
        d.abstract,
        d.sortingDate,
        d.letterDate,
        d.researchNotes,
        d.customCitation,
        d.documentID,
        GROUP_CONCAT(DISTINCT pdf.pdfURL) AS pdfURL,
		GROUP_CONCAT(DISTINCT CONCAT(p.firstName, " ", p.lastName)) AS senders,
        GROUP_CONCAT(DISTINCT p.personID) as senderId,
        GROUP_CONCAT(DISTINCT p.firstName) as senderFirstName,
        GROUP_CONCAT(DISTINCT p.middleName) as senderMiddleName,
        GROUP_CONCAT(DISTINCT p.lastName) as senderLastName,
		GROUP_CONCAT(DISTINCT CONCAT(r.firstName, " ", r.lastName)) AS receivers,
        GROUP_CONCAT(DISTINCT r.personID) as receiverId,
        GROUP_CONCAT(DISTINCT r.firstName) as receiverFirstName,
        GROUP_CONCAT(DISTINCT r.middleName) as receiverMiddleName,
        GROUP_CONCAT(DISTINCT r.lastName) as receiverLastName,
        l.languageDesc
  FROM
    document d
  LEFT JOIN person2document pd ON pd.docID = d.documentID
  LEFT JOIN person p on p.personID = pd.personID
  LEFT JOIN person2document p2d ON p2d.docID = d.documentID
  LEFT JOIN person r on r.personID = p2d.personID
  LEFT JOIN pdf_documents pdf ON d.documentID = pdf.documentID
  LEFT JOIN language l ON d.languageID = l.languageID
  WHERE pd.roleID = 1 AND p2d.roleID = 2
  GROUP BY d.documentID
  ORDER BY d.documentID`;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool
      .query(query)
      .then(([rows, fields]) => {
        res.json(rows);
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

router.get("/dates", async (req, res) => {
  console.log("GET request received");

  //get all senders from person2document
  //get all receivers from those senders
  //organize by documentID and join sender and receiver
  const query = `
  SELECT
    d.sortingDate AS date
  FROM
    person p
  LEFT JOIN person2document pd ON p.personID = pd.personID
  LEFT JOIN document d ON pd.docID = d.documentID
  LEFT JOIN person2document pd2 ON pd2.docID = pd.docID
  LEFT JOIN person r ON pd2.personID = r.personID
  WHERE
    p.personID != r.personID
  ORDER BY
    d.sortingDate DESC`;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool.query(query).then(([rows, fields]) => {
      res.json(rows);
    });
  } catch (error) {
    console.error("Failed to run query:", error);
    res.status(500).json({ error: "Failed to run query" });
    return;
  }
});

//get all connections for religion
router.get("/connections/religion", async (req, res) => {
  console.log("GET request received");

  //get all people from person2religion

  const query = ``;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool.query(query).then(([rows, fields]) => {
      res.json(rows);
    });
  } catch (error) {
    console.error("Failed to run query:", error);
    res.status(500).json({ error: "Failed to run query" });
    return;
  }
});

//get all connections for organization
router.get("/connections/organization", async (req, res) => {
  console.log("GET request received");

  //get all people from person2organization and specify what organization they are in
  const query = `
  SELECT
  p.personID,
  p.firstName,
  p.middleName,
  p.lastName,
  p.suffix,
  org.organizationName AS organization
FROM
  person p
  INNER JOIN person2organization po ON p.personID = po.personID
  INNER JOIN organization org ON po.organizationID = org.organizationID
  `;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool.query(query).then(([rows, fields]) => {
      res.json(rows);
    });
  } catch (error) {
    console.error("Failed to run query:", error);
    res.status(500).json({ error: "Failed to run query" });
    return;
  }
});

// get all senders for sender filter in frontend
router.get("/senders", async (req, res) => {
  console.log("GET request received");

  //get all senders from person2document

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

  `;
  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool.query(query).then(([rows, fields]) => {
      //format sender names as {sender: {name: 'John Doe', image: 'null'}}
      const senders = rows.map((row) => {
        return {
          name: `${row.firstName} ${row.lastName}`,
          image: "null",
        };
      });

      res.json(senders);
    });
  } catch (error) {
    console.error("Failed to run query:", error);
    res.status(500).json({ error: "Failed to run query" });
    return;
  }
});

// get all receivers for receiver filter in frontend
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

router.get("/sender_receiver", async (req, res) => {
  console.log("GET request received");

  const query = `
  SELECT
    sender.personID AS senderID,
    CONCAT(sender.firstName, ' ', sender.lastName) AS senderName,
    sender.firstName AS senderFirstName,
    sender.middleName AS senderMiddleName,
    sender.lastName AS senderLastName,
    sender.suffix AS senderSuffix,
    sender.biography AS senderBiography,
    receiver.personID AS receiverID,
    CONCAT(receiver.firstName, ' ', receiver.lastName) AS receiverName,
    receiver.firstName AS receiverFirstName,
    receiver.middleName AS receiverMiddleName,
    receiver.lastName AS receiverLastName,
    receiver.suffix AS receiverSuffix,
    receiver.biography AS receiverBiography,
    pd.docID AS documentID,
    d.importID,
    d.collection,
    d.abstract,
    DATE_FORMAT(d.sortingDate, '%Y-%m-%d') AS date,
    d.letterDate,
    d.isJulian,
    d.researchNotes,
    d.customCitation,
    d.docTypeID,
    d.languageID AS documentLanguageID,
    d.repositoryID,
    d.dateAdded,
    d.status,
    d.whoCheckedOut,
    d.volume,
    d.page,
    d.folder,
    d.transcription,
    d.translation,
    d.virtual_doc,
    pdf.pdfURL
  FROM
    person sender
  LEFT JOIN person2document pd ON sender.personID = pd.personID
  LEFT JOIN document d ON pd.docID = d.documentID
  LEFT JOIN person2document pd2 ON pd2.docID = d.documentID
  LEFT JOIN person receiver ON pd2.personID = receiver.personID
  LEFT JOIN pdf_documents pdf ON d.documentID = pdf.documentID
  WHERE
    sender.personID != receiver.personID
  ORDER BY
    pd.docID    `;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool
      .query(query)
      .then(([rows, fields]) => {
        const relation = rows.map((row) => {
          return {
            sender: {
              id: row.senderID,
              name: row.senderName,
              firstName: row.senderFirstName,
              middleName: row.senderMiddleName,
              lastName: row.senderLastName,
              suffix: row.senderSuffix,
              biography: row.senderBiography,
              image: "null",
            },
            receiver: {
              id: row.receiverID,
              name: row.receiverName,
              firstName: row.receiverFirstName,
              middleName: row.receiverMiddleName,
              lastName: row.receiverLastName,
              suffix: row.receiverSuffix,
              biography: row.receiverBiography,
              image: "null",
            },
            document: {
              id: row.documentID,
              importID: row.importID,
              collection: row.collection,
              abstract: row.abstract,
              date: row.date,
              letterDate: row.letterDate,
              isJulian: row.isJulian,
              researchNotes: row.researchNotes,
              customCitation: row.customCitation,
              docTypeID: row.docTypeID,
              documentLanguageID: row.documentLanguageID,
              repositoryID: row.repositoryID,
              dateAdded: row.dateAdded,
              status: row.status,
              whoCheckedOut: row.whoCheckedOut,
              volume: row.volume,
              page: row.page,
              folder: row.folder,
              transcription: row.transcription,
              translation: row.translation,
              virtual_doc: row.virtual_doc,
              pdfURL: row.pdfURL,
            },
          };
        });
        res.json(relation);
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

// Helper function to capitalize the first letter of each word
function capitalizeName(name) {
  if (!name) return "";
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
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

  const query = `
    SELECT
      -- Select person details
      p.personID AS id,
      p.firstName,
      p.middleName,
      p.lastName,
      CONCAT(p.firstName, ' ', p.lastName) AS fullName,
      p.suffix,
      p.biography,
      p.gender,
      p.birthDate,
      p.deathDate,
      p.last_prefix,
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
      NULL AS dateAdded,
      NULL AS status,
      NULL AS whoCheckedOut,
      NULL AS volume,
      NULL AS page,
      NULL AS folder,
      NULL AS transcription,
      NULL AS translation,
      NULL AS virtual_doc,
      NULL AS organizationID,
      NULL AS religionID,
      NULL AS organizationName,
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
      p.suffix,
      p.biography,
      p.gender,
      p.birthDate,
      p.deathDate,
      p.last_prefix,
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
      d.dateAdded,
      d.status,
      d.whoCheckedOut,
      d.volume,
      d.page,
      d.folder,
      d.transcription,
      d.translation,
      d.virtual_doc,
      NULL AS organizationID,
      NULL AS religionID,
      NULL AS organizationName,
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
      p.suffix,
      p.biography,
      p.gender,
      p.birthDate,
      p.deathDate,
      p.last_prefix,
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
      NULL AS dateAdded,
      NULL AS status,
      NULL AS whoCheckedOut,
      NULL AS volume,
      NULL AS page,
      NULL AS folder,
      NULL AS transcription,
      NULL AS translation,
      NULL AS virtual_doc,
      p2o.organizationID AS organizationID,
      NULL AS religionID,
      NULL AS organizationName,
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
      p.suffix,
      p.biography,
      p.gender,
      p.birthDate,
      p.deathDate,
      p.last_prefix,
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
      NULL AS dateAdded,
      NULL AS status,
      NULL AS whoCheckedOut,
      NULL AS volume,
      NULL AS page,
      NULL AS folder,
      NULL AS transcription,
      NULL AS translation,
      NULL AS virtual_doc,
      NULL AS organizationID,
      p2r.religionID AS religionID,
      NULL AS organizationName,
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
      NULL AS suffix,
      NULL AS biography,
      NULL AS gender,
      NULL AS birthDate,
      NULL AS deathDate,
      NULL AS last_prefix,
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
      NULL AS dateAdded,
      NULL AS status,
      NULL AS whoCheckedOut,
      NULL AS volume,
      NULL AS page,
      NULL AS folder,
      NULL AS transcription,
      NULL AS translation,
      NULL AS virtual_doc,
      NULL AS organizationID,
      NULL AS religionID,
      o.organizationName,
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
      NULL AS suffix,
      NULL AS biography,
      NULL AS gender,
      NULL AS birthDate,
      NULL AS deathDate,
      NULL AS last_prefix,
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
      NULL AS dateAdded,
      NULL AS status,
      NULL AS whoCheckedOut,
      NULL AS volume,
      NULL AS page,
      NULL AS folder,
      NULL AS transcription,
      NULL AS translation,
      NULL AS virtual_doc,
      NULL AS organizationID,
      r.religionID AS religionID,
      NULL AS organizationName,
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
      NULL AS suffix,
      NULL AS biography,
      NULL AS gender,
      NULL AS birthDate,
      NULL AS deathDate,
      NULL AS last_prefix,
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
      NULL AS dateAdded,
      NULL AS status,
      NULL AS whoCheckedOut,
      NULL AS volume,
      NULL AS page,
      NULL AS folder,
      NULL AS transcription,
      NULL AS translation,
      NULL AS virtual_doc,
      NULL AS organizationID,
      NULL AS religionID,
      NULL AS organizationName,
      NULL AS formationDate,
      NULL AS dissolutionDate,
      NULL AS organizationLOD,
      NULL AS religionDesc,
      NULL AS senderFullName,
      NULL AS receiverFullName,
      NULL AS date
    FROM relationship rel;
  `;

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
              suffix: row.suffix,
              biography: row.biography,
              gender: row.gender,
              birthDate: row.birthDate,
              deathDate: row.deathDate,
              last_prefix: row.last_prefix,
              LODwikiData: row.LODwikiData,
              LODVIAF: row.LODVIAF,
              LODLOC: row.LODLOC,
              first_prefix_id: row.first_prefix_id,
              last_prefix_id: row.last_prefix_id,
              suffix_id: row.suffix_id,
              language_id: row.language_id,
              personStdName: row.personStdName,
              nodeType: row.nodeType,
              organizationName: row.organizationName,
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
              dateAdded: row.dateAdded,
              status: row.status,
              whoCheckedOut: row.whoCheckedOut,
              volume: row.volume,
              page: row.page,
              folder: row.folder,
              transcription: row.transcription,
              translation: row.translation,
              virtual_doc: row.virtual_doc,
              senderFullName: row.senderFullName,
              receiverFullName: row.receiverFullName,
              documentID: row.documentID,
              date: row.date,
            });
          } else if (row.organizationID) {
            edges.push({
              from: row.id,
              to: row.organizationID,
              type: "organization",
              organizationName: row.organizationName,
              formationDate: row.formationDate,
              dissolutionDate: row.dissolutionDate,
              organizationLOD: row.organizationLOD,
            });
          } else if (row.religionID) {
            edges.push({
              from: row.id,
              to: row.religionID,
              type: "religion",
              religionDesc: row.religionDesc,
              religionID: row.religionID,
            });
          } else if (row.relationshipID) {
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

        // Extract minDate and maxDate from the request body
        const { person, minDate, maxDate } = req.body;

        // Check if the request body is empty
        if (!person || person.length === 0) {
          // If the request body is empty, return all nodes and edges
          // console.log(edges);
          return res.json({ nodes, edges });
        }

        // Filter edges based on the names passed in the body
        const filteredEdges = edges.filter(
          (edge) =>
            person.includes(edge.senderFullName?.toLowerCase()) ||
            person.includes(edge.receiverFullName?.toLowerCase())
        );

        // Filter edges based on the date range
        const dateFilteredEdges = filteredEdges.filter((edge) => {
          const edgeDate = new Date(edge.date);
          const min = new Date(minDate);
          const max = new Date(maxDate);
          return edgeDate >= min && edgeDate <= max;
        });

        // Collect all names from the filtered edges
        const connectedNames = new Set();
        dateFilteredEdges.forEach((edge) => {
          if (edge.senderFullName) {
            edge.senderFullName
              .split(", ")
              .forEach((name) => connectedNames.add(name.toLowerCase()));
          }
          if (edge.receiverFullName) {
            edge.receiverFullName
              .split(", ")
              .forEach((name) => connectedNames.add(name.toLowerCase()));
          }
        });

        // Filter nodes based on the collected names
        const filteredNodes = nodes.filter((node) =>
          connectedNames.has(node.fullName.toLowerCase())
        );

        // console.log(filteredEdges);
        res.json({ nodes: filteredNodes, edges: dateFilteredEdges });
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

    const edges = [];
    const nodes = [];

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
      const document = documentsArr.find(
        (doc) => doc.documentID === documentID
      );

      if (connection.roleID === 1) {
        const sender = peopleArr.find(
          (person) => person.personID === connection.personID
        );
        nodes.push(sender);
      } else if (connection.roleID === 2) {
        const receiver = peopleArr.find(
          (person) => person.personID === connection.personID
        );
        nodes.push(receiver);
      }
      //check to see if the document exists in the edges array
      //if it does not exist, add it to the edges array
      //else add the sender/reciever to the edges array
      //edge object consists of the sender and receiver and the documentID
      const edge = edges.find(
        (edge) => edge.document.documentID === documentID
      );

      if (!edge) {
        edges.push({
          document: document,
          sender: connection.roleID === 1 ? connection.personID : null,
          receiver: connection.roleID === 2 ? connection.personID : null,
        });
      } else {
        if (connection.roleID === 1) {
          edge.sender = connection.personID;
        } else if (connection.roleID === 2) {
          edge.receiver = connection.personID;
        }
      }
    });

    //filter out edges that do not have a sender or receiver

    const filteredEdges = edges.filter((edge) => edge.sender && edge.receiver);

    res.json({ filteredEdges, nodes });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/religion", async (req, res) => {
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

    const edges = [];
    const nodes = [];

    connectionsArr.forEach((connection) => {
      const religionID = connection.religionID;
      const religion = religionsArr.find(
        (religion) => religion.religionID === religionID
      );

      const person = peopleArr.find(
        (person) => person.personID === connection.personID
      );
      nodes.push(person);

      const edge = edges.find((edgeI) => {
        edgeI.religion.religionID === religionID;
      });

      edges.push({
        religion: religion,
        person: connection.personID,
      });
    });

    //if the person does not have a religion, remove the person from the nodes array
    const filteredNodes = nodes.filter((node) => {
      if (
        connectionsArr.find(
          (connection) => connection.personID === node.personID
        )
      ) {
        return node;
      }
    });

    //add the religion to the nodes array
    religionsArr.forEach((religion) => {
      filteredNodes.push(religion);
    });

    res.json({ edges, filteredNodes });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/organization", async (req, res) => {
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

    const edges = [];
    const nodes = [];

    connectionsArr.forEach((connection) => {
      const organizationID = connection.organizationID;
      const organization = organizationsArr.find(
        (organization) => organization.organizationID === organizationID
      );

      const person = peopleArr.find(
        (person) => person.personID === connection.personID
      );
      nodes.push(person);

      const edge = edges.find((edgeI) => {
        edgeI.organization.organizationID === organizationID;
      });

      edges.push({
        organization: organization,
        person: connection.personID,
      });
    });

    //if the person does not exist in the connections array, remove the person from the nodes array
    const filteredNodes = nodes.filter((node) => {
      if (
        connectionsArr.find(
          (connection) => connection.personID === node.personID
        )
      ) {
        return node;
      }
    });

    //add the organization to the nodes array
    organizationsArr.forEach((organization) => {
      filteredNodes.push(organization);
    });

    res.json({ edges, filteredNodes });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/graph", async (req, res) => {
  const peopleQuery = `
    SELECT *
    FROM person;
  `;

  const documentsQuery = `
      SELECT a.*, b.*, DATE_FORMAT(a.sortingDate, '%Y-%m-%d') AS date FROM document a, 
  pdf_documents b where a.documentID = b.documentID;
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

  const mentionsQuery = `
    SELECT 
    mn.mentionNodeID,
    mn.comment AS mentionNodeComment,
    mn.dbNotes,
    mn.mentionImportID,
    mn.documentID AS mentionNodeDocumentID,
    mn.mentiontypeID AS mentionNodeMentiontypeID,
    m.mentionID,
    m.documentID AS mentionDocumentID,
    m.personID,
    m.placeID,
    m.keywordID,
    m.organizationID,
    m.religionID,
    m.dateStart,
    m.comment AS mentionComment,
    m.person_uncertain,
    m.place_uncertain,
    m.keyword_uncertain,
    m.organization_uncertain,
    m.religion_uncertain,
    m.dateStart_uncertain,
    m.dateFinish,
    m.dateFinish_uncertain,
    m.mentiontypeID AS mentionMentiontypeID,
    m.mentionNodeID AS mentionMentionNodeID
FROM 
    mention_nodes mn
JOIN 
    mentions m 
ON 
    mn.mentionNodeID = m.mentionNodeID;
  `;

  const relationshipsQuery = `
SELECT 
    r.relationshipID,
    r.person1ID,
    r.person2ID,
    COALESCE(rt1.relationshipDesc, 'Unknown') AS relationship1to2Desc,
    COALESCE(rt2.relationshipDesc, 'Unknown') AS relationship2to1Desc,
    r.dateStart,
    r.dateEnd,
    r.uncertain,
    r.dateEndCause,
    r.relationship1to2ID,
    r.relationship2to1ID
FROM 
    relationship r
LEFT JOIN
   relationshiptype rt1 ON r.relationship1to2ID = rt1.relationshiptypeID
 left JOIN
    relationshiptype rt2 ON r.relationship2to1ID = rt2.relationshiptypeID
   where person1ID != person2ID
         order by relationshipID
         limit 270
         ;
   
  
  `;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    const [peopleResults] = await promisePool.query(peopleQuery);
    const [documentResults] = await promisePool.query(documentsQuery);
    const [documentConnectionResults] = await promisePool.query(
      documentConnectionsQuery
    );
    const [religionResults] = await promisePool.query(religionsQuery);
    const [religionConnectionResults] = await promisePool.query(
      religionConnectionsQuery
    );
    const [organizationResults] = await promisePool.query(organizationsQuery);
    const [organizationConnectionResults] = await promisePool.query(
      organizationConnectionsQuery
    );
    const [mentionResults] = await promisePool.query(mentionsQuery);
    const [relationshipResults] = await promisePool.query(relationshipsQuery);

    const peopleArr = peopleResults;
    const documentsArr = documentResults;
    const documentConnectionsArr = documentConnectionResults;
    const religionsArr = religionResults;
    const religionConnectionsArr = religionConnectionResults;
    const organizationsArr = organizationResults;
    const organizationConnectionsArr = organizationConnectionResults;
    const mentionsArr = mentionResults;
    const relationshipsArr = relationshipResults;

    const edges = [];
    const nodes = [];

    // Helper function to generate a unique ID based on node type and ID
    const generateUniqueId = (type, id) => `${type}_${id}`;

    // Create a map for person nodes to easily update their documents array
    const personNodeMap = new Map();

    // Create nodes for people
    peopleArr.forEach((person) => {
      const uniqueId = generateUniqueId("person", person.personID);
      const personNode = {
        person: {
          ...person,
          fullName: `${person.firstName} ${person.lastName}`,
        },
        nodeType: "person",
        id: uniqueId,
        documents: [],
        relations: [],
        mentions: [],
      };
      nodes.push(personNode);
      personNodeMap.set(uniqueId, personNode);
    });

    // Create nodes for documents
    documentsArr.forEach((document) => {
      const uniqueId = generateUniqueId("document", document.documentID);
      nodes.push({ document, nodeType: "document", id: uniqueId });
    });

    // Ensure each religion node is unique by checking religionID before adding
    religionsArr.forEach((religion) => {
      const uniqueId = generateUniqueId("religion", religion.religionID);
      const existingNode = nodes.find(
        (node) => node.id === uniqueId && node.nodeType === "religion"
      );
      if (!existingNode) {
        nodes.push({ religion, nodeType: "religion", id: uniqueId });
      }
    });

    // Create nodes for organizations
    organizationsArr.forEach((organization) => {
      const uniqueId = generateUniqueId(
        "organization",
        organization.organizationID
      );
      nodes.push({ organization, nodeType: "organization", id: uniqueId });
    });

    documentConnectionsArr.forEach((connection) => {
      const documentId = generateUniqueId("document", connection.docID);
      const document = documentsArr.find(
        (doc) => generateUniqueId("document", doc.documentID) === documentId
      );

      if (connection.roleID === 1) {
        // Sender
        const senderId = generateUniqueId("person", connection.personID);

        // Find the existing edge for the document where 'from' is null (i.e., sender not assigned)
        const edge = edges.find(
          (edge) => edge.document.documentID === connection.docID && !edge.from
        );

        if (edge) {
          edge.from = senderId; // Update the 'from' field for sender
        } else {
          edges.push({
            document,
            from: senderId,
            to: null, // Initially null as we may not know receiver yet
            type: "document",
          });
        }

        // Update the sender's documents array
        const senderNode = personNodeMap.get(senderId);
        if (
          senderNode &&
          !senderNode.documents.some(
            (doc) => doc.document.documentID === document.documentID
          )
        ) {
          //get the receiver of the document
          const receiverID = documentConnectionsArr.find(
            (connection) =>
              connection.docID === document.documentID &&
              connection.roleID === 2
          );
          const receiver = peopleArr.find(
            (person) => person.personID === receiverID?.personID
          );

          receiverFullName = `${receiver?.firstName} ${receiver?.lastName}`;
          senderNode.documents.push({
            document: {
              ...document,
              sender: senderNode.person.fullName,
              receiver: receiverFullName,
            },
          });
        }
      } else if (connection.roleID === 2) {
        // Receiver
        const receiverId = generateUniqueId("person", connection.personID);

        // Find the edge that has the documentID and either has no 'to' or no 'from' (because sender might not be known yet)
        const edge = edges.find(
          (edge) =>
            edge.document.documentID === connection.docID &&
            (!edge.to || !edge.from)
        );

        if (edge) {
          edge.to = receiverId; // Update the 'to' field for receiver
        } else {
          edges.push({
            document,
            from: null, // Initially null as we may not know sender yet
            to: receiverId,
            type: "document",
          });
        }

        // Update the receiver's documents array
        const receiverNode = personNodeMap.get(receiverId);
        if (
          receiverNode &&
          !receiverNode.documents.some(
            (doc) => doc.document.documentID === document.documentID
          )
        ) {
          //get the sender of the document
          const senderID = documentConnectionsArr.find(
            (connection) =>
              connection.docID === document.documentID &&
              connection.roleID === 1
          );
          const sender = peopleArr.find(
            (person) => person.personID === senderID?.personID
          );
          const senderFullName = `${sender?.firstName} ${sender?.lastName}`;
          receiverNode.documents.push({
            document: {
              ...document,
              sender: senderFullName,
              receiver: receiverNode.person.fullName,
            },
          });
        }
      } else if (connection.roleID === 3) {
        // Mentioned
        const mentionedId = generateUniqueId("person", connection.personID);
        edges.push({
          document,
          // From author node to mentioned person node
          from: documentId,
          to: mentionedId,
          type: "mentioned",
        });

        // Update the mentioned person's documents array
        const mentionedNode = personNodeMap.get(mentionedId);
        if (
          mentionedNode &&
          !mentionedNode.documents.some(
            (doc) => doc.document.documentID === document.documentID
          )
        ) {
          mentionedNode.documents.push({ document, role: "Mentioned" });
        }
      } else if (connection.roleID === 4) {
        // Author
        const authorId = generateUniqueId("person", connection.personID);
        edges.push({
          document,
          // From author node to whoever receives the document
          from: authorId,
          to: documentId,
          type: "author",
        });

        // Update the author's documents array
        const authorNode = personNodeMap.get(authorId);
        if (
          authorNode &&
          !authorNode.documents.some(
            (doc) => doc.document.documentID === document.documentID
          )
        ) {
          authorNode.documents.push({ document, role: "Author" });
        }
      } else if (connection.roleID === 5) {
        // Waypoint
        const waypointId = generateUniqueId("person", connection.personID); // Generate the waypoint person node ID

        // Find the edge that has the documentID and either no 'from' or 'to' (i.e., sender or receiver might not be known yet)
        const edge = edges.find(
          (edge) =>
            edge.document.documentID === connection.docID &&
            (!edge.from || !edge.to)
        );

        // If the edge exists, update the 'to' field with the waypoint person ID
        if (edge) {
          edge.to = waypointId;
        } else {
          // If the edge does not exist, create a new edge with the waypoint person ID
          edges.push({
            document,
            from: null, // Initially null as sender might not be known yet
            to: waypointId,
            type: "document",
          });
        }

        // Update the waypoint person's node to include the document in their documents array
        const waypointNode = personNodeMap.get(waypointId);
        if (
          waypointNode &&
          !waypointNode.documents.some(
            (doc) => doc.document.documentID === document.documentID
          )
        ) {
          waypointNode.documents.push({
            document,
            sender: null,
            waypoint: waypointNode.person,
          });
        }
      }
    });

    relationshipsArr.forEach((relationship) => {
      // Check if both person1ID and person2ID are not null
      if (relationship.person1ID && relationship.person2ID) {
        const relationshipId = generateUniqueId(
          "relationship",
          relationship.relationshipID
        );
        const person1Id = generateUniqueId("person", relationship.person1ID);
        const person2Id = generateUniqueId("person", relationship.person2ID);

        const edge = edges.find(
          (edge) => edge.from === person1Id && edge.to === person2Id
        );

        edges.push({
          from: person1Id,
          to: person2Id,
          type: "relationship",
          relationship1to2Desc: relationship.relationship1to2Desc || "Unknown",
          relationship2to1Desc: relationship.relationship2to1Desc || "Unknown",
          dateStart: relationship.dateStart || "N/A",
          dateEnd: relationship.dateEnd || "N/A",
        });
      }
    });

    // Process mentions
    mentionsArr.forEach((mention) => {
      const mentionPersonId = generateUniqueId("person", mention.personID);
      const mentionReligionId = generateUniqueId(
        "religion",
        mention.religionID
      );
      const mentionOrganizationId = generateUniqueId(
        "organization",
        mention.organizationID
      );
      const mentionDocumentId = generateUniqueId(
        "document",
        mention.documentID
      ); // Mentioned document

      const personNode = nodes.find((node) => node.id === mentionPersonId);
      const religionNode = nodes.find((node) => node.id === mentionReligionId);
      const organizationNode = nodes.find(
        (node) => node.id === mentionOrganizationId
      );

      // Add mention to person node if it exists
      if (personNode) {
        personNode.mentions.push({
          ...mention,
        });
      }

      // Add mention to religion node if it exists
      if (religionNode) {
        religionNode.mentions.push({
          ...mention,
        });
      }

      // Add mention to organization node if it exists
      if (organizationNode) {
        organizationNode.mentions.push({
          ...mention,
        });
      }
    });

    // Create edges for people to religions (with from/to fields and type)
    religionConnectionsArr.forEach((connection) => {
      const religionId = generateUniqueId("religion", connection.religionID);
      const personId = generateUniqueId("person", connection.personID);
      edges.push({
        from: personId, // From person node
        to: religionId, // To religion node
        type: "religion",
      });
    });

    // Create edges for people to organizations (with from/to fields and type)
    organizationConnectionsArr.forEach((connection) => {
      const organizationId = generateUniqueId(
        "organization",
        connection.organizationID
      );
      const personId = generateUniqueId("person", connection.personID);
      edges.push({
        from: personId, // From person node
        to: organizationId, // To organization node
        type: "organization",
      });
    });

    // Filter out edges where 'from' or 'to' is null
    const filteredEdges = edges.filter(
      (edge) => edge.from !== null && edge.to !== null
    );

    res.json({
      edges: filteredEdges,
      nodes,
      elength: filteredEdges.length,
      nlength: nodes.length,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
});

//get everything associated with a person just how the graph is storing an individual person
//get by the personID
router.get("/person/:personID", async (req, res) => {
  const personID = req.params.personID;
  const personQuery = `
    SELECT *
    FROM person
    WHERE personID = ${personID};
  `;

  const documentQuery = `
SELECT d.*, 
GROUP_CONCAT(pdf.internalPDFname) AS internalPDFname,
GROUP_CONCAT(pdf.pdfDesc) AS pdfDesc,
GROUP_CONCAT(pdf.pdfURL) AS pdfURL,
GROUP_CONCAT(pdf.pdfID) AS pdfID,
GROUP_CONCAT(DISTINCT CONCAT(sender.firstName, " ", sender.lastName)) AS sender,
GROUP_CONCAT(DISTINCT CONCAT(receiver.firstName, " ", receiver.lastName)) AS receiver,
DATE_FORMAT(d.sortingDate, '%Y-%m-%d') AS date 
FROM document d
LEFT JOIN pdf_documents pdf ON pdf.documentID = d.documentID
LEFT JOIN person2document p2d ON p2d.docID = d.documentID AND (p2d.roleID = 1 OR p2d.roleID = 4)
LEFT JOIN person sender ON p2d.personID = sender.personID
LEFT JOIN person2document p2d2 ON p2d2.docID = d.documentID AND p2d2.roleID = 2
LEFT JOIN person receiver ON p2d2.personID = receiver.personID
WHERE sender.personID = ${personID} OR receiver.personID = ${personID}
GROUP BY d.documentID;
  `;

  const religionQuery = `
    SELECT *
    FROM religion
    WHERE religionID = (SELECT religionID FROM person2religion WHERE personID = ${personID});
  `;

  const organizationQuery = `
    SELECT *
    FROM organization
    WHERE organizationID = (SELECT organizationID FROM person2organization WHERE personID = ${personID});
  `;

  const mentionQuery = `
    SELECT 
    mn.mentionNodeID,
    mn.comment AS mentionNodeComment,
    mn.dbNotes,
    mn.mentionImportID,
    mn.documentID AS mentionNodeDocumentID,
    mn.mentiontypeID AS mentionNodeMentiontypeID,
    m.mentionID,
    m.documentID AS mentionDocumentID,
    m.personID,
    m.placeID,
    m.keywordID,
    m.organizationID,
    m.religionID,
    m.dateStart,
    m.comment AS mentionComment,
    m.person_uncertain,
    m.place_uncertain,
    m.keyword_uncertain,
    m.organization_uncertain,
    m.religion_uncertain,
    m.dateStart_uncertain,
    m.dateFinish,
    m.dateFinish_uncertain,
    m.mentiontypeID AS mentionMentiontypeID,
    m.mentionNodeID AS mentionMentionNodeID
FROM
    mention_nodes mn
JOIN
    mentions m
ON
    mn.mentionNodeID = m.mentionNodeID
WHERE
    m.personID = ${personID};
  `;

  const relationshipQuery = `
    SELECT 
    r.relationshipID,
    r.person1ID,
    r.person2ID,
    rt1.relationshipDesc AS relationship1to2Desc,
    rt2.relationshipDesc AS relationship2to1Desc,
    r.dateStart,
    r.dateEnd,
    r.uncertain,
    r.dateEndCause,
    r.relationship1to2ID,
    r.relationship2to1ID
FROM
    relationship r
JOIN
    relationshiptype rt1 ON r.relationship1to2ID = rt1.relationshiptypeID
JOIN
    relationshiptype rt2 ON r.relationship2to1ID = rt2.relationshiptypeID
WHERE
    r.person1ID = ${personID} OR r.person2ID = ${personID};
  `;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    const [personResults] = await promisePool.query(personQuery);
    const [documentResults] = await promisePool.query(documentQuery);
    const [religionResults] = await promisePool.query(religionQuery);
    const [organizationResults] = await promisePool.query(organizationQuery);
    const [mentionResults] = await promisePool.query(mentionQuery);
    const [relationshipResults] = await promisePool.query(relationshipQuery);

    const person = personResults[0];
    const documents = documentResults;
    const religion = religionResults[0];
    const organization = organizationResults[0];
    const mentions = mentionResults;
    const relationships = relationshipResults;

    const personNode = {
      person,
      documents,
      religion,
      organization,
      mentions,
      relationships,
    };

    res.json(personNode);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
});

const sshConfig = {
  host: process.env.DB_HOST,
  username: process.env.DB_SSH_USER,
  password: process.env.DB_SSH_PASSWORD,
  port: 22,
};

router.get("/pdf/:pdfName", (req, res) => {
  const pdfName = req.params.pdfName;
  const localPdfPath = path.join(__dirname, `../public/pdf/${pdfName}`);
  const remotePdfPath = `/home/print/print_na/pdf_documents/${pdfName}`;

  // Check if the PDF exists locally
  if (fs.existsSync(localPdfPath)) {
    return res.sendFile(localPdfPath);
  }

  // Download the PDF from the remote server
  scpClient.scp(
    {
      host: sshConfig.host,
      username: sshConfig.username,
      password: sshConfig.password, // Use privateKey for SSH key-based auth
      path: remotePdfPath,
    },
    localPdfPath,
    function (err) {
      if (err) {
        return res
          .status(500)
          .send("Error downloading the file from the remote server.");
      }

      // Send the file to the client after it has been downloaded
      res.sendFile(localPdfPath);
    }
  );
});

router.get("/personFullName/:id", async (req, res) => {
  const personId = req.params.id;

  const personQuery = `
    SELECT CONCAT(firstName, ' ', lastName) AS fullName
    FROM person
    WHERE personID = ${personId};
  `;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    const [personResults] = await promisePool.query(personQuery);

    if (personResults.length > 0) {
      res.json(personResults[0]);
    } else {
      res.status(404).send("Person not found");
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/query", async (req, res) => {
  const getBool = (bool) => {
    switch (bool) {
      case "Equals":
        return "=";
      case "Not Equals":
        return "!=";
      case "Greater Than":
        return ">";
      case "Less Than":
        return "<";
      case "Greater Than or Equal To":
        return ">=";
      case "Less Than or Equal To":
        return "<=";
      default:
        return bool.toUpperCase();
    }
  };

  const getField = (field) => {
    switch (field) {
      case "First Name":
        return "firstName";
      case "Middle Name":
        return "middleName";
      case "Last Name":
        return "lastName";
      case "Person":
        return "personStdName";
      case "Place":
        return "placeStdName";
      case "Keyword":
        return "keyword";
      case "Organization":
        return "organizationDesc";
      case "Occupation":
        return "occupationDesc";
      case "Religion":
        return "religionDesc";
      case "Relationship":
        return "relationshipDesc";
      case "Repository":
        return "repositoryName";
      default:
        return field;
    }
  };

  console.log("POST request received");
  const query = req.body.query;
  let sql = "";
  const personQuery = `SELECT * FROM (SELECT
	  p.personID,
    CONCAT(COALESCE(CONCAT(p.firstName, " "), ""), COALESCE(CONCAT(p.middleName, " "), "" ), COALESCE(p.lastName, "")) AS fullName,
    p.firstName,
    p.middleName,
    p.lastName,
    p.maidenName,
    p.biography,
    p.gender,
    p.birthDate,
    p.deathDate,
    p.personStdName,
    r.religionDesc,
    l.languageDesc,
    ot.occupationDesc,
    o.organizationDesc
  FROM
	  person p
  LEFT JOIN person2religion pr ON pr.personID = p.personID
  LEFT JOIN religion r ON r.religionID = pr.religionID
  LEFT JOIN language l ON l.languageID = p.language_id
  LEFT JOIN person2occupation p2o ON p.personID = p2o.personID
  LEFT JOIN occupationtype ot ON p2o.occupationID = ot.occupationtypeID
  LEFT JOIN person2organization porg ON porg.personID = p.personID
  LEFT JOIN organization o on o.organizationID = porg.organizationID
  ORDER BY p.personID) AS sum`;
  const documentQuery = `SELECT * FROM (	
    SELECT
		d.documentID,
		d.abstract,
        d.sortingDate,
        d.letterDate,
        d.isJulian,
        d.researchNotes,
		GROUP_CONCAT(DISTINCT dt.typeDesc) AS docType,
        GROUP_CONCAT(DISTINCT l.languageDesc) AS language,
        GROUP_CONCAT(DISTINCT rep.repoDesc) as repository,
        GROUP_CONCAT(DISTINCT CONCAT(COALESCE(CONCAT(author.firstName, " "), ""), COALESCE(CONCAT(author.middleName, " "), ""), COALESCE(author.lastName, ""))) AS authors,
        GROUP_CONCAT(DISTINCT CONCAT(COALESCE(CONCAT(receiver.firstName, " "), ""), COALESCE(CONCAT(receiver.middleName, " "), ""), COALESCE(receiver.lastName, ""))) AS receivers
	FROM
		document d
	LEFT JOIN documenttype dt ON d.docTypeID = dt.docTypeID
    LEFT JOIN language l ON d.languageID = l.languageID
    LEFT JOIN repository rep ON rep.repoID = d.repositoryID
    LEFT JOIN person2document p2da ON p2da.docID = d.documentID AND (p2da.roleID = 4 OR p2da.roleID = 1)
    LEFT JOIN person author ON p2da.personID = author.personID
	LEFT JOIN person2document p2dr ON p2dr.docID = d.documentID AND p2dr.roleID = 2
    LEFT JOIN person receiver ON p2dr.personID = receiver.personID
    GROUP BY d.documentID
) AS doc`;
  switch (req.body.table) {
    case "Person":
      sql += personQuery;
      break;
    case "Document":
      sql += documentQuery;
      break;
    case "Place":
      sql += "SELECT * FROM place";
      break;
    default:
      return;
  }
  if (
    query.length != 0 &&
    query[0].field !== undefined &&
    query[0].bool !== undefined &&
    query[0].value !== undefined
  ) {
    sql += " WHERE ";
    const bool = getBool(query[0].bool);
    const field = getField(query[0].field);
    sql += `${field} ${bool} \"${query[0].value}\"`;

    for (var i = 1; i < query.length; i++) {
      if (query[i].and) sql += " AND ";
      else sql += " OR ";
      const bool = getBool(query[i].bool);
      const field = getField(query[i].field);
      sql += `${field} ${bool} \"${query[i].value}\"`;
    }
  }

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool.query(sql).then(([rows, fields]) => {
      res.json(rows);
    });
  } catch (error) {
    console.error("Error running query:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/query-tool-fields", async (req, res) => {
  const queries = {
    person: "DESCRIBE person",
    document: "DESCRIBE document",
    place: "DESCRIBE place",
    organization: "DESCRIBE organization",
    religion: "DESCRIBE religion",
  };

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    const results = await Promise.all(
      Object.entries(queries).map(async ([view, query]) => {
        const [rows] = await promisePool.query(query);
        return rows.map((row) => ({ field: row.Field, view }));
      })
    );

    const allFields = results.flat();

    res.json(allFields);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/knex-query", async (req, res) => {
  const { tables, fields, operators, values, dependentFields } = req.body;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();
    const results = [];

    let knexQuery;

    if (tables.length > 1) {
      // Define the first CTE for `secondary_ids`
      const secondaryIdsQuery = knex(tables[0])
        .select(fields[0]) // "docID" in person2document
        .where(fields[1], operators[0], values[0]); // e.g., personID = 446

      // Use `.with()` to create the CTE
      knexQuery = knex
        .with("secondary_ids", secondaryIdsQuery)
        .select("*")
        .from(tables[1]) // `document` table
        .whereIn(
          dependentFields[0],
          knex.select(fields[0]).from("secondary_ids")
        );
    } else {
      // Single table scenario without CTEs
      knexQuery = knex(tables[0]).select("*");

      // Apply filters for single table scenario
      for (let i = 0; i < fields.length; i++) {
        if (i === 0) {
          knexQuery = knexQuery.where(fields[i], operators[i], values[i]);
        } else {
          knexQuery = knexQuery.andWhere(fields[i], operators[i], values[i]);
        }
      }
    }

    // Execute the query
    const [rows] = await promisePool.query(knexQuery.toString());
    results.push(rows);

    console.log("POST Request Received with CTEs");
    res.json(results);
  } catch (error) {
    console.error("Error running query:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/relations", async (req, res) => {
  console.log("GET request received");
  const query = `
  SELECT 
    r.relationshipID,
    r.person1ID,
    r.person2ID,
    rt1.relationshipDesc AS relationship1to2Desc,
    rt2.relationshipDesc AS relationship2to1Desc,
    r.dateStart,
    r.dateEnd,
    r.uncertain,
    r.dateEndCause,
    r.relationship1to2ID,
    r.relationship2to1ID
    from relationship r
    left join relationshiptype rt1 on r.relationship1to2ID = rt1.relationshiptypeID
    left join relationshiptype rt2 on r.relationship2to1ID = rt2.relationshiptypeID;
  `;
  const nodeQuery = `
  SELECT
    personID,
    CONCAT(firstName, ' ', lastName) AS fullName
  FROM person;
  `;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();
    const [results] = await promisePool.query(query);
    const [nodes] = await promisePool.query(nodeQuery);
    const edges = results.map((result) => {
      return {
        relationshipID: result.relationshipID,
        person1ID: result.person1ID,
        person2ID: result.person2ID,
        relationship1to2Desc: result.relationship1to2Desc,
        relationship2to1Desc: result.relationship2to1Desc,
        dateStart: result.dateStart,
        dateEnd: result.dateEnd,
        uncertain: result.uncertain,
        dateEndCause: result.dateEndCause,
        relationship1to2ID: result.relationship1to2ID,
        relationship2to1ID: result.relationship2to1ID,
        from: result.person1ID,
        to: result.person2ID,
      };
    });

    res.json(edges);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/graph2", async (req, res) => {
  const peopleQuery = `
    SELECT *
    FROM person;
  `;

  const documentsQuery = `
      SELECT a.*, b.*, DATE_FORMAT(a.sortingDate, '%Y-%m-%d') AS date FROM document a, 
  pdf_documents b where a.documentID = b.documentID;
    `;

  const documentConnectionsQuery = `
    SELECT *
    FROM person2document;
  `;

  const relationshipsQuery = `
SELECT
    r.relationshipID,
    r.person1ID,
    r.person2ID,
    COALESCE(rt1.relationshipDesc, 'Unknown') AS relationship1to2Desc,
    COALESCE(rt2.relationshipDesc, 'Unknown') AS relationship2to1Desc,
    r.dateStart,
    r.dateEnd,
    r.uncertain,
    r.dateEndCause,
    r.relationship1to2ID,
    r.relationship2to1ID
FROM
    relationship r
 left JOIN
    relationshiptype rt1 ON r.relationship1to2ID = rt1.relationshiptypeID
 left JOIN
    relationshiptype rt2 ON r.relationship2to1ID = rt2.relationshiptypeID
WHERE person1ID != person2ID
ORDER BY relationshipID;
  `;

  const religionQuery = `
    SELECT *
    FROM religion;
  `;

  const organizationQuery = `
    SELECT *
    FROM organization;
  `;

  const religionConnectionsQuery = `
    SELECT *
    FROM person2religion;
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
    const [documentConnectionResults] = await promisePool.query(
      documentConnectionsQuery
    );
    const [relationshipResults] = await promisePool.query(relationshipsQuery);
    const [religionResults] = await promisePool.query(religionQuery);
    const [organizationResults] = await promisePool.query(organizationQuery);
    const [religionConnectionResults] = await promisePool.query(
      religionConnectionsQuery
    );
    const [organizationConnectionResults] = await promisePool.query(
      organizationConnectionsQuery
    );

    const peopleArr = peopleResults;
    const documentsArr = documentResults;
    const documentConnectionsArr = documentConnectionResults;
    const relationshipsArr = relationshipResults;
    const religionsArr = religionResults;
    const organizationsArr = organizationResults;
    const religionConnectionsArr = religionConnectionResults;
    const organizationConnectionsArr = organizationConnectionResults;

    const edges = [];
    const nodes = [];

    // Helper function to generate a unique ID based on node type and ID
    const generateUniqueId = (type, id) => `${type}_${id}`;

    // Create a map for person nodes to easily update their documents array
    const personNodeMap = new Map();

    // Create nodes for people
    peopleArr.forEach((person) => {
      const uniqueId = generateUniqueId("person", person.personID);
      const personNode = {
        person: {
          ...person,
          fullName: `${person.firstName} ${person.lastName}`.replace(
            /\b\w/g,
            (l) => l.toUpperCase()
          ),
        },
        nodeType: "person",
        id: uniqueId,
        documents: [],
        relations: [],
        mentions: [],
      };
      nodes.push(personNode);
      personNodeMap.set(uniqueId, personNode);
    });

    // Create nodes for documents
    documentsArr.forEach((document) => {
      const uniqueId = generateUniqueId("document", document.documentID);
      nodes.push({ document, nodeType: "document", id: uniqueId });
    });
    // Create nodes for documents
    documentsArr.forEach((document) => {
      const uniqueId = generateUniqueId("document", document.documentID);
      //create document name for each document
      //document name: Sender fullname - Receiver fullname - Date
      const senderID = documentConnectionsArr.find(
        (connection) =>
          connection.docID === document.documentID && connection.roleID === 1
      );
      const sender = peopleArr.find(
        (person) => person.personID === senderID?.personID
      );
      const senderFullNamelower = `${sender?.firstName} ${sender?.lastName}`;
      const receiverID = documentConnectionsArr.find(
        (connection) =>
          connection.docID === document.documentID && connection.roleID === 2
      );
      const receiver = peopleArr.find(
        (person) => person.personID === receiverID?.personID
      );
      const receiverFullNamelower = `${receiver?.firstName} ${receiver?.lastName}`;
      const senderFullName = senderFullNamelower.replace(/\b\w/g, (l) =>
        l.toUpperCase()
      );
      const receiverFullName = receiverFullNamelower.replace(/\b\w/g, (l) =>
        l.toUpperCase()
      );
      const documentName = `${senderFullName} - ${receiverFullName} - ${document.date}`;
      nodes.push({
        document,
        nodeType: "document",
        id: uniqueId,
        documentName,
      });
    });

    // Ensure each religion node is unique by checking religionID before adding
    religionsArr.forEach((religion) => {
      const uniqueId = generateUniqueId("religion", religion.religionID);
      const existingNode = nodes.find(
        (node) => node.id === uniqueId && node.nodeType === "religion"
      );
      if (!existingNode) {
        nodes.push({ religion, nodeType: "religion", id: uniqueId });
      }
    });

    // Create nodes for organizations
    organizationsArr.forEach((organization) => {
      const uniqueId = generateUniqueId(
        "organization",
        organization.organizationID
      );
      nodes.push({ organization, nodeType: "organization", id: uniqueId });
    });

    documentConnectionsArr.forEach((connection) => {
      const documentId = generateUniqueId("document", connection.docID);
      const document = documentsArr.find(
        (doc) => generateUniqueId("document", doc.documentID) === documentId
      );

      if (connection.roleID == 1) {
        // Sender
        const senderId = generateUniqueId("person", connection.personID);
        edges.push({
          document,
          from: senderId,
          to: documentId,
          type: "document",
        });
        // Update the sender's documents array
        const senderNode = personNodeMap.get(senderId);
        const senderFullNamelower = `${senderNode.person.firstName} ${senderNode.person.lastName}`;
        const receiverID = documentConnectionsArr.find(
          (connection) =>
            connection.docID === document.documentID && connection.roleID === 2
        );
        const receiver = peopleArr.find(
          (person) => person.personID === receiverID?.personID
        );
        receiverFullNamelower = `${receiver?.firstName} ${receiver?.lastName}`;
        //make senderfullname and receiverfullname title case
        const senderFullName = senderFullNamelower.replace(/\b\w/g, (l) =>
          l.toUpperCase()
        );
        const receiverFullName = receiverFullNamelower.replace(/\b\w/g, (l) =>
          l.toUpperCase()
        );
        if (senderNode) {
          senderNode.documents.push({
            document: {
              ...document,
              sender: senderFullName,
              receiver: receiverFullName,
            },
          });
        }
      } else if (connection.roleID == 2) {
        // Receiver
        const receiverId = generateUniqueId("person", connection.personID);
        edges.push({
          document,
          from: documentId,
          to: receiverId,
          type: "document",
        });
        // Update the receiver's documents array
        const receiverNode = personNodeMap.get(receiverId);
        const receiverFullNamelower = `${receiverNode.person.firstName} ${receiverNode.person.lastName}`;
        const senderID = documentConnectionsArr.find(
          (connection) =>
            connection.docID === document.documentID && connection.roleID === 1
        );
        const sender = peopleArr.find(
          (person) => person.personID === senderID?.personID
        );
        const senderFullNamelower = `${sender?.firstName} ${sender?.lastName}`;
        //make senderfullname and receiverfullname title case
        const senderFullName = senderFullNamelower.replace(/\b\w/g, (l) =>
          l.toUpperCase()
        );
        const receiverFullName = receiverFullNamelower.replace(/\b\w/g, (l) =>
          l.toUpperCase()
        );
        if (receiverNode) {
          receiverNode.documents.push({
            document: {
              ...document,
              receiver: receiverFullName,
              sender: senderFullName,
            },
          });
        }
      } else if (connection.roleID == 3) {
        // Mentioned
        const mentionedId = generateUniqueId("person", connection.personID);
        edges.push({
          document,
          from: documentId,
          to: mentionedId,
          type: "mentioned",
        });
        // Update the mentioned person's documents array
        const mentionedNode = personNodeMap.get(mentionedId);
        if (mentionedNode) {
          mentionedNode.documents.push({
            document,
          });
        }
      } else if (connection.roleID == 4) {
        // Author
        const authorId = generateUniqueId("person", connection.personID);
        edges.push({
          document,
          from: authorId,
          to: documentId,
          type: "author",
        });
        // Update the author's documents array
        const authorNode = personNodeMap.get(authorId);
        if (authorNode) {
          authorNode.documents.push({
            document,
          });
        }
      } else if (connection.roleID == 5) {
        // Waypoint
        const waypointId = generateUniqueId("person", connection.personID);
        edges.push({
          document,
          from: documentId,
          to: waypointId,
          type: "document",
        });
        // Update the waypoint person's documents array
        const waypointNode = personNodeMap.get(waypointId);
        if (waypointNode) {
          waypointNode.documents.push({
            document,
          });
        }
      } else {
        console.log("Unknown roleID:", connection.roleID);
      }
    });

    relationshipsArr.forEach((relationship) => {
      const person1Id = generateUniqueId("person", relationship.person1ID);
      const person2Id = generateUniqueId("person", relationship.person2ID);

      edges.push({
        from: person1Id,
        to: person2Id,
        type: "relationship",
        relationship1to2Desc: relationship.relationship1to2Desc || "Unknown",
        relationship2to1Desc: relationship.relationship2to1Desc || "Unknown",
        dateStart: relationship.dateStart || "N/A",
        dateEnd: relationship.dateEnd || "N/A",
      });

      // Update the person nodes with relationships
      const person1Node = personNodeMap.get(person1Id);
      const person2Node = personNodeMap.get(person2Id);

      if (person1Node) {
        person1Node.relations.push({
          relationship: {
            ...relationship,
            person1: person1Node.person.fullName,
            person2: person2Node.person.fullName,
          },
        });
      }

      if (person2Node) {
        person2Node.relations.push({
          relationship: {
            ...relationship,
            person1: person1Node.person.fullName,
            person2: person2Node.person.fullName,
          },
        });
      }
    });

    // Create edges for people to religions (with from/to fields and type)
    religionConnectionsArr.forEach((connection) => {
      const religionId = generateUniqueId("religion", connection.religionID);
      const personId = generateUniqueId("person", connection.personID);
      edges.push({
        from: personId, // From person node
        to: religionId, // To religion node
        type: "religion",
      });
    });

    // Create edges for people to organizations (with from/to fields and type)
    organizationConnectionsArr.forEach((connection) => {
      const organizationId = generateUniqueId(
        "organization",
        connection.organizationID
      );
      const personId = generateUniqueId("person", connection.personID);
      edges.push({
        from: personId, // From person node
        to: organizationId, // To organization node
        type: "organization",
      });
    });

    // Filter out edges where 'from' or 'to' is null
    const filteredEdges = edges.filter(
      (edge) => edge.from !== null && edge.to !== null
    );

    res.json({
      edges: filteredEdges,
      nodes,
      elength: filteredEdges.length,
      nlength: nodes.length,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
