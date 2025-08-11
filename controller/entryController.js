const db = require("../db/db");
const { addTagsToEntry } = require("../services/tags");

//POST request for new journal entry
const newEntry = async (req, res) => {
  const { title, sketch, text, tags = [] } = req.body;
  const userId = res.locals.userId;

  try {
    const newEntry = await db("entries")
      .insert({
        user_id: userId,
        title,
        sketch,
        text,
      })
      .returning("*");

    const entry = newEntry[0];
    let attachedTags = [];

    if (tags.length > 0) {
      attachedTags = await addTagsToEntry({
        entryId: entry.id,
        userId,
        tags,
      });
    }

    return res.status(200).send({ data: entry, tags: attachedTags });
  } catch (error) {
    console.log(error);
    return res.status(400).send({ message: "Error adding entry" });
  }
};

//GET all entries of the user
const getEntries = async (req, res) => {
  const userId = res.locals.userId;

  try {
    const entries = await db("entries")
      .where({ user_id: userId })
      .orderBy("updated_at", "desc")
      .select();

    const entryIds = entries.map((entry) => entry.id);
    if (entryIds.length === 0) {
      return res.status(200).send({ data: [] });
    }

    //To get the tags for the entry, you access the entry_tags table
    const entryTags = await db("entry_tags")
      //You join to tags table to connect the tag_id from the collum in entry_tag table, and the ids of the tags in the tags table
      .join("tags", "entry_tags.tag_id", "tags.id")
      //In the entry_tag table, you acees the entry_id column to get the ids of the entries
      .whereIn("entry_tags.entry_id", entryIds)
      //In tags table, you access user_id column to get the only the tags owned by the user
      .andWhere("tags.user_id", userId)
      //And you return the names of the tag for the given entry ids
      .select("entry_tags.entry_id", "tags.name");

    //Create and empty object to hold the tagNames
    const tagsByEntryId = {};
    //From the db query entryTags, you loop through each data and take the entry id with the name fo the tags
    entryTags.forEach(({ entry_id, name }) => {
      //if there's is no existing array of tag names for the entry id
      if (!tagsByEntryId[entry_id]) {
        //Set the entry id with an emptry array
        tagsByEntryId[entry_id] = [];
      }
      //Add the tag name to the array for this entry ID (creating the array first if it doesn’t exist).
      tagsByEntryId[entry_id].push(name);
    });

    //Map through the entries, and for each entry add the tags assosciated with the entry from the previous tagsByEntryId
    const entriesWithTags = entries.map((entry) => ({
      ...entry,
      tags: tagsByEntryId[entry.id] || [],
    }));

    return res.status(200).send({ data: entriesWithTags });
  } catch (error) {
    return res.status(400).send({ message: "Error getting entries" });
  }
};

//GET an entry
const getEntry = async (req, res) => {
  const userId = res.locals.userId;
  const entryId = req.params.id;

  try {
    const entry = await db("entries")
      .where({ id: entryId, user_id: userId })
      .select()
      .first();

    if (!entry) {
      throw new Error("Cannot find workout.");
    }
    const tags = await db("entry_tags")
      .join("tags", "entry_tags.tag_id", "tags.id")
      .where("entry_tags.entry_id", entryId)
      .andWhere("tags.user_id", userId)
      .select("tags.name");

    const tagNames = tags.map((tag) => tag.name);

    return res.status(200).send({
      data: entry,
      tags: tagNames,
    });
  } catch (error) {
    return res.status(404).send({ message: "The entry could not found." });
  }
};

//PUT to edit entry
const editEntry = async (req, res) => {
  const userId = res.locals.userId;
  const entryId = req.params.id;
  const entryUpdates = req.body;
  try {
    const entry = await db("entries")
      .where({ id: entryId, user_id: userId })
      .first();

    if (!entry) {
      throw new Error("Cannot find entry");
    }

    await db("entries")
      .where({ id: entryId, user_id: userId })
      .update({ ...entryUpdates, updated_at: new Date().toISOString() });
    return res.status(200).send({ message: "Entry edited successfully!" });
  } catch (error) {
    console.log(error);
    return res
      .status(404)
      .send({ message: "The error occured while editing entry!" });
  }
};

//DELETE an entry
const deleteEntry = async (req, res) => {
  const userId = res.locals.userId;
  const entryId = req.params.id;

  try {
    const entry = await db("entries")
      .where({ id: entryId, user_id: userId })
      .first();

    if (!entry) {
      throw new Error("Cannot find entry!");
    }
    const deletedEntry = await db("entries").where({ id: entryId }).del();

    return res.status(200).send({ message: "Entry deleted successfully!" });
  } catch (error) {
    return (404).send({ message: "There was an error deleting entry!" });
  }
};

module.exports = {
  newEntry,
  getEntries,
  getEntry,
  editEntry,
  deleteEntry,
};
