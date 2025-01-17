exports.personQuery = `
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
  FROM person p
  WHERE p.personID = ?;
`;

exports.documentQuery = `
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
  WHERE sender.personID = ? OR receiver.personID = ?
  GROUP BY d.documentID;
`;

exports.religionQuery = `
  SELECT *
  FROM religion r
  LEFT JOIN person2religion p2r ON p2r.religionID = r.religionID
  WHERE p2r.personID = ?;
`;

exports.organizationQuery = `
  SELECT 
    GROUP_CONCAT(DISTINCT o.organizationID) as organizationID,
    GROUP_CONCAT(DISTINCT o.organizationDesc) AS orgranization
  FROM organization o
  LEFT JOIN person2organization p2org ON p2org.organizationID = o.organizationID
  WHERE p2org.personID = ?
  GROUP BY p2org.personID;
`;

exports.mentionQuery = `
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
  FROM mention_nodes mn
  JOIN mentions m ON mn.mentionNodeID = m.mentionNodeID
  WHERE m.personID = ?;
`;

exports.relationshipQuery = `
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
  FROM relationship r
  LEFT JOIN relationshiptype rt1 ON r.relationship1to2ID = rt1.relationshiptypeID
  LEFT JOIN relationshiptype rt2 ON r.relationship2to1ID = rt2.relationshiptypeID
  LEFT JOIN person p1 ON r.person1ID = p1.personID
  LEFT JOIN person p2 ON r.person2ID = p2.personID
  WHERE r.person1ID = ? OR r.person2ID = ?
  ORDER BY relationshipID;
`;