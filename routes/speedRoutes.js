const express = require("express");
const router = express.Router();
const { pingTest, downloadTest, uploadTest, saveResult, getHistory, getDashboard, deleteResult } = require("../controllers/speedController");
const { protect } = require("../middleware/authMiddleware");

router.get("/ping", pingTest);
router.get("/download", downloadTest);
router.post("/upload", express.raw({ type: "*/*", limit: "50mb" }), uploadTest);
router.post("/result", protect, saveResult);
router.get("/history", protect, getHistory);
router.get("/dashboard", protect, getDashboard);
router.delete("/result/:id", protect, deleteResult);

module.exports = router;
