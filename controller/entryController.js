const db = require("../db/db");
const { addTagsToEntry } = require("../services/tags");
const chatgpt = require("../utils/openai");

//POST request for new journal entry
const createEntry = async (req, res) => {
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
    let manualTags = [];

    //If the inserted tag from the req.body length is > than 0
    if (tags.length > 0) {
      //By passing the current entry id, user id, and the inserted tags to
      //the addTagsToEntry()
      //Assign the result of the step above to manualTags
      manualTags = await addTagsToEntry({
        entryId: entry.id,
        userId,
        tags,
      });
    }

    //Pass the inserted title, text and manualTags from the previous steps
    const suggestedTags = await chatgpt({ title, text, manualTags });
    //Take the results from the chatgpt api call, an do another check for each tag in suggestedTags that chatgpt might have missed
    //Check if manualTags contains any tag (m) such that lowercase of m is equal to lowercase of the current tag
    //If NO such tag is found in manualTags, then keep the current tag in aiTags, Otherwise, exclude it
    const aiTags = suggestedTags.filter(
      (tag) => !manualTags.some((m) => m.toLowerCase() === tag.toLowerCase())
    );
    //Return the data of the inserted entry, the inserted manualTags, and the aiTags (not inserted yet)
    return res.status(200).send({ data: entry, manualTags, aiTags });
  } catch (error) {
    console.log(error);
    return res.status(400).send({ message: "Error adding entry" });
  }
};

//POST to save chosen tags or not
const saveChosenTags = async (req, res) => {
  //The body of the manual tags and the ai tags (from frontend)
  const { manualTags = [], aiTags = [] } = req.body;
  const userId = res.locals.userId;
  const entryId = req.params.id;

  try {
    //Combine both the manualTags and the aiTags into one array
    const uniqueTags = [
      ...new Set([...manualTags, ...aiTags].map((t) => t.toLowerCase())), //Map through the combined array to makes sure all the tags is lowercase
    ];

    //Pass the uniqueTags array to the addTagsToEntry function for the current user and entry
    //This particularly inserts any newTags from both manualTags that has been set in the front end
    //But more particularly for the aiTags as it hasn't been inserted into both entr_tag and tags table
    const attachedTags = await addTagsToEntry({
      entryId,
      userId,
      tags: uniqueTags,
    });

    //Return the entry id as well the newly attached tags
    return res.status(200).send({
      entryId,
      tags: attachedTags,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Error saving tags" });
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
      //You join tags table to connect the tag_id from the collum in entry_tag table, and the ids of the tags in the tags table
      .join("tags", "entry_tags.tag_id", "tags.id")
      //In the entry_tag table, you access the entry_id column to get the ids of the entries
      .whereIn("entry_tags.entry_id", entryIds)
      //In tags table, you access user_id column to get only the tags owned by the current user
      .andWhere("tags.user_id", userId)
      //And you return the names of the tag for the given entry id
      .select("entry_tags.entry_id", "tags.name");

    //Create and empty object to hold the tagNames
    const tagsByEntryId = {};
    //From the db query entryTags, you loop through each data and check the name of the tags for the current entry
    entryTags.forEach(({ entry_id, name }) => {
      //If there's is no existing array of tag names for the current entry id
      if (!tagsByEntryId[entry_id]) {
        //Set the entry id with an emptry array
        tagsByEntryId[entry_id] = [];
      }
      //Here you add the tag name to the array for this entry ID (creating the array first in the previous step if it doesn’t exist yet).
      tagsByEntryId[entry_id].push(name);
    });

    //Map through the entries, and for each entry add the tags assosciated with the entry from the previous tagsByEntryId
    const entriesWithTags = entries.map((entry) => ({
      ...entry,
      tags: tagsByEntryId[entry.id] || [], //If there is no tags, return an empty array
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
  const { tags = [], ...entryUpdates } = req.body;
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

    const currentTags = await db("entry_tags")
      .join("tags", "entry_tags.tag_id", "tags.id")
      .where("entry_tags.entry_id", entryId)
      .andWhere("tags.user_id", userId)
      .pluck("tags.name");

    //This variable is where you get the new added tags from the req.body & normalize incoming tags from the request by trimming whitespace
    const newTags = tags.map((t) => t.trim());
    //Filter tags present in the new list but not in the current list.
    const tagsToAdd = newTags.filter((t) => !currentTags.includes(t));
    // Determine which existing tags should be removed
    const tagsToRemove = currentTags.filter((t) => !newTags.includes(t));

    //If there the length of the tagToRemove is more than 0
    if (tagsToRemove.length > 0) {
      //You access the entry_tags table
      await db("entry_tags")
        //And from the entry_id column, you got to thr entry with the current entry id
        .where("entry_id", entryId)
        //And you acess the id of the tag
        .whereIn(
          "tag_id",
          //With the id of the tags for the entry to access the tagsId in the tags table
          db("tags")
            //Take the name of the tags that you want to remove from the name colum in the tag table
            .whereIn("name", tagsToRemove)
            //And only those that are owned by the current user
            .andWhere("user_id", userId)
            //And take the id of those tags
            .select("id")
        )
        //And delete the tags that you want to remove
        .del();
    }
    //Now you loop through the tag names of the tags you wannt too add
    for (const tagName of tagsToAdd) {
      //You make a query to the tags table
      let tag = await db("tags")
        // Ensure the tag exists in the tags table for this user
        .where({ name: tagName, user_id: userId })
        .first();
      //If the tag does not exist yet
      if (!tag) {
        //Then you access the tags table
        const [newTag] = await db("tags")
          //Where you insert the new tagName in the name collumn for the current user
          .insert({ name: tagName, user_id: userId })
          //You return the data
          .returning("*");
        //And assign the newly added insertion as tag
        tag = newTag;
      }

      //You also need to assign the new tag into the entry_tag table, where you insert the newTag id from the tags table to the current entry
      await db("entry_tags").insert({
        entry_id: entryId,
        tag_id: tag.id,
      });
    }

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

    //Delete the tags of the current entry
    const deleteTag = await db("entry_tags").where("entry_id", entryId).del();

    const deletedEntry = await db("entries").where({ id: entryId }).del();
    //Delete the same tags from the entry of the current user, you get the id of the tags from the entry_tags table from the current entry
    await db("tags")
      .where("user_id", userId)
      .whereNotIn("id", db("entry_tags").select("tag_id"))
      .del();

    return res.status(200).send({ message: "Entry deleted successfully!" });
  } catch (error) {
    return (404).send({ message: "There was an error deleting entry!" });
  }
};

module.exports = {
  createEntry,
  saveChosenTags,
  getEntries,
  getEntry,
  editEntry,
  deleteEntry,
};
