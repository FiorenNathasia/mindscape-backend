const express = require("express");
const router = express.Router();
const entryController = require("../controller/entryController");

router.post("/newentry", entryController.newEntry);
router.get("/", entryController.getEntries);
router.get("/:id", entryController.getEntry);

module.exports = router;
