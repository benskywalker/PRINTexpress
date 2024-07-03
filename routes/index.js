// routes/index.js
const express = require('express');
const router = express.Router();

// Import the database connection
const db = require('../db');



router.get('/', (req, res) => {
  console.log('GET request received');
  db.connect((err) => {
    if (err) throw err;
    console.log('Connected to the database');
  });
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
LIMIT 100`;

  // Query the database
  db.query(query, (err, rows) => {
    if (err) {
      console.log(err);
      return;
    }
    res.json(rows);
  });
}
);

get all persons


router.get('/', (req, res) => {
  console.log('GET request received');

  const query = `SELECT
  * FROM person
  LIMIT 100`;

  // Query
  db.query(query, (err, rows) => {
    if (err) {
      console.log(err);
      return;
    }
    res.json(rows);
  });


}
);


module.exports = router;