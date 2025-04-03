const knex = require('knex')(require('../knexfile'));

const getBasicQueries = () => ({
  peopleQuery: `SELECT * FROM person;`,
  
  documentsQuery: `
    SELECT a.*, b.internalPDFname, b.hidden, DATE_FORMAT(a.sortingDate, '%Y-%m-%d') AS date 
    FROM document a
    JOIN pdf_documents b ON a.documentID = b.documentID
    AND b.fileTypeID = 2;
  `,
  
  keywordsQuery: `
    SELECT
      a.keywordID, a.keyword, a.keywordLOD, a.parentID, a.parcel, a.keywordDef,
      b.keyword2DocID, b.keywordID, b.docID, b.uncertain
    FROM keyword a
    LEFT JOIN keyword2document b ON a.keywordID = b.keywordID;
  `,
  
  religionsQuery: `SELECT * FROM religion;`,
  organizationsQuery: `SELECT * FROM organization;`,
  person2documentQuery: `SELECT * FROM person2document;`,
  
  relationshipsQuery: `
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
    WHERE person1ID != person2ID
    ORDER BY relationshipID;
  `
});

module.exports = {
  getBasicQueries
};