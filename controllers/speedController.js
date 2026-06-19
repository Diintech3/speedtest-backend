const requestIp = require("request-ip");
const SpeedTest = require("../models/SpeedTest");

// @desc    Ping test
// @route   GET /api/speed/ping
const pingTest = (req, res) => {
  res.json({ success: true, timestamp: Date.now() });
};

// @desc    Download test - streams data in chunks for accurate measurement
// @route   GET /api/speed/download
const downloadTest = (req, res) => {
  const mb = Math.min(parseInt(req.query.size) || 25, 100);
  const size = mb * 1024 * 1024;

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Length", size);
  res.setHeader("Cache-Control", "no-store, no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  const chunkSize = 64 * 1024; // 64KB per chunk
  let sent = 0;

  const sendChunk = () => {
    while (sent < size) {
      const remaining = size - sent;
      const chunk = Buffer.alloc(Math.min(chunkSize, remaining), 0);
      const ok = res.write(chunk);
      sent += chunk.length;
      if (!ok) {
        res.once("drain", sendChunk);
        return;
      }
    }
    res.end();
  };

  sendChunk();
};

// @desc    Upload test - receives data
// @route   POST /api/speed/upload
const uploadTest = (req, res) => {
  res.json({ success: true, received: req.headers["content-length"] || 0, timestamp: Date.now() });
};

// @desc    Save speed test result
// @route   POST /api/speed/result
const saveResult = async (req, res) => {
  try {
    const {
      downloadSpeed,
      uploadSpeed,
      ping,
      jitter,
      browser,
      os,
      device,
      location,
    } = req.body;

    if (downloadSpeed === undefined || uploadSpeed === undefined || ping === undefined) {
      return res.status(400).json({
        success: false,
        message: "downloadSpeed, uploadSpeed and ping are required",
      });
    }

    const ipAddress = requestIp.getClientIp(req) || "Unknown";

    const result = await SpeedTest.create({
      userId: req.user._id,
      downloadSpeed: parseFloat(downloadSpeed).toFixed(2),
      uploadSpeed: parseFloat(uploadSpeed).toFixed(2),
      ping: parseFloat(ping).toFixed(2),
      jitter: parseFloat(jitter || 0).toFixed(2),
      ipAddress,
      browser: browser || "Unknown",
      os: os || "Unknown",
      device: device || "Unknown",
      location: location || {},
    });

    res.status(201).json({
      success: true,
      message: "Result saved successfully",
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get speed test history
// @route   GET /api/speed/history
const getHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await SpeedTest.countDocuments({ userId: req.user._id });
    const results = await SpeedTest.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      data: results,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get dashboard analytics
// @route   GET /api/speed/dashboard
const getDashboard = async (req, res) => {
  try {
    const results = await SpeedTest.find({ userId: req.user._id }).sort({ createdAt: -1 });
    const total = results.length;

    if (total === 0) {
      return res.json({
        success: true,
        data: {
          totalTests: 0,
          avgDownload: 0,
          avgUpload: 0,
          avgPing: 0,
          bestDownload: 0,
          bestUpload: 0,
          recentTests: [],
          chartData: [],
        },
      });
    }

    const avgDownload = (results.reduce((s, r) => s + r.downloadSpeed, 0) / total).toFixed(2);
    const avgUpload = (results.reduce((s, r) => s + r.uploadSpeed, 0) / total).toFixed(2);
    const avgPing = (results.reduce((s, r) => s + r.ping, 0) / total).toFixed(2);
    const bestDownload = Math.max(...results.map((r) => r.downloadSpeed));
    const bestUpload = Math.max(...results.map((r) => r.uploadSpeed));

    // Last 10 for chart
    const chartData = results
      .slice(0, 10)
      .reverse()
      .map((r) => ({
        date: r.createdAt,
        download: r.downloadSpeed,
        upload: r.uploadSpeed,
        ping: r.ping,
      }));

    res.json({
      success: true,
      data: {
        totalTests: total,
        avgDownload: parseFloat(avgDownload),
        avgUpload: parseFloat(avgUpload),
        avgPing: parseFloat(avgPing),
        bestDownload,
        bestUpload,
        recentTests: results.slice(0, 5),
        chartData,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a specific result
// @route   DELETE /api/speed/result/:id
const deleteResult = async (req, res) => {
  try {
    const result = await SpeedTest.findOne({ _id: req.params.id, userId: req.user._id });
    if (!result) {
      return res.status(404).json({ success: false, message: "Result not found" });
    }
    await result.deleteOne();
    res.json({ success: true, message: "Result deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { pingTest, downloadTest, uploadTest, saveResult, getHistory, getDashboard, deleteResult };
