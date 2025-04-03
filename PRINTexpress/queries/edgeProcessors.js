const processEdges = {
    processPersonDocumentEdges: (person2documentResults) => {
      const edges = new Map();
      person2documentResults.forEach((connection) => {
        const key = `person_${connection.personID}-document_${connection.docID}`;
        edges.set(key, {
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
      return edges;
    },
  
    processReligionEdges: (person2religionResults) => {
      const edges = new Map();
      person2religionResults.forEach((connection) => {
        const key = `person_${connection.personID}-religion_${connection.religionID}`;
        edges.set(key, {
          from: `person_${connection.personID}`,
          to: `religion_${connection.religionID}`,
          role: "religion",
          type: "religion",
          ...connection,
        });
      });
      return edges;
    },
  
    processOrganizationEdges: (person2organizationResults) => {
      const edges = new Map();
      person2organizationResults.forEach((connection) => {
        const key = `person_${connection.personID}-organization_${connection.organizationID}`;
        edges.set(key, {
          from: `person_${connection.personID}`,
          to: `organization_${connection.organizationID}`,
          role: "organization",
          type: "organization",
          ...connection,
        });
      });
      return edges;
    },
  
    processRelationshipEdges: (relationshipResults) => {
      const edges = new Map();
      relationshipResults.forEach((relationship) => {
        const key = `person_${relationship.person1ID}-person_${relationship.person2ID}`;
        const reverseKey = `person_${relationship.person2ID}-person_${relationship.person1ID}`;
        
        edges.set(key, {
          from: `person_${relationship.person1ID}`,
          to: `person_${relationship.person2ID}`,
          type: "relationship",
          relationship1to2Desc: relationship.relationship1to2Desc || "Unknown",
          relationship2to1Desc: relationship.relationship2to1Desc || "Unknown",
          dateStart: relationship.dateStart || "N/A",
          dateEnd: relationship.dateEnd || "N/A",
          ...relationship,
        });
  
        if (!edges.has(reverseKey)) {
          edges.set(reverseKey, {
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
      return edges;
    }
  };
  
  module.exports = processEdges;