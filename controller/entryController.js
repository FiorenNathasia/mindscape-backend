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

//POST to save ai suggested tags
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
      // .andWhere("tags.user_id", userId)
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
  // Get the current user's ID
  const userId = res.locals.userId;
  // Get the ID of the entry to edit
  const entryId = req.params.id;
  // Destructure title, text, sketch, and tags from the request body
  // Default tags to an empty array if not provided
  const { title, text, sketch, tags } = req.body;

  try {
    // Fetch the entry from the database for the current user//
    let entry = await db("entries")
      //Of the current entry id and user id
      .where({ id: entryId, user_id: userId })
      //The first entry that matches that
      .first();

    // Return 404 if the entry does not exist or does not belong to the user
    if (!entry) {
      return res.status(404).send({ message: "Entry not found" });
    }

    // Update the entry's title, text, and sketch//
    // Acces the entries table
    await db("entries")
      //For the current entry and user
      .where({ id: entryId, user_id: userId })
      //Update the title, text, sketch from the req.body above
      .update({ title, text, sketch, updated_at: new Date().toISOString() });

    // Fetch current tags associated with this entry for this user//
    const tagRows = await db("entry_tags")
      //Join with the tags table, with the shared id of the tag from both tables
      .join("tags", "entry_tags.tag_id", "tags.id")
      //For the current entry
      .where("entry_tags.entry_id", entryId)
      //And the current user
      .andWhere("tags.user_id", userId)
      //Find the id and name of the tag from the tag table for the current user and entry
      .select("tags.id", "tags.name");

    // Get an array of current tag names, trimming whitespace
    const currentTags = tagRows.map((t) => t.name.trim());
    // Normalize tags for case-insensitive comparison//
    //Make all the currentTags to lower case to normalize for comparison
    const currentTagsLower = currentTags.map((t) => t.toLowerCase());

    // Chech if tags from req.body is and array with the tags (truthy/falsy)
    // If there is, map through the tags and trim the white space for comparison
    //If is a falsely or there's nothing
    const newTags = Array.isArray(tags) ? tags.map((t) => t.trim()) : [];
    const newTagsLower = newTags.map((t) => t.toLowerCase());
    // Determine which tags need to be added//
    //Go through the array of the newTags, if the newTags exist in the existing tags, filter them out
    const tagsToAdd = newTags.filter(
      (t) => !currentTagsLower.includes(t.toLowerCase())
    );
    const tagsToRemove = currentTags.filter(
      (t) => !newTagsLower.includes(t.toLowerCase())
    );
    // Remove tags that are no longer needed//
    //If the tags to remove length is greater than 0
    if (tagsToRemove.length > 0) {
      //From the entry tags table
      await db("entry_tags")
        //For the current entry
        .where("entry_id", entryId)
        //Find the id of the tag in the tag_id colum in the entry_tag table
        // Find rows where tag_id is in...
        .whereIn(
          "tag_id",
          //And in the tags table
          //(subquery: look in tags table)
          db("tags")
            //Find the tag names that matches the tagsToRemove
            .whereIn("name", tagsToRemove)
            //Only for the current user
            .andWhere("user_id", userId)
            //Get the id of the tags
            .select("id")
        )
        //And delete those tags
        .del();
    }

    // Add new tags//
    //Loop through the array of the tags in the tagsToAdd array
    for (const tagName of tagsToAdd) {
      // Check if the tag already exists for the user
      //Access the tags table
      let tag = await db("tags")
        //That has the tagName for the current user
        .where({ name: tagName, user_id: userId })
        //The first one that match
        .first();

      // If the tag doesn't exist, create it
      if (!tag) {
        //Take the newTag
        const [newTag] = await db("tags")
          //Insert the tag to the name collumn for the current user
          .insert({ name: tagName, user_id: userId })
          .returning("*");
        //And set the tag to the newTag from above
        tag = newTag;
      }

      // Link the tag to the entry in the entry_tags table
      await db("entry_tags").insert({
        entry_id: entryId,
        tag_id: tag.id,
      });
    }

    // Refetch the updated entry from the database
    //Get the current entry of the current user
    entry = await db("entries").where({ id: entryId, user_id: userId }).first();

    // Fetch the updated manual tags for this entry//
    //From the entry_tags table
    const manualTags = await db("entry_tags")
      //Where you connect to the tags table and the id of the tags from both tables
      .join("tags", "entry_tags.tag_id", "tags.id")
      //For the current entry
      .where("entry_tags.entry_id", entryId)
      //And the current user
      .andWhere("tags.user_id", userId)
      //And all the corresponding names of the tags
      .pluck("tags.name");

    // Normalize manual tags for comparison with AI-generated suggestions
    //Go through the manualTags array and trim the white space of the tag and make it all lowercase
    const manualTagsNormalized = newTags.map((t) => t.toLowerCase());

    // Generate AI-suggested tags based on the entry's title, text, and manual tags
    const suggestedTags = await chatgpt({
      title,
      text,
      manualTags: tags,
    });

    // Filter out AI suggestions that already exist as manual tags
    //Take the results from the chatGpt function
    //Go through the suggestedTags arrays, and if the suggestedTag is found in the existing manualTags array
    //Filter those tags out
    //also trim and make those tags to lower case to make sure the comparison is accurate
    const aiTags = suggestedTags
      .map((t) => t.trim().toLowerCase())
      .filter(
        (tag) => !manualTagsNormalized.includes(tag.trim().toLowerCase())
      );

    // Return the updated entry along with manual and AI-suggested tags
    return res.status(200).send({
      data: entry,
      manualTags,
      aiTags,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .send({ message: "Error occurred while editing entry!" });
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
