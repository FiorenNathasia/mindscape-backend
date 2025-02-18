const db = require("../db/db");

//POST request for new journal entry
const newEntry = async (req, res) => {
  const { title, date, sketch, entry } = req.body;
  const userId = res.locals.userId;

  try {
    const newEntry = await db("entries")
      .insert({
        user_id: userId,
        title,
        date,
        sketch,
        entry,
      })
      .returning("*");
    return res.status(200).send({ data: newEntry[0] });
  } catch (error) {
    console.log(error);
    res.status(400).send({ message: "Error adding entry" });
  }
};

//GET all entries of the user
const getEntries = async (req, res) => {
  const userId = res.locals.userId;

  try {
    const entries = await db("entries").where({ user_id: userId }).select();
    res.status(200).send({ data: entries });
  } catch (error) {
    res.status(400).send({ message: "Error getting entries" });
  }
};
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
    res.status(200).send({ data: entry });
  } catch (error) {
    res.status(404).send({ message: "The entry could not found." });
  }
};
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
    res.status(200).send({ message: "Entry edited successfully!" });
  } catch (error) {
    console.log(error);
    res.status(404).send({ message: "The error occured while editing entry!" });
  }
};
const deleteEntry = async (req, res) => {};

module.exports = {
  newEntry,
  getEntries,
  getEntry,
  editEntry,
  deleteEntry,
};
