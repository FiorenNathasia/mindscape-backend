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
    return res.status(500).send({ message: "Error adding entry" });
  }
};

//GET all entries of the user
const getEntries = async (req, res) => {
  const userId = res.locals.userId;
};
const getEntry = async (req, res) => {
  const userId = res.locals.userId;
};
const editEntry = async (req, res) => {};
const deleteEntry = async (req, res) => {};

module.exports = {
  newEntry,
  getEntries,
  getEntry,
  editEntry,
  deleteEntry,
};
