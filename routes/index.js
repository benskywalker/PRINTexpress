// routes/index.js
const express = require('express')
const router = express.Router()

// Import the database connection
const dbPromise = require('../db')

router.get('/', async (req, res) => {
  console.log('GET request received')

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
`

  try {
    const db = await dbPromise
    const promisePool = db.promise()

    promisePool.query(query).then(([rows, fields]) => {
      res.json(rows)
    })
  } catch (error) {
    console.error('Failed to run query:', error)
    res.status(500).json({ error: 'Failed to run query' })
    return
  }
})

async function runQuery (query) {
  // Get the database connection
  const db = await dbPromise
  const promisePool = db.promise()

  try {
    promisePool.query(query).then(([rows, fields]) => {
      return rows
    })
  } catch (error) {
    console.error('Failed to run query:', error)
  } finally {
    if (db && db.end) {
      db.end()
    }
  }
}

//get all persons
router.get('/persons', async (req, res) => {
  console.log('GET request received')
  const query = `SELECT * FROM person`
  try {
    const db = await dbPromise
    const promisePool = db.promise()

    promisePool.query(query).then(([rows, fields]) => {
      res.json(rows)
    })
  } catch (error) {
    console.error('Failed to run query:', error)
    res.status(500).json({ error: 'Failed to run query' })
    return
  }
})

//search for specific document
router.get('/documents/:id', async (req, res) => {
  console.log('GET request received')
  const query = `SELECT * FROM document WHERE documentID = ${req.params.id}`
  try {
    const db = await dbPromise
    const promisePool = db.promise()

    promisePool.query(query).then(([rows, fields]) => {
      res.json(rows)
    })
  } catch (error) {
    console.error('Failed to run query:', error)
    res.status(500).json({ error: 'Failed to run query' })
    return
  }
})

//get person by name and wildcard search for uncomplete names
router.get('/persons/:name', async (req, res) => {
  console.log('GET request received')
  const query = `SELECT * FROM person WHERE firstName LIKE '${req.params.name}%' OR lastName LIKE '${req.params.name}%'`
  try {
    const db = await dbPromise
    const promisePool = db.promise()

    promisePool.query(query).then(([rows, fields]) => {
      res.json(rows)
    })
  } catch (error) {
    console.error('Failed to run query:', error)
    res.status(500).json({ error: 'Failed to run query' })
    return
  }
})

//get all connections between persons and documents and join sender and receiver based on documentID
router.get('/connections/:id', async (req, res) => {
  console.log('GET request received')

  const personID = req.params.id

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
    pd.docID`

  try {
    const db = await dbPromise
    const promisePool = db.promise()

    promisePool.query(query, [personID, personID]).then(([rows, fields]) => {
      res.json(rows)
    })
  } catch (error) {
    console.error('Failed to run query:', error)
    res.status(500).json({ error: 'Failed to run query' })
    return
  }
})
//get all documents sent and received by a person
router.get('/documents', async (req, res) => {
  console.log('GET request received')

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
    DATE_FORMAT(d.sortingDate, '%Y/%m/%d') AS date,
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
  ORDER BY
    pd.docID`

  try {
    const db = await dbPromise
    const promisePool = db.promise()

    promisePool
      .query(query)
      .then(([rows, fields]) => {
        res.json(rows)
      })
      .catch(error => {
        console.error('Failed to run query:', error)
        res.status(500).json({ error: 'Failed to run query' })
      })
  } catch (error) {
    console.error('Failed to run query:', error)
    res.status(500).json({ error: 'Failed to run query' })
  }
})

router.get('/dates', async (req, res) => {
  console.log('GET request received')

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
    d.sortingDate DESC`

  try {
    const db = await dbPromise
    const promisePool = db.promise()

    promisePool.query(query).then(([rows, fields]) => {
      res.json(rows)
    })
  } catch (error) {
    console.error('Failed to run query:', error)
    res.status(500).json({ error: 'Failed to run query' })
    return
  }
})

//get all connections for religion
router.get('/connections/religion', async (req, res) => {
  console.log('GET request received')

  //get all people from person2religion

  const query = ``

  try {
    const db = await dbPromise
    const promisePool = db.promise()

    promisePool.query(query).then(([rows, fields]) => {
      res.json(rows)
    })
  } catch (error) {
    console.error('Failed to run query:', error)
    res.status(500).json({ error: 'Failed to run query' })
    return
  }
})

//get all connections for organization
router.get('/connections/organization', async (req, res) => {
  console.log('GET request received')

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
  `

  try {
    const db = await dbPromise
    const promisePool = db.promise()

    promisePool.query(query).then(([rows, fields]) => {
      res.json(rows)
    })
  } catch (error) {
    console.error('Failed to run query:', error)
    res.status(500).json({ error: 'Failed to run query' })
    return
  }
})

// get all senders for sender filter in frontend
router.get('/senders', async (req, res) => {
  console.log('GET request received')

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

  `
  try {
    const db = await dbPromise
    const promisePool = db.promise()

    promisePool.query(query).then(([rows, fields]) => {
      //format sender names as {sender: {name: 'John Doe', image: 'null'}}
      const senders = rows.map(row => {
        return {
          name: `${row.firstName} ${row.lastName}`,
          image: 'null'
        }
      })

      res.json(senders)
    })
  } catch (error) {
    console.error('Failed to run query:', error)
    res.status(500).json({ error: 'Failed to run query' })
    return
  }
})

// get all receivers for receiver filter in frontend
router.get('/receivers', async (req, res) => {
  console.log('GET request received')

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

  `
  try {
    const db = await dbPromise
    const promisePool = db.promise()

    promisePool.query(query).then(([rows, fields]) => {
      const receivers = rows.map(row => {
        return {
          name: `${row.firstName} ${row.lastName}`,
          image: 'null'
        }
      })
      res.json(receivers)
    })
  } catch (error) {
    console.error('Failed to run query:', error)
    res.status(500).json({ error: 'Failed to run query' })
    return
  }
})

router.get('/sender_receiver', async (req, res) => {
  console.log('GET request received');
  
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

    promisePool.query(query).then(([rows, fields]) => {
      const relation = rows.map(row => {
        return {
          sender: {
            id: row.senderID,
            name: row.senderName,
            firstName: row.senderFirstName,
            middleName: row.senderMiddleName,
            lastName: row.senderLastName,
            suffix: row.senderSuffix,
            biography: row.senderBiography,
            image: 'null'
          },
          receiver: {
            id: row.receiverID,
            name: row.receiverName,
            firstName: row.receiverFirstName,
            middleName: row.receiverMiddleName,
            lastName: row.receiverLastName,
            suffix: row.receiverSuffix,
            biography: row.receiverBiography,
            image: 'null'
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
            pdfURL: row.pdfURL
          }
        };
      });
      res.json(relation);
    }).catch(error => {
      console.error('Failed to run query:', error);
      res.status(500).json({ error: 'Failed to run query' });
    });
  } catch (error) {
    console.error('Failed to run query:', error);
    res.status(500).json({ error: 'Failed to run query' });
  }
});



// This is the relations route
// It will gather all the nodes and edges for the graph
// The nodes will come from the person and organization tables
// The edges will come from the person2document, person2organization, and person2religion tables
// The edges will be between the person and the document, organization, or religion
// Each node will store all the person's or organization's information
// The query will use joins to get all the information needed
router.get('/relations', async (req, res) => {
  console.log('GET request received');

  const query = `
    SELECT
      p.personID AS id,
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
      'person' AS nodeType,
      NULL AS documentID,
      NULL AS organizationID,
      NULL AS religionID,
      NULL AS organizationName,
      NULL AS formationDate,
      NULL AS dissolutionDate,
      NULL AS organizationLOD
    FROM person p
    UNION
    SELECT
      p2d.personID AS id,
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
      'document' AS nodeType,
      p2d.docID AS documentID,
      NULL AS organizationID,
      NULL AS religionID,
      NULL AS organizationName,
      NULL AS formationDate,
      NULL AS dissolutionDate,
      NULL AS organizationLOD
    FROM person2document p2d
    JOIN person p ON p2d.personID = p.personID
    UNION
    SELECT
      p2o.personID AS id,
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
      'organization' AS nodeType,
      NULL AS documentID,
      p2o.organizationID AS organizationID,
      NULL AS religionID,
      NULL AS organizationName,
      NULL AS formationDate,
      NULL AS dissolutionDate,
      NULL AS organizationLOD
    FROM person2organization p2o
    JOIN person p ON p2o.personID = p.personID
    UNION
    SELECT
      p2r.personID AS id,
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
      'religion' AS nodeType,
      NULL AS documentID,
      NULL AS organizationID,
      p2r.religionID AS religionID,
      NULL AS organizationName,
      NULL AS formationDate,
      NULL AS dissolutionDate,
      NULL AS organizationLOD
    FROM person2religion p2r
    JOIN person p ON p2r.personID = p.personID
    UNION
    SELECT
      o.organizationID AS id,
      NULL AS firstName,
      NULL AS middleName,
      NULL AS lastName,
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
      NULL AS organizationID,
      NULL AS religionID,
      o.organizationName,
      o.formationDate,
      o.dissolutionDate,
      o.organizationLOD
    FROM organization o
  `;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool.query(query).then(([rows, fields]) => {
      const nodes = [];
      const edges = [];

      rows.forEach(row => {
        const node = {
          id: row.id,
          firstName: row.firstName,
          middleName: row.middleName,
          lastName: row.lastName,
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
          organizationLOD: row.organizationLOD
        };

        if (!nodes.some(n => n.id === node.id && n.nodeType === node.nodeType)) {
          nodes.push(node);
        }

        if (row.documentID) {
          edges.push({
            from: row.id,
            to: row.documentID,
            type: 'document'
          });
        } else if (row.organizationID) {
          edges.push({
            from: row.id,
            to: row.organizationID,
            type: 'organization'
          });
        } else if (row.religionID) {
          edges.push({
            from: row.id,
            to: row.religionID,
            type: 'religion'
          });
        }
      });

      res.json({ nodes, edges });
    }).catch(error => {
      console.error('Failed to run query:', error);
      res.status(500).json({ error: 'Failed to run query' });
    });
  } catch (error) {
    console.error('Failed to run query:', error);
    res.status(500).json({ error: 'Failed to run query' });
  }
});


module.exports = router
