const processNodes = {
    processPeople: (peopleResults) => {
      const nodes = new Map();
      peopleResults.forEach((person) => {
        nodes.set(`person_${person.personID}`, {
          id: `person_${person.personID}`,
          fullName: `${person.firstName} ${person.lastName}`.replace(/\b\w/g, (l) => l.toUpperCase()),
          documents: [],
          relations: [],
          mentions: [],
          group: "person",
          nodeType: "person",
          ...person,
        });
      });
      return nodes;
    },
  
    processDocuments: (documentResults) => {
      const nodes = new Map();
      documentResults.forEach((document) => {
        nodes.set(`document_${document.documentID}`, {
          id: `document_${document.documentID}`,
          label: `${document.importID}`,
          group: "document",
          nodeType: "document",
          keywords: [],
          ...document,
        });
      });
      return nodes;
    },
  
    processKeywords: (keywordsResults, nodesMap) => {
      keywordsResults.forEach((keyword) => {
        const document = nodesMap.get(`document_${keyword.docID}`);
        if (document) {
          document.keywords.push(keyword.keyword);
        }
      });
    },
  
    processReligions: (religionResults) => {
      const nodes = new Map();
      religionResults.forEach((religion) => {
        nodes.set(`religion_${religion.religionID}`, {
          id: `religion_${religion.religionID}`,
          label: religion.religionDesc,
          group: "religion",
          nodeType: "religion",
          ...religion,
        });
      });
      return nodes;
    },
  
    processOrganizations: (organizationResults) => {
      const nodes = new Map();
      organizationResults.forEach((organization) => {
        nodes.set(`organization_${organization.organizationID}`, {
          id: `organization_${organization.organizationID}`,
          label: organization.organizationDesc,
          group: "organization",
          nodeType: "organization",
          ...organization,
        });
      });
      return nodes;
    }
  };
  
  module.exports = processNodes;