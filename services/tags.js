const db = require("../db/db");

const addTagsToEntry = async ({ entryId, userId, tags }) => {
  // Access the tags table
  const existingTags = await db("tags")
    // Find tags associated with the current user
    .where("user_id", userId)
    //Look in the collumn that is called name to see if there is an existing tag to tags being entered
    .whereIn("name", tags)
    //Tell database to only return the id and name of the tag that is the same to the tag from req.body
    .select("id", "name");

  //Go through the existing tags and see if there is one that is the same from the req.body
  const existingTagNames = existingTags.map((t) => t.name);
  // Filter out tags that don't already exist (keep only new tags)
  const newTagNames = tags.filter((tag) => !existingTagNames.includes(tag));

  //If the new tag name's length is greater than 0
  if (newTagNames.length > 0) {
    //You connect to the tag DB
    const insertedTags = await db("tags")
      //And insert the new tag name with the name of the tag, to the current user
      .insert(newTagNames.map((name) => ({ name, user_id: userId })))
      //and you insert the id of the tag and the name
      .returning(["id", "name"]);

    // Add newly inserted tags to the existingTags array
    existingTags.push(...insertedTags);
  }

  // Get all tag IDs (existing + new)
  const tagIds = existingTags.map((t) => t.id);

  // Query entry_tags table for tag IDs already linked to this entry
  const existingEntryTags = await db("entry_tags")
    //Then you access the id of the current entry
    .where("entry_id", entryId)
    //And look in the column tag_id where the existing tag ids from the tag db
    .whereIn("tag_id", tagIds)
    //Give back and array of only the tag id
    .pluck("tag_id");

  //From the array of only the tag ids
  const newEntryTags = tagIds
    // Filter out tag IDs that are already linked to the entry
    .filter((tagId) => !existingEntryTags.includes(tagId))
    //You go through the array of the filtered ids that aren't already linked to the entry
    // Prepare new entry_tag mappings for insertion
    .map((tagId) => ({ entry_id: entryId, tag_id: tagId }));
  //And if the length of the id is greater than 0
  if (newEntryTags.length > 0) {
    //You than add those to the entry_id db
    await db("entry_tags").insert(newEntryTags);
  }

  //Then you access the entry_tags db
  const allTags = await db("entry_tags")
    //Where you than join the tag_id from entry_tag collumn, the id of the tag id from the tags table with the tag table
    .join("tags", "entry_tags.tag_id", "tags.id")
    // Filter to only include rows where the entry_id matches the current entry
    .where("entry_tags.entry_id", entryId)
    //And you get the name of those tags of the current user from the tag table
    .select("tags.name");

  return allTags.map((t) => t.name);
};

module.exports = { addTagsToEntry };
