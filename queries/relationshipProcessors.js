const processRelationships = {
    processPerson2Document: (people2documentResults, nodesMap, peopleResults) => {
      people2documentResults.forEach((connection) => {
        const personNode = nodesMap.get(`person_${connection.personID}`);
        const documentNode = nodesMap.get(`document_${connection.docID}`);
  
        if (documentNode) {
          const senderID = people2documentResults.find(
            (conn) => conn.docID === documentNode.documentID && conn.roleID === 1
          );
  
          const sender = peopleResults.find(
            (person) => person.personID === senderID?.personID
          );
  
          const senderFullNameLower = sender
            ? `${sender.firstName} ${sender.lastName}`
            : "Unknown";
  
          const receiverID = people2documentResults.find(
            (conn) => conn.docID === documentNode.documentID && conn.roleID === 2
          );
  
          const receiver = peopleResults.find(
            (person) => person.personID === receiverID?.personID
          );
  
          const receiverFullNameLower = receiver
            ? `${receiver.firstName} ${receiver.lastName}`
            : "Unknown";
  
          const senderFullName = senderFullNameLower.replace(/\b\w/g, (l) => l.toUpperCase());
          const receiverFullName = receiverFullNameLower.replace(/\b\w/g, (l) => l.toUpperCase());
  
          documentNode.sender = senderFullName;
          documentNode.receiver = receiverFullName;
        }
  
        if (personNode && documentNode) {
          personNode.documents.push({ document: documentNode });
        }
      });
    },
  
    processRelationships: (relationshipsResults, nodesMap) => {
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
    }
  };
  
  module.exports = processRelationships;