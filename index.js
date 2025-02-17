const express = require("express");
const cors = require("cors");
const app = express();

app.use(express.json());
app.use(cors());

app.listen(3030, () => {
  console.log("server listening on 3030");
});
