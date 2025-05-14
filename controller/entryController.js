const db = require("../db/db");

//POST request for new journal entry
const newEntry = async (req, res) => {
  const { title, date, sketch, text } = req.body;
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
    return res.status(200).send({ data: newEntry[0] });
  } catch (error) {
    console.log(error);
    return res.status(400).send({ message: "Error adding entry" });
  }
};

//GET all entries of the user
const getEntries = async (req, res) => {
  const userId = res.locals.userId;

  try {
    const entries = await db("entries").where({ user_id: userId }).select();
    return res.status(200).send({ data: entries });
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
    return res.status(200).send({ data: entry });
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
      .update(entryUpdates);
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
