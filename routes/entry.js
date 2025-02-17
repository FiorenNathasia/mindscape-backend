const express = require("express");
const router = express.Router();
const entryController = require("../controller/entryController");

router.post("/newentry", entryController.newEntry);
router.get("/", entryController.getEntries);
router.get("/:id", entryController.getEntry);
router.patch("/edit", entryController.editEntry);
router.delete("/", entryController.deleteEntry);

module.exports = router;
