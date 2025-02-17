const db = require("../db/db");

const newEntry = async (req, res) => {
  const { title, date, sketch, entry } = req.body;
  const userId = res.locals.userId;

  try {
    const newEntry = await db("entries").insert({
      user,
    });
  } catch (error) {}
};
const getEntries = async (req, res) => {};
const getEntry = async (req, res) => {};
const editEntry = async (req, res) => {};
const deleteEntry = async (req, res) => {};

module.exports = {
  newEntry,
  getEntries,
  getEntry,
  editEntry,
  deleteEntry,
};
