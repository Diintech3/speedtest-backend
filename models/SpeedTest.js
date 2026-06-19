const mongoose = require("mongoose");

const speedTestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    downloadSpeed: {
      type: Number,
      required: true,
      min: 0,
    },
    uploadSpeed: {
      type: Number,
      required: true,
      min: 0,
    },
    ping: {
      type: Number,
      required: true,
      min: 0,
    },
    jitter: {
      type: Number,
      default: 0,
    },
    ipAddress: {
      type: String,
      default: "Unknown",
    },
    isp: {
      type: String,
      default: "Unknown",
    },
    browser: {
      type: String,
      default: "Unknown",
    },
    os: {
      type: String,
      default: "Unknown",
    },
    device: {
      type: String,
      enum: ["Desktop", "Mobile", "Tablet", "Unknown"],
      default: "Unknown",
    },
    location: {
      country: { type: String, default: "Unknown" },
      city: { type: String, default: "Unknown" },
    },
    rating: {
      type: String,
      enum: ["Excellent", "Good", "Average", "Poor"],
      default: "Average",
    },
  },
  { timestamps: true }
);

// Auto-calculate rating before saving
speedTestSchema.pre("save", function (next) {
  const dl = this.downloadSpeed;
  if (dl >= 100) this.rating = "Excellent";
  else if (dl >= 25) this.rating = "Good";
  else if (dl >= 5) this.rating = "Average";
  else this.rating = "Poor";
  next();
});

module.exports = mongoose.model("SpeedTest", speedTestSchema);
