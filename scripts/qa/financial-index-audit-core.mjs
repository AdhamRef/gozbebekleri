/**
 * Read-only MongoDB audit helpers. Unique references must be verified
 * without logging the provider identifier, donor ID or personal data.
 */
export async function countDuplicateStripeReferences(collection) {
  const rows=await collection.aggregate([
    {$match:{provider:"STRIPE",providerOrderId:{$type:"string"}}},
    {$group:{_id:{provider:"$provider",reference:"$providerOrderId"},count:{$sum:1}}},
    {$match:{count:{$gt:1}}},
    {$count:"duplicateGroups"},
  ]).toArray();
  return rows[0]?.duplicateGroups ?? 0;
}
export function matchingUniqueIndex(indexes,key,{partial=false}={}) {
  return indexes.some(index=>
    JSON.stringify(index.key)===JSON.stringify(key) &&
    (index.unique===true || key._id===1) &&
    (!partial || (index.partialFilterExpression?.provider==="STRIPE" &&
      index.partialFilterExpression?.providerOrderId?.$type==="string"))
  );
}
