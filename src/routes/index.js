const express = require("express");
const router = express.Router();
const notifyRoutes = require("./notifyRoutes");
const cronRoutes = require("./cronRoutes");

router.use("/api/fees", notifyRoutes);
router.use("/api/cron", cronRoutes);

module.exports = router;
