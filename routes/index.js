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
    GROUP_CONCAT(DISTINCT r.religionDesc) as religion,
    GROUP_CONCAT(DISTINCT l.languageDesc) as language,
    GROUP_CONCAT(DISTINCT o.organizationDesc) AS organization
  FROM
	  person p
  LEFT JOIN person2religion pr ON pr.personID = p.personID
  LEFT JOIN religion r ON r.religionID = pr.religionID
  LEFT JOIN language l on l.languageID = p.language_id
  LEFT JOIN person2organization p2org ON p.personID = p2org.personID
  LEFT JOIN organization o ON o.organizationID = p2org.organizationID
  GROUP BY p.personID`;
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

//Get all documents for the gallery using document view
router.get("/gallery/docs", async (req, res) => {
  console.log("GET request received");

  const query = `
  SELECT *
  FROM document_all_view;
  `;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool.query(query).then(([rows, fields]) => {
      const documents = rows.map((row) => {
        return {
          documentID: row.documentID,
          importID: row.importID,
          collection: row.collection,
          abstract: row.abstract,
          letterDate: row.letterDate,
          sortingDate: row.sortingDate,
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
          dbNotes: row.dbNotes,
          person2DocID: row.person2DocID,
          personRole: row.personRole,
          roleDesc: row.roleDesc,
          author: row.author,
          authorFirstName: row["Author First Name"],
          authorMiddleName: row["Author Middle Name"],
          authorLastName: row["Author Last Name"],
          person2Role: row.person2Role,
          receiver: row.receiver,
          receiverFirstName: row["Receiver First Name"],
          receiverMiddleName: row["Receiver Middle Name"],
          receiverLastName: row["Receiver Last Name"],
          authorStdName: row.authorStdName,
          receiverStdName: row.receiverStdName,
          organization2DocID: row.organization2DocumnetID,
          organizationID: row.organizationID,
          organization: row.organizationDesc,
          organizationRole: row.orgRole,
          internalPDFname: row.internalPDFname,
        };
      });
      return res.json(documents);
    });
  } catch (error) {
    console.error("Failed to run query:", error);
    res.status(500).json({ error: "Failed to run query" });
    return;
  }
});

//get everything associated with a person just how the graph is storing an individual person
//get by the personID
router.get("/person/:personID", async (req, res) => {
  const personID = req.params.personID;
  const personQuery = `
    SELECT
    p.personID,
    p.biography,
    CONCAT(p.firstName, ' ', p.lastName) AS fullName,
    p.gender,
    p.birthDate,
    p.deathDate,
    p.LODLOC,
    p.LODwikiData,
    p.LODVIAF
    FROM
    person p
    WHERE
    p.personID = ${personID};
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
    FROM religion r
    LEFT JOIN person2religion p2r ON p2r.religionID = r.religionID
    WHERE p2r.personID = ${personID};
  `;

  const organizationQuery = `
    SELECT 
      GROUP_CONCAT(DISTINCT o.organizationID) as organizationID,
    GROUP_CONCAT(DISTINCT o.organizationDesc) AS orgranization
    FROM organization o
    LEFT JOIN person2organization p2org ON p2org.organizationID = o.organizationID
    WHERE p2org.personID = ${personID}
    GROUP BY p2org.personID
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
      CONCAT(p1.firstName, ' ', p1.lastName) AS person1,
      r.person2ID,
      CONCAT(p2.firstName, ' ', p2.lastName) AS person2,
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
    LEFT JOIN
      relationshiptype rt2 ON r.relationship2to1ID = rt2.relationshiptypeID
    LEFT JOIN
    person p1 ON r.person1ID = p1.personID
    LEFT JOIN
    person p2 ON r.person2ID = p2.personID
    WHERE
    r.person1ID = ${personID} OR r.person2ID = ${personID}
    ORDER BY relationshipID;
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

    const person = personResults;
    const documents = documentResults;
    const religion = religionResults[0];
    const organization = organizationResults[0];
    const mentions = mentionResults;
    const relations = relationshipResults.map((rel) => ({ relationship: rel }));

    console.log("Person:", person);

    const personNode = {
      person,
      documents,
      religion,
      organization,
      mentions,
      relations,
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
  } else {
    return res.status(404).send("PDF not found");
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

    if (tables && tables.length > 1) {
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
    } else if (tables && tables.length === 1) {
      // Single table scenario without CTEs
      knexQuery = knex(tables[0]).select("*");

      knexQuery = knexQuery.where(fields[0], operators[0], values[0]);

      // Apply filters for single table scenario
      for (let i = 1; i < fields.length; i++) {
        if (dependentFields[i - 1] === "AND") {
          knexQuery = knexQuery.andWhere(fields[i], operators[i], values[i]);
        } else {
          knexQuery = knexQuery.orWhere(fields[i], operators[i], values[i]);
        }
      }
    } else {
      console.log("Tables are not defined or empty");
    }

    // Execute the query
    const [rows] = await promisePool.query(knexQuery.toString());

    // Convert the data to a graph
    results.push({ rows });

    res.json({ rows });
  } catch (error) {
    console.error("Error running query:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/nodes", async (req, res) => {
  const peopleQuery = `
    SELECT 
      *
    FROM
      person;
  `;

  const documentsQuery = `
    SELECT a.*, b.internalPDFname, DATE_FORMAT(a.sortingDate, '%Y-%m-%d') AS date 
    FROM document a
    JOIN pdf_documents b ON a.documentID = b.documentID
    and b.fileTypeID = 2
    ;
  `;

  const keywordsQuery = `
    SELECT
      a.keywordID, a.keyword, a.keywordLOD, a.parentID, a.parcel, a.keywordDef,
      b.keyword2DocID, b.keywordID, b.docID, b.uncertain
    FROM
      keyword a
    LEFT JOIN
      keyword2document b ON a.keywordID = b.keywordID;
  `;

  const religionsQuery = `
    SELECT *
    FROM religion;
  `;

  const organizationsQuery = `
    SELECT *
    FROM organization;
  `;

  const people2documentQuery = `
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
    LEFT JOIN
      relationshiptype rt1 ON r.relationship1to2ID = rt1.relationshiptypeID
    LEFT JOIN
      relationshiptype rt2 ON r.relationship2to1ID = rt2.relationshiptypeID
    WHERE person1ID != person2ID
    ORDER BY relationshipID;
  `;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

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
      promisePool.query(peopleQuery),
      promisePool.query(documentsQuery),
      promisePool.query(religionsQuery),
      promisePool.query(organizationsQuery),
      promisePool.query(people2documentQuery),
      promisePool.query(relationshipsQuery),
      promisePool.query(keywordsQuery),
    ]);

    const nodesMap = new Map();

    // Process People
    peopleResults.forEach((person) => {
      nodesMap.set(`person_${person.personID}`, {
        id: `person_${person.personID}`,
        fullName: `${person.firstName} ${person.lastName}`.replace(
          /\b\w/g,
          (l) => l.toUpperCase()
        ),
        documents: [],
        relations: [],
        mentions: [],
        group: "person",
        nodeType: "person",
        ...person,
      });
    });

    // Process Documents
    documentResults.forEach((document) => {
      nodesMap.set(`document_${document.documentID}`, {
        id: `document_${document.documentID}`,
        label: `${document.importID}`,
        group: "document",
        nodeType: "document",
        keywords: [],
        ...document,
      });
    });

    // Process Keywords
    keywordsResults.forEach((keyword) => {
      const document = nodesMap.get(`document_${keyword.docID}`);
      if (document) {
        document.keywords.push(keyword.keyword);
        // console.log(keyword);
      }
    });

    // Process Religions
    religionResults.forEach((religion) => {
      nodesMap.set(`religion_${religion.religionID}`, {
        id: `religion_${religion.religionID}`,
        label: religion.religionDesc,
        group: "religion",
        nodeType: "religion",
        ...religion,
      });
    });

    // Process Organizations
    organizationResults.forEach((organization) => {
      nodesMap.set(`organization_${organization.organizationID}`, {
        id: `organization_${organization.organizationID}`,
        label: organization.organizationDesc,
        group: "organization",
        nodeType: "organization",
        ...organization,
      });
    });

    // Process Person to Document Relationships
    people2documentResults.forEach((connection) => {
      const personNode = nodesMap.get(`person_${connection.personID}`);
      const documentNode = nodesMap.get(`document_${connection.docID}`);

      //add sender and receiver to document
      const senderID = people2documentResults.find(
        (connection) =>
          connection.docID === documentNode.documentID &&
          connection.roleID === 1
      );

      const sender = peopleResults.find(
        (person) => person.personID === senderID?.personID
      );

      const senderFullNamelower = `${sender?.firstName} ${sender?.lastName}`;

      const receiverID = people2documentResults.find(
        (connection) =>
          connection.docID === documentNode.documentID &&
          connection.roleID === 2
      );

      const receiver = peopleResults.find(
        (person) => person.personID === receiverID?.personID
      );

      const receiverFullNamelower = `${receiver?.firstName} ${receiver?.lastName}`;

      const senderFullName = senderFullNamelower.replace(/\b\w/g, (l) =>
        l.toUpperCase()
      );
      const receiverFullName = receiverFullNamelower.replace(/\b\w/g, (l) =>
        l.toUpperCase()
      );

      documentNode.sender = senderFullName;
      documentNode.receiver = receiverFullName;

      if (personNode && documentNode) {
        personNode.documents.push({ document: documentNode });
      }
    });

    // Process Relationships
    relationshipsResults.forEach((relationship) => {
      const person1Node = nodesMap.get(`person_${relationship.person1ID}`);
      const person2Node = nodesMap.get(`person_${relationship.person2ID}`);

      if (person1Node && person2Node) {
        person1Node.relations.push({
          relationship: {
            ...relationship,
            person1: person1Node.fullName,
            person2: person2Node.fullName,
          },
        });
        person2Node.relations.push({
          relationship: {
            ...relationship,
            person1: person1Node.fullName,
            person2: person2Node.fullName,
          },
        });
      }
    });

    // Construct the nodes array after all processing is done
    const nodes = Array.from(nodesMap.values());

    res.json(nodes);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/edges", async (req, res) => {
  const person2documentQuery = `
    SELECT *
    FROM person2document;
  `;

  const person2religionQuery = `
    SELECT *
    FROM person2religion;
  `;

  const person2organizationQuery = `
    SELECT *
    FROM person2organization;
  `;

  const relationshipQuery = `
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
    LEFT JOIN
      relationshiptype rt2 ON r.relationship2to1ID = rt2.relationshiptypeID
    WHERE person1ID != person2ID
    ORDER BY relationshipID;
  `;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();
    const [person2documentResults] = await promisePool.query(
      person2documentQuery
    );
    const [person2religionResults] = await promisePool.query(
      person2religionQuery
    );
    const [person2organizationResults] = await promisePool.query(
      person2organizationQuery
    );
    const [relationshipResults] = await promisePool.query(relationshipQuery);

    const edgesMap = new Map();

    person2documentResults.forEach((connection) => {
      const key = `person_${connection.personID}-document_${connection.docID}`;
      edgesMap.set(key, {
        from: `person_${connection.personID}`,
        to: `document_${connection.docID}`,
        role: connection.roleID,
        type: connection.roleID === 1 ? "sender" :
        connection.roleID === 2 ? "receiver" :
        connection.roleID === 3 ? "mentioned" :
        connection.roleID === 4 ? "author" :
        connection.roleID === 5 ? "waypoint" : undefined,

        ...connection,
      });
    });

    person2religionResults.forEach((connection) => {
      const key = `person_${connection.personID}-religion_${connection.religionID}`;
      edgesMap.set(key, {
        from: `person_${connection.personID}`,
        to: `religion_${connection.religionID}`,
        role: "religion",
        type: "religion",
        ...connection,
      });
    });

    person2organizationResults.forEach((connection) => {
      const key = `person_${connection.personID}-organization_${connection.organizationID}`;
      edgesMap.set(key, {
        from: `person_${connection.personID}`,
        to: `organization_${connection.organizationID}`,
        role: "organization",
        type: "organization",
        ...connection,
      });
    });

    relationshipResults.forEach((relationship) => {
      const key = `person_${relationship.person1ID}-person_${relationship.person2ID}`;
      edgesMap.set(key, {
        from: `person_${relationship.person1ID}`,
        to: `person_${relationship.person2ID}`,
        type: "relationship",
        relationship1to2Desc: relationship.relationship1to2Desc || "Unknown",
        relationship2to1Desc: relationship.relationship2to1Desc || "Unknown",
        dateStart: relationship.dateStart || "N/A",
        dateEnd: relationship.dateEnd || "N/A",
        ...relationship,
      });

      const reverseKey = `person_${relationship.person2ID}-person_${relationship.person1ID}`;

      if (!edgesMap.has(reverseKey)) {
        edgesMap.set(reverseKey, {
          from: `person_${relationship.person2ID}`,
          to: `person_${relationship.person1ID}`,
          type: "relationship",
          relationship1to2Desc: relationship.relationship2to1Desc || "Unknown",
          relationship2to1Desc: relationship.relationship1to2Desc || "Unknown",
          dateStart: relationship.dateStart || "N/A",
          dateEnd: relationship.dateEnd || "N/A",
          ...relationship,
        });
      }
    });

    const edges = Array.from(edgesMap.values());

    res.json(edges);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post('/nodes-query', async (req, res) => {
  const { tables, fields, operators, values, dependentFields } = req.body;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    let query = knex(tables[0]).select('*');

    // Build the WHERE clause based on the input parameters
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const operator = operators[i];
      const value = values[i];

      if (i === 0) {
        query = query.where(field, operator, value);
      } else {
        const dependentField = dependentFields[i - 1];
        if (dependentField === 'AND') {
          query = query.andWhere(field, operator, value);
        } else {
          query = query.orWhere(field, operator, value);
        }
      }
    }

    // Execute the query
    const [rows] = await promisePool.query(query.toString());

    // Process the nodes similar to the /nodes route
    const nodesMap = new Map();
    const personIDs = new Set();
    const documentIDs = new Set();
    const organizationIDs = new Set();
    const religionIDs = new Set();

    // Process initial nodes and collect IDs
    for (const row of rows) {
      if (tables[0] === 'person') {
        const nodeId = `person_${row.personID}`;
        nodesMap.set(nodeId, {
          id: nodeId,
          fullName: `${row.firstName} ${row.lastName}`.replace(/\b\w/g, (l) =>
            l.toUpperCase()
          ),
          documents: [],
          relations: [],
          mentions: [],
          group: 'person',
          nodeType: 'person',
          ...row,
        });
        personIDs.add(row.personID);
      } else if (tables[0] === 'document') {
        const nodeId = `document_${row.documentID}`;
        nodesMap.set(nodeId, {
          id: nodeId,
          label: `${row.importID}`,
          group: 'document',
          nodeType: 'document',
          keywords: [],
          ...row,
        });
        documentIDs.add(row.documentID);
      } else if (tables[0] === 'organization') {
        const nodeId = `organization_${row.organizationID}`;
        nodesMap.set(nodeId, {
          id: nodeId,
          label: row.organizationDesc,
          group: 'organization',
          nodeType: 'organization',
          ...row,
        });
        organizationIDs.add(row.organizationID);
      } else if (tables[0] === 'religion') {
        const nodeId = `religion_${row.religionID}`;
        nodesMap.set(nodeId, {
          id: nodeId,
          label: row.religionDesc,
          group: 'religion',
          nodeType: 'religion',
          ...row,
        });
        religionIDs.add(row.religionID);
      }
      // Add more cases for other tables if needed
    }

    // **Fetch associated documents for each person**
    if (personIDs.size > 0) {
      const personIDsArray = Array.from(personIDs);

      // Fetch person2document entries for these persons
      const person2documentQuery = `
        SELECT *
        FROM person2document
        WHERE personID IN (?)
      `;
      const [person2documentResults] = await promisePool.query(
        person2documentQuery,
        [personIDsArray]
      );

      // Collect document IDs
      person2documentResults.forEach((p2d) => {
        documentIDs.add(p2d.docID);
      });

      // Fetch documents
      if (documentIDs.size > 0) {
        const documentIDsArray = Array.from(documentIDs);

        const documentsQuery = `
          SELECT a.*, b.internalPDFname, DATE_FORMAT(a.sortingDate, '%Y-%m-%d') AS date 
          FROM document a
          LEFT JOIN pdf_documents b ON a.documentID = b.documentID
          AND b.fileTypeID = 2
          WHERE a.documentID IN (?)
        `;
        const [documentResults] = await promisePool.query(documentsQuery, [documentIDsArray]);

        documentResults.forEach((document) => {
          const nodeId = `document_${document.documentID}`;
          if (!nodesMap.has(nodeId)) {
            nodesMap.set(nodeId, {
              id: nodeId,
              label: `${document.importID}`,
              group: 'document',
              nodeType: 'document',
              keywords: [],
              ...document,
            });
          }
        });
      }

      // Process Person to Document Relationships
      person2documentResults.forEach((connection) => {
        const personNode = nodesMap.get(`person_${connection.personID}`);
        const documentNode = nodesMap.get(`document_${connection.docID}`);

        if (personNode && documentNode) {
          personNode.documents.push({ document: documentNode });
        }
      });

      // **Add sender and receiver information to documents**
      if (documentIDs.size > 0) {
        const people2documentResults = person2documentResults;

        for (const documentData of nodesMap.values()) {
          if (documentData.nodeType === 'document') {
            const documentNode = documentData;

            // Add sender and receiver information
            const senderConnection = people2documentResults.find(
              (connection) =>
                connection.docID === documentData.documentID &&
                connection.roleID === 1
            );
            const receiverConnection = people2documentResults.find(
              (connection) =>
                connection.docID === documentData.documentID &&
                connection.roleID === 2
            );

            const senderNode = nodesMap.get(`person_${senderConnection?.personID}`);
            const receiverNode = nodesMap.get(`person_${receiverConnection?.personID}`);

            const senderFullName = senderNode?.fullName || 'Unknown';
            const receiverFullName = receiverNode?.fullName || 'Unknown';

            documentNode.sender = senderFullName;
            documentNode.receiver = receiverFullName;
          }
        }
      }
    }

    // **Fetch and process relationships**
    if (personIDs.size > 0) {
      const personIDsArray = Array.from(personIDs);

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
        LEFT JOIN
          relationshiptype rt2 ON r.relationship2to1ID = rt2.relationshiptypeID
        WHERE
          r.person1ID IN (?) OR r.person2ID IN (?)
        ORDER BY relationshipID;
      `;
      const [relationshipsResults] = await promisePool.query(
        relationshipsQuery,
        [personIDsArray, personIDsArray]
      );

      for (const relationship of relationshipsResults) {
        // **Add the other person as a node if not already added**
        const relatedPersonIDs = [relationship.person1ID, relationship.person2ID];
        for (const personID of relatedPersonIDs) {
          const nodeId = `person_${personID}`;
          if (!nodesMap.has(nodeId)) {
            const personQuery = `
              SELECT *
              FROM person
              WHERE personID = ?
            `;
            const [personRows] = await promisePool.query(personQuery, [personID]);
            const personData = personRows[0];
            if (personData) {
              nodesMap.set(nodeId, {
                id: nodeId,
                fullName: `${personData.firstName} ${personData.lastName}`.replace(/\b\w/g, (l) =>
                  l.toUpperCase()
                ),
                documents: [],
                relations: [],
                mentions: [],
                group: 'person',
                nodeType: 'person',
                ...personData,
              });
              personIDs.add(personID);
            }
          }
        }

        // Update person nodes
        const updatedPerson1Node = nodesMap.get(`person_${relationship.person1ID}`);
        const updatedPerson2Node = nodesMap.get(`person_${relationship.person2ID}`);

        if (updatedPerson1Node && updatedPerson2Node) {
          updatedPerson1Node.relations.push({
            relationship: {
              ...relationship,
              person1: updatedPerson1Node.fullName,
              person2: updatedPerson2Node.fullName,
            },
          });
          updatedPerson2Node.relations.push({
            relationship: {
              ...relationship,
              person1: updatedPerson1Node.fullName,
              person2: updatedPerson2Node.fullName,
            },
          });
        }
      }
    }

    // **Fetch keywords and add them to documents**
    if (documentIDs.size > 0) {
      const documentIDsArray = Array.from(documentIDs);

      const keywordsQuery = `
        SELECT
          a.keywordID, a.keyword, a.keywordLOD, a.parentID, a.parcel, a.keywordDef,
          b.keyword2DocID, b.keywordID, b.docID, b.uncertain
        FROM
          keyword a
        LEFT JOIN
          keyword2document b ON a.keywordID = b.keywordID
        WHERE
          b.docID IN (?)
      `;
      const [keywordsResults] = await promisePool.query(keywordsQuery, [documentIDsArray]);

      keywordsResults.forEach((keyword) => {
        const documentNode = nodesMap.get(`document_${keyword.docID}`);
        if (documentNode) {
          documentNode.keywords.push(keyword.keyword);
        }
      });
    }

    // **Process person2organization**
    if (organizationIDs.size > 0 || personIDs.size > 0) {
      const organizationIDsArray = Array.from(organizationIDs);
      const personIDsArray = Array.from(personIDs);

      const whereClauses = [];
      const params = [];

      if (organizationIDsArray.length > 0) {
        whereClauses.push('organizationID IN (?)');
        params.push(organizationIDsArray);
      }

      if (personIDsArray.length > 0) {
        whereClauses.push('personID IN (?)');
        params.push(personIDsArray);
      }

      if (whereClauses.length > 0) {
        const person2organizationQuery = `
          SELECT *
          FROM person2organization
          WHERE ${whereClauses.join(' OR ')}
        `;
        const [person2organizationResults] = await promisePool.query(
          person2organizationQuery,
          params
        );

        for (const p2o of person2organizationResults) {
          // Add person node if not already added
          const personNodeId = `person_${p2o.personID}`;
          if (!nodesMap.has(personNodeId)) {
            const personQuery = `
              SELECT *
              FROM person
              WHERE personID = ?
            `;
            const [personRows] = await promisePool.query(personQuery, [p2o.personID]);
            const personData = personRows[0];
            if (personData) {
              nodesMap.set(personNodeId, {
                id: personNodeId,
                fullName: `${personData.firstName} ${personData.lastName}`.replace(/\b\w/g, (l) =>
                  l.toUpperCase()
                ),
                documents: [],
                relations: [],
                mentions: [],
                group: 'person',
                nodeType: 'person',
                ...personData,
              });
              personIDs.add(p2o.personID);
            }
          }

          // Add organization node if not already added
          const organizationNodeId = `organization_${p2o.organizationID}`;
          if (!nodesMap.has(organizationNodeId)) {
            const organizationQuery = `
              SELECT *
              FROM organization
              WHERE organizationID = ?
            `;
            const [organizationRows] = await promisePool.query(organizationQuery, [p2o.organizationID]);
            const organizationData = organizationRows[0];
            if (organizationData) {
              nodesMap.set(organizationNodeId, {
                id: organizationNodeId,
                label: organizationData.organizationDesc,
                group: 'organization',
                nodeType: 'organization',
                ...organizationData,
              });
              organizationIDs.add(p2o.organizationID);
            }
          }
        }
      }
    }

    // **Process person2religion**
    if (religionIDs.size > 0 || personIDs.size > 0) {
      const religionIDsArray = Array.from(religionIDs);
      const personIDsArray = Array.from(personIDs);

      const whereClauses = [];
      const params = [];

      if (religionIDsArray.length > 0) {
        whereClauses.push('religionID IN (?)');
        params.push(religionIDsArray);
      }

      if (personIDsArray.length > 0) {
        whereClauses.push('personID IN (?)');
        params.push(personIDsArray);
      }

      if (whereClauses.length > 0) {
        const person2religionQuery = `
          SELECT *
          FROM person2religion
          WHERE ${whereClauses.join(' OR ')}
        `;
        const [person2religionResults] = await promisePool.query(
          person2religionQuery,
          params
        );

        for (const p2r of person2religionResults) {
          // Add person node if not already added
          const personNodeId = `person_${p2r.personID}`;
          if (!nodesMap.has(personNodeId)) {
            const personQuery = `
              SELECT *
              FROM person
              WHERE personID = ?
            `;
            const [personRows] = await promisePool.query(personQuery, [p2r.personID]);
            const personData = personRows[0];
            if (personData) {
              nodesMap.set(personNodeId, {
                id: personNodeId,
                fullName: `${personData.firstName} ${personData.lastName}`.replace(/\b\w/g, (l) =>
                  l.toUpperCase()
                ),
                documents: [],
                relations: [],
                mentions: [],
                group: 'person',
                nodeType: 'person',
                ...personData,
              });
              personIDs.add(p2r.personID);
            }
          }

          // Add religion node if not already added
          const religionNodeId = `religion_${p2r.religionID}`;
          if (!nodesMap.has(religionNodeId)) {
            const religionQuery = `
              SELECT *
              FROM religion
              WHERE religionID = ?
            `;
            const [religionRows] = await promisePool.query(religionQuery, [p2r.religionID]);
            const religionData = religionRows[0];
            if (religionData) {
              nodesMap.set(religionNodeId, {
                id: religionNodeId,
                label: religionData.religionDesc,
                group: 'religion',
                nodeType: 'religion',
                ...religionData,
              });
              religionIDs.add(p2r.religionID);
            }
          }
        }
      }
    }

    // **Fetch associated documents for newly added persons**
    // (You may need to re-fetch documents if new persons were added)

    // **Finalize nodes array**
    const nodes = Array.from(nodesMap.values());

    res.json(nodes);
  } catch (error) {
    console.error('Error running nodes-query:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.post('/edges-query', async (req, res) => {
  const { tables, fields, operators, values, dependentFields } = req.body;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    // **Step 1: Generate Nodes (similar to /nodes-query)**
    let query = knex(tables[0]).select('*');

    // Build the WHERE clause based on the input parameters
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const operator = operators[i];
      const value = values[i];

      if (i === 0) {
        query = query.where(field, operator, value);
      } else {
        const dependentField = dependentFields[i - 1];
        if (dependentField === 'AND') {
          query = query.andWhere(field, operator, value);
        } else {
          query = query.orWhere(field, operator, value);
        }
      }
    }

    // Execute the query to get nodes
    const [rows] = await promisePool.query(query.toString());

    // **Step 2: Process Nodes and Extract IDs**
    const nodesMap = new Map();
    const personIDs = new Set();
    const documentIDs = new Set();
    const organizationIDs = new Set();
    const religionIDs = new Set();

    // Process initial nodes and collect IDs
    for (const row of rows) {
      if (tables[0] === 'person') {
        const nodeId = `person_${row.personID}`;
        nodesMap.set(nodeId, {
          id: nodeId,
          fullName: `${row.firstName} ${row.lastName}`.replace(/\b\w/g, (l) =>
            l.toUpperCase()
          ),
          group: 'person',
          nodeType: 'person',
          ...row,
        });
        personIDs.add(row.personID);
      } else if (tables[0] === 'document') {
        const nodeId = `document_${row.documentID}`;
        nodesMap.set(nodeId, {
          id: nodeId,
          label: `${row.importID}`,
          group: 'document',
          nodeType: 'document',
          ...row,
        });
        documentIDs.add(row.documentID);
      } else if (tables[0] === 'organization') {
        const nodeId = `organization_${row.organizationID}`;
        nodesMap.set(nodeId, {
          id: nodeId,
          label: row.organizationDesc,
          group: 'organization',
          nodeType: 'organization',
          ...row,
        });
        organizationIDs.add(row.organizationID);
      } else if (tables[0] === 'religion') {
        const nodeId = `religion_${row.religionID}`;
        nodesMap.set(nodeId, {
          id: nodeId,
          label: row.religionDesc,
          group: 'religion',
          nodeType: 'religion',
          ...row,
        });
        religionIDs.add(row.religionID);
      }
      // Add more cases for other tables if needed
    }

    // **Fetch associated documents for each person**
    if (personIDs.size > 0) {
      const personIDsArray = Array.from(personIDs);

      // Fetch person2document entries for these persons
      const person2documentQuery = `
        SELECT *
        FROM person2document
        WHERE personID IN (?)
      `;
      const [person2documentResults] = await promisePool.query(
        person2documentQuery,
        [personIDsArray]
      );

      // Collect document IDs
      person2documentResults.forEach((p2d) => {
        documentIDs.add(p2d.docID);
      });

      // Fetch documents
      if (documentIDs.size > 0) {
        const documentIDsArray = Array.from(documentIDs);

        const documentsQuery = `
          SELECT a.*, b.internalPDFname, DATE_FORMAT(a.sortingDate, '%Y-%m-%d') AS date 
          FROM document a
          LEFT JOIN pdf_documents b ON a.documentID = b.documentID
          AND b.fileTypeID = 2
          WHERE a.documentID IN (?)
        `;
        const [documentResults] = await promisePool.query(documentsQuery, [documentIDsArray]);

        documentResults.forEach((document) => {
          const nodeId = `document_${document.documentID}`;
          if (!nodesMap.has(nodeId)) {
            nodesMap.set(nodeId, {
              id: nodeId,
              label: `${document.importID}`,
              group: 'document',
              nodeType: 'document',
              ...document,
            });
          }
        });
      }
    }

    // **Fetch person2organization associations**
    if (personIDs.size > 0 || organizationIDs.size > 0) {
      const personIDsArray = Array.from(personIDs);
      const organizationIDsArray = Array.from(organizationIDs);

      const whereClauses = [];
      const params = [];

      if (personIDsArray.length > 0) {
        whereClauses.push('personID IN (?)');
        params.push(personIDsArray);
      }

      if (organizationIDsArray.length > 0) {
        whereClauses.push('organizationID IN (?)');
        params.push(organizationIDsArray);
      }

      if (whereClauses.length > 0) {
        const person2organizationQuery = `
          SELECT *
          FROM person2organization
          WHERE ${whereClauses.join(' OR ')}
        `;
        const [person2organizationResults] = await promisePool.query(
          person2organizationQuery,
          params
        );

        person2organizationResults.forEach((p2o) => {
          // Collect IDs
          personIDs.add(p2o.personID);
          organizationIDs.add(p2o.organizationID);
        });
      }
    }

    // **Fetch person2religion associations**
    if (personIDs.size > 0 || religionIDs.size > 0) {
      const personIDsArray = Array.from(personIDs);
      const religionIDsArray = Array.from(religionIDs);

      const whereClauses = [];
      const params = [];

      if (personIDsArray.length > 0) {
        whereClauses.push('personID IN (?)');
        params.push(personIDsArray);
      }

      if (religionIDsArray.length > 0) {
        whereClauses.push('religionID IN (?)');
        params.push(religionIDsArray);
      }

      if (whereClauses.length > 0) {
        const person2religionQuery = `
          SELECT *
          FROM person2religion
          WHERE ${whereClauses.join(' OR ')}
        `;
        const [person2religionResults] = await promisePool.query(
          person2religionQuery,
          params
        );

        person2religionResults.forEach((p2r) => {
          // Collect IDs
          personIDs.add(p2r.personID);
          religionIDs.add(p2r.religionID);
        });
      }
    }

    // **Fetch relationships involving persons**
    if (personIDs.size > 0) {
      const personIDsArray = Array.from(personIDs);

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
        LEFT JOIN
          relationshiptype rt2 ON r.relationship2to1ID = rt2.relationshiptypeID
        WHERE
          r.person1ID IN (?) OR r.person2ID IN (?)
        ORDER BY relationshipID;
      `;
      const [relationshipsResults] = await promisePool.query(
        relationshipsQuery,
        [personIDsArray, personIDsArray]
      );

      relationshipsResults.forEach((relationship) => {
        personIDs.add(relationship.person1ID);
        personIDs.add(relationship.person2ID);
      });
    }

    // **Update nodesMap with any new persons, organizations, religions**
    // Fetch any new persons not already in nodesMap
    const allPersonIDs = Array.from(personIDs).filter(
      (id) => !nodesMap.has(`person_${id}`)
    );
    if (allPersonIDs.length > 0) {
      const personQuery = `
        SELECT *
        FROM person
        WHERE personID IN (?)
      `;
      const [personRows] = await promisePool.query(personQuery, [allPersonIDs]);
      personRows.forEach((personData) => {
        const nodeId = `person_${personData.personID}`;
        nodesMap.set(nodeId, {
          id: nodeId,
          fullName: `${personData.firstName} ${personData.lastName}`.replace(
            /\b\w/g,
            (l) => l.toUpperCase()
          ),
          group: 'person',
          nodeType: 'person',
          ...personData,
        });
      });
    }

    // Fetch any new organizations not already in nodesMap
    const allOrganizationIDs = Array.from(organizationIDs).filter(
      (id) => !nodesMap.has(`organization_${id}`)
    );
    if (allOrganizationIDs.length > 0) {
      const organizationQuery = `
        SELECT *
        FROM organization
        WHERE organizationID IN (?)
      `;
      const [organizationRows] = await promisePool.query(organizationQuery, [allOrganizationIDs]);
      organizationRows.forEach((organizationData) => {
        const nodeId = `organization_${organizationData.organizationID}`;
        nodesMap.set(nodeId, {
          id: nodeId,
          label: organizationData.organizationDesc,
          group: 'organization',
          nodeType: 'organization',
          ...organizationData,
        });
      });
    }

    // Fetch any new religions not already in nodesMap
    const allReligionIDs = Array.from(religionIDs).filter(
      (id) => !nodesMap.has(`religion_${id}`)
    );
    if (allReligionIDs.length > 0) {
      const religionQuery = `
        SELECT *
        FROM religion
        WHERE religionID IN (?)
      `;
      const [religionRows] = await promisePool.query(religionQuery, [allReligionIDs]);
      religionRows.forEach((religionData) => {
        const nodeId = `religion_${religionData.religionID}`;
        nodesMap.set(nodeId, {
          id: nodeId,
          label: religionData.religionDesc,
          group: 'religion',
          nodeType: 'religion',
          ...religionData,
        });
      });
    }

    // **Step 3: Query Junction Tables to Find Edges**
    const edgesMap = new Map();

    // Fetch person-to-document edges
    if (personIDs.size > 0 && documentIDs.size > 0) {
      const personIDsArray = Array.from(personIDs);
      const documentIDsArray = Array.from(documentIDs);

      const person2documentQuery = `
        SELECT *
        FROM person2document
        WHERE personID IN (?) AND docID IN (?)
      `;
      const [person2documentResults] = await promisePool.query(
        person2documentQuery,
        [personIDsArray, documentIDsArray]
      );

      person2documentResults.forEach((connection) => {
        const key = `person_${connection.personID}-document_${connection.docID}`;
        edgesMap.set(key, {
          from: `person_${connection.personID}`,
          to: `document_${connection.docID}`,
          role: connection.roleID,
          type:
            connection.roleID === 1
              ? 'sender'
              : connection.roleID === 2
              ? 'receiver'
              : connection.roleID === 3
              ? 'mentioned'
              : connection.roleID === 4
              ? 'author'
              : connection.roleID === 5
              ? 'waypoint'
              : undefined,
          ...connection,
        });
      });
    }

    // Fetch person-to-person relationships
    if (personIDs.size > 0) {
      const personIDsArray = Array.from(personIDs);

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
        LEFT JOIN
          relationshiptype rt2 ON r.relationship2to1ID = rt2.relationshiptypeID
        WHERE
          r.person1ID IN (?) AND r.person2ID IN (?)
        ORDER BY relationshipID;
      `;
      const [relationshipsResults] = await promisePool.query(
        relationshipsQuery,
        [personIDsArray, personIDsArray]
      );

      relationshipsResults.forEach((relationship) => {
        const key = `person_${relationship.person1ID}-person_${relationship.person2ID}`;
        edgesMap.set(key, {
          from: `person_${relationship.person1ID}`,
          to: `person_${relationship.person2ID}`,
          type: 'relationship',
          relationship1to2Desc: relationship.relationship1to2Desc || 'Unknown',
          relationship2to1Desc: relationship.relationship2to1Desc || 'Unknown',
          dateStart: relationship.dateStart || 'N/A',
          dateEnd: relationship.dateEnd || 'N/A',
          ...relationship,
        });
      });
    }

    // Fetch person-to-organization edges
    if (personIDs.size > 0 && organizationIDs.size > 0) {
      const personIDsArray = Array.from(personIDs);
      const organizationIDsArray = Array.from(organizationIDs);

      const person2organizationQuery = `
        SELECT *
        FROM person2organization
        WHERE personID IN (?) AND organizationID IN (?)
      `;
      const [person2organizationResults] = await promisePool.query(
        person2organizationQuery,
        [personIDsArray, organizationIDsArray]
      );

      person2organizationResults.forEach((connection) => {
        const key = `person_${connection.personID}-organization_${connection.organizationID}`;
        edgesMap.set(key, {
          from: `person_${connection.personID}`,
          to: `organization_${connection.organizationID}`,
          type: 'organization',
          ...connection,
        });
      });
    }

    // Fetch person-to-religion edges
    if (personIDs.size > 0 && religionIDs.size > 0) {
      const personIDsArray = Array.from(personIDs);
      const religionIDsArray = Array.from(religionIDs);

      const person2religionQuery = `
        SELECT *
        FROM person2religion
        WHERE personID IN (?) AND religionID IN (?)
      `;
      const [person2religionResults] = await promisePool.query(
        person2religionQuery,
        [personIDsArray, religionIDsArray]
      );

      person2religionResults.forEach((connection) => {
        const key = `person_${connection.personID}-religion_${connection.religionID}`;
        edgesMap.set(key, {
          from: `person_${connection.personID}`,
          to: `religion_${connection.religionID}`,
          type: 'religion',
          ...connection,
        });
      });
    }

    // **Finalize edges array**
    const edges = Array.from(edgesMap.values());

    res.json(edges);
  } catch (error) {
    console.error('Error running edges-query:', error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;