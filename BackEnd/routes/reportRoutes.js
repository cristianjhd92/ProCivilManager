const express = require("express");
const router = express.Router();
const { generateStatsReport } = require("../controllers/reportController");

router.get("/stats/pdf", generateStatsReport);

module.exports = router;
