const express = require("express");
const router = express.Router();
const entryController = require("../controller/entryController");

router.post("/newentry", entryController.createEntry);
router.post("/:id/tags", entryController.saveChosenTags);
router.get("/", entryController.getEntries);
router.get("/:id", entryController.getEntry);
router.put("/:id", entryController.editEntry);
router.delete("/:id", entryController.deleteEntry);

module.exports = router;
