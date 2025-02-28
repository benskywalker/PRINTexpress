const fetchData = {
    getPersonDocuments: async (pool, personIDs) => {
      const query = `
        SELECT * FROM person2document
        WHERE personID IN (?)
      `;
      const [results] = await pool.query(query, [personIDs]);
      return results;
    },
  
    getPersonDocumentEdges: async (pool, personIDs, documentIDs) => {
      const query = `
        SELECT * FROM person2document
        WHERE personID IN (?)
        AND docID IN (?)
      `;
      const [results] = await pool.query(query, [personIDs, documentIDs]);
      return results;
    },
  
    getPersonReligionEdges: async (pool, personIDs, religionIDs) => {
      const query = `
        SELECT * FROM person2religion
        WHERE personID IN (?)
        AND religionID IN (?)
      `;
      const [results] = await pool.query(query, [personIDs, religionIDs]);
      return results;
    },
  
    getPersonOrganizationEdges: async (pool, personIDs, organizationIDs) => {
      const query = `
        SELECT * FROM person2organization
        WHERE personID IN (?)
        AND organizationID IN (?)
      `;
      const [results] = await pool.query(query, [personIDs, organizationIDs]);
      return results;
    },
  
    getPersonRelationships: async (pool, personIDs) => {
      const query = `
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
        FROM relationship r
        LEFT JOIN relationshiptype rt1 ON r.relationship1to2ID = rt1.relationshiptypeID
        LEFT JOIN relationshiptype rt2 ON r.relationship2to1ID = rt2.relationshiptypeID
        WHERE r.person1ID IN (?) OR r.person2ID IN (?)
        ORDER BY relationshipID
      `;
      const [results] = await pool.query(query, [personIDs, personIDs]);
      return results;
    },
  
    getBasicData: async (pool, ids) => {
      const queries = {
        persons: 'SELECT * FROM person WHERE personID IN (?)',
        documents: `
          SELECT a.*, b.internalPDFname, DATE_FORMAT(a.sortingDate, '%Y-%m-%d') AS date 
          FROM document a
          LEFT JOIN pdf_documents b ON a.documentID = b.documentID AND b.fileTypeID = 2
          WHERE a.documentID IN (?)
        `,
        organizations: 'SELECT * FROM organization WHERE organizationID IN (?)',
        religions: 'SELECT * FROM religion WHERE religionID IN (?)'
      };
  
      const results = await Promise.all([
        ids.personIDs.size > 0 ? pool.query(queries.persons, [Array.from(ids.personIDs)]) : [[]], 
        ids.documentIDs.size > 0 ? pool.query(queries.documents, [Array.from(ids.documentIDs)]) : [[]],
        ids.organizationIDs.size > 0 ? pool.query(queries.organizations, [Array.from(ids.organizationIDs)]) : [[]],
        ids.religionIDs.size > 0 ? pool.query(queries.religions, [Array.from(ids.religionIDs)]) : [[]]
      ]);
  
      return {
        persons: results[0][0],
        documents: results[1][0],
        organizations: results[2][0],
        religions: results[3][0]
      };
    }
  };
  
  module.exports = fetchData;