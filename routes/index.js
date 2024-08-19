// routes/index.js
const express = require('express');
const router = express.Router();

// Import the database connection
const dbPromise = require('../db');


router.get('/', async (req, res) => {
  console.log('GET request received');


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
    console.error('Failed to run query:', error);
    res.status(500).json({ error: 'Failed to run query' });
    return;
  }
 }
);



async function runQuery(query) {
  // Get the database connection
  const db = await dbPromise;
  const promisePool = db.promise();



  try {
    promisePool.query(query).then(([rows, fields]) => {
      return rows;
  
    });

  } catch (error) {
    console.error('Failed to run query:', error);
  } finally {
    if (db && db.end) {
      db.end();
    }
  }
}


//get all persons
router.get('/persons', async (req, res) => {
  console.log('GET request received');
  const query = `SELECT * FROM person`;
  try {
    const db = await dbPromise;
  const promisePool = db.promise();

  promisePool.query(query).then(([rows, fields]) => {
    res.json(rows);

  });

  } catch (error) {
    console.error('Failed to run query:', error);
    res.status(500).json({ error: 'Failed to run query' });
    return;
  }
});

//search for specific document
router.get('/documents/:id', async (req, res) => {
  console.log('GET request received');
  const query = `SELECT * FROM document WHERE documentID = ${req.params.id}`;
  try {
    const db = await dbPromise;
  const promisePool = db.promise();

  promisePool.query(query).then(([rows, fields]) => {
    res.json(rows);

  });

  } catch (error) {
    console.error('Failed to run query:', error);
    res.status(500).json({ error: 'Failed to run query' });
    return;
  }
});


//get person by name and wildcard search for uncomplete names
router.get('/persons/:name', async (req, res) => {
  console.log('GET request received');
  const query = `SELECT * FROM person WHERE firstName LIKE '${req.params.name}%' OR lastName LIKE '${req.params.name}%'`;
  try {
    const db = await dbPromise;
  const promisePool = db.promise();

  promisePool.query(query).then(([rows, fields]) => {
    res.json(rows);

  });

  } catch (error) {
    console.error('Failed to run query:', error);
    res.status(500).json({ error: 'Failed to run query' });
    return;
  }
});

//get all connections between persons and documents and join sender and receiver based on documentID
router.get('/connections/:id', async (req, res) => {
  console.log('GET request received');

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
    console.error('Failed to run query:', error);
    res.status(500).json({ error: 'Failed to run query' });
    return;

  

  }

  
}
);
//get all documents sent and received by a person
router.get('/documents', async (req, res) => {
  console.log('GET request received');

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
    pd.docID`;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool.query(query).then(([rows, fields]) => {
      res.json(rows);
    }).catch(error => {
      console.error('Failed to run query:', error);
      res.status(500).json({ error: 'Failed to run query' });
    });

  } catch (error) {
    console.error('Failed to run query:', error);
    res.status(500).json({ error: 'Failed to run query' });
  }
});

  

router.get('/dates', async (req, res) => {
  console.log('GET request received');
  
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

  }

  );

  }

  catch (error) {
    console.error('Failed to run query:', error);
    res.status(500).json({ error: 'Failed to run query' });
    return;
  }
}
);
  

//get all connections for religion
router.get('/connections/religion', async (req, res) => {
  console.log('GET request received');
  
  //get all people from person2religion
  
  const query =``

  try {
    const db = await dbPromise;
  const promisePool = db.promise();

  promisePool
  .query(query)
  .then(([rows, fields]) => {
    res.json(rows);

  }

  );

  }
  
    catch (error) {
      console.error('Failed to run query:', error);
      res.status(500).json({ error: 'Failed to run query' });
      return;
    } 
  }

);


//get all connections for organization
router.get('/connections/organization', async (req, res) => {
  console.log('GET request received');
  
  //get all people from person2organization and specify what organization they are in
  const query =`
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
    const db = await dbPromise;
  const promisePool = db.promise();

  promisePool
  .query(query)
  .then(([rows, fields]) => {
    

    res.json(rows);

  }

  );

  }
  
    catch (error) {
      console.error('Failed to run query:', error);
      res.status(500).json({ error: 'Failed to run query' });
      return;
    } 
  }

);


// get all senders for sender filter in frontend
router.get('/senders', async (req, res) => {
  console.log('GET request received');
  
  //get all senders from person2document
  
  const query =`
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
    const db = await dbPromise;
  const promisePool = db.promise();

  promisePool.query(query).then(([rows, fields]) => {
    //format sender names as {sender: {name: 'John Doe', image: 'null'}}
    const senders = rows.map((row) => {
      return {
        name: `${row.firstName} ${row.lastName}`,
        image: 'null'
      }
    }
    );

    
    res.json(senders);

  });

  } catch (error) {
    console.error('Failed to run query:', error);
    res.status(500).json({ error: 'Failed to run query' });
    return;
  }
}
);


// get all receivers for receiver filter in frontend
router.get('/receivers', async (req, res) => {
  console.log('GET request received');
  
  //get all receivers from person2document
  
  const query =`
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
    const db = await dbPromise;
  const promisePool = db.promise();

  promisePool.query(query).then(([rows, fields]) => {
    const receivers = rows.map((row) => {
      return {
        name: `${row.firstName} ${row.lastName}`,
        image: 'null'
      }
    });
    res.json(receivers);

  }

  );

  }

  catch (error) {
    console.error('Failed to run query:', error);
    res.status(500).json({ error: 'Failed to run query' });
    return;
  }

}
);


//graph view for sigma js
router.get('/graph', async (req, res) => {
  console.log('GET request received');
  
  //get all connections between persons and documents and join sender and receiver based on documentID
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
  ORDER BY
    pd.docID`;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool.query(query).then(([rows, fields]) => {
      const nodes = [];
      const edges = [];
      const nodeMap = new Map();

      rows.forEach(row => {
        // Add the sender to the nodes
        if (!nodeMap.has(row.senderID)) {
          nodeMap.set(row.senderID, {
            id: row.senderID,
            label: `${row.senderFirstName} ${row.senderLastName}`,
            type: 'person'
          });
        }

        // Add the receiver to the nodes
        if (!nodeMap.has(row.receiverID)) {
          nodeMap.set(row.receiverID, {
            id: row.receiverID,
            label: `${row.receiverFirstName} ${row.receiverLastName}`,
            type: 'person'
          });
        }

        // Add the document to the nodes
        if (!nodeMap.has(row.document)) {
          nodeMap.set(row.document, {
            id: row.document,
            label: row.collection,
            type: 'document'
          });
        }

        // Add the edge from the sender to the document
        edges.push({
          id: `${row.senderID}-${row.document}`,
          source: row.senderID,
          target: row.document,
          label: 'sent'
        });

        // Add the edge from the document to the receiver
        edges.push({
          id: `${row.document}-${row.receiverID}`,
          source: row.document,
          target: row.receiverID,
          label: 'received'
        });
      }
      );

      nodes.push(...nodeMap.values());

      res.json({ nodes, edges });

    });

  } catch (error) {
    console.error('Failed to run query:', error);
    res.status(500).json({ error: 'Failed to run query' });
  }

}

);

///gallery/persons route to get information for gallery view of persons
router.get('/gallery/persons', async (req, res) => {
  console.log('GET request received');
  
  //get all connections between persons and documents and join sender and receiver based on documentID
  const query = `
  SELECT
    p.personID,
    p.firstName,
    p.middleName,
    p.lastName,
    p.suffix,
    p.biography,

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
    d.page

  FROM

    person p
  LEFT JOIN person2document pd ON p.personID = pd.personID
  LEFT JOIN document d ON pd.docID = d.documentID
  `;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool.query(query).then

    (([rows, fields]) => {
      const persons = rows.map(row => {
        return {
          id: row.personID,
          name: `${row.firstName} ${row.lastName}`,
          image: 'null',
          biography: row.biography
        };
      });

      res.json(persons);
    }
      
      );

  } catch (error) {
    console.error('Failed to run query:', error);
    res.status(500).json({ error: 'Failed to run query' });
  }

}


);

//get all persons with their documents
router.get('/persons/documents', async (req, res) => {
  console.log('GET request received');
  
  //get all connections between persons and documents and join sender and receiver based on documentID
  const query = `
  SELECT
    p.personID,
    p.firstName,
    p.middleName,
    p.lastName,
    p.suffix,
    p.biography,


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
    d.page

  FROM


    person p
  LEFT JOIN person2document pd ON p.personID = pd.personID
  LEFT JOIN document d ON pd.docID = d.documentID
  `;
  try {
    const db = await dbPromise;
    const promisePool = db.promise();
    
    promisePool.query(query).then(([rows, fields]) => {
      const persons = rows.map(row => {
        return {
          id: row.personID,
          name: `${row.firstName} ${row.lastName}`,
          image: 'null',
          biography: row.biography,
          documents: [
            {
              id: row.documentID,
              collection: row.collection,
              date: row.sortingDate
            }
          ]
        };
      });

      res.json(persons);
    }


    );

  } catch (error) {

    console.error('Failed to run query:', error);
    res.status(500).json({ error: 'Failed to run query' });
  }

}

);





// Utility function to sanitize and validate user input
const sanitizeInput = (input, allowedValues) => {
  return input.filter(item => allowedValues.includes(item));
};

// Define allowed fields, tables, and joins for security
const allowedFields = ['p.personID', 'p.firstName', 'p.lastName', 'd.abstract', 'd.collection', 'd.sortingDate'];
const allowedTables = ['person p', 'document d', 'person2document pd'];
const allowedJoins = [
  'LEFT JOIN person2document pd ON p.personID = pd.personID',
  'LEFT JOIN document d ON pd.docID = d.documentID'
];
const allowedWhereClauses = ['p.personID', 'd.collection', 'd.sortingDate'];

// Route to handle custom queries
router.post('/custom-query', async (req, res) => {
  const { fields, tables, joins, whereClauses } = req.body;

  // Sanitize and validate user input
  const sanitizedFields = sanitizeInput(fields, allowedFields);
  const sanitizedTables = sanitizeInput(tables, allowedTables);
  const sanitizedJoins = sanitizeInput(joins, allowedJoins);
  const sanitizedWhereClauses = sanitizeInput(whereClauses, allowedWhereClauses);

  // Construct the SQL query dynamically
  let query = 'SELECT ';

  // Add fields to the query
  query += sanitizedFields.join(', ');

  // Add tables to the query
  query += ' FROM ' + sanitizedTables.join(', ');

  // Add joins to the query
  if (sanitizedJoins.length > 0) {
    query += ' ' + sanitizedJoins.join(' ');
  }

  // Add where clauses to the query
  if (sanitizedWhereClauses.length > 0) {
    query += ' WHERE ' + sanitizedWhereClauses.map(clause => `${clause} = ?`).join(' AND ');
  }

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    const [rows, fields] = await promisePool.query(query, Object.values(req.body.whereValues));

    res.json(rows);
  } catch (error) {
    console.error('Failed to run query:', error);
    res.status(500).json({ error: 'Failed to run query' });
  }
});

// /users/register
router.post('/users/register', async (req, res) => {
  console.log('POST request received');

  const { username, password } = req.body;

  // Hash the password
  const bcrypt = require('bcrypt');
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Insert the user into the database
  const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
  const values = [username, hashedPassword];

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    await promisePool.query(query, values);

    res.json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Failed to run query:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});



// Route to handle search queries for auto-complete
router.post('/search', async (req, res) => {
  const { searchTerm } = req.body;

  // Sanitize and validate user input
  const sanitizedSearchTerm = sanitizeInput(searchTerm, allowedSearchTerms);

  // Construct the SQL query dynamically
  let query = `
    SELECT name FROM alt_names WHERE name LIKE ?
    UNION
    SELECT keyword FROM keywords WHERE keyword LIKE ?
    UNION
    SELECT title FROM documents WHERE content LIKE ?
    UNION
    SELECT name FROM person WHERE name LIKE ?
  `;

  const searchValue = `%${sanitizedSearchTerm}%`;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    const [rows] = await promisePool.query(query, [searchValue, searchValue, searchValue, searchValue]);

    res.json(rows);
  } catch (error) {
    console.error('Failed to run query:', error);
    res.status(500).json({ error: 'Failed to run query' });
  }
});





module.exports = router;