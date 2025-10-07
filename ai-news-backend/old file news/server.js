require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());
app.use(cors());

const API_KEY = process.env.NEWS_API_KEY;
const BASE_URL = "https://newsapi.org/v2/top-headlines";

// In-memory storage (replace with DB later)
let tempOTP = null;
let userProfile = null;

// Step 1: Login → generate OTP
app.post("/login", (req, res) => {
  const { email } = req.body;
  tempOTP = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  console.log(`📩 OTP for ${email}: ${tempOTP}`); // In real app: send via email/SMS
  res.json({ message: "OTP sent (check terminal for now)" });
});

// Step 2: Verify OTP
app.post("/verify-otp", (req, res) => {
  const { otp } = req.body;
  if (otp === tempOTP) {
    res.json({ success: true, message: "OTP Verified! Proceed to profile." });
  } else {
    res.json({ success: false, message: "Invalid OTP" });
  }
});

// Step 3: Save user profile + preferences
app.post("/profile", (req, res) => {
  const { name, profession, gender, age, preferences } = req.body;
  userProfile = { name, profession, gender, age, preferences };
  res.json({ success: true, message: "Profile saved successfully!", userProfile });
});

// Step 4: Get personalized news
app.get("/news", async (req, res) => {
  if (!userProfile) return res.json({ error: "No profile set" });

  let allArticles = [];

  for (let category of userProfile.preferences) {
    try {
      const response = await axios.get(BASE_URL, {
        params: { country: "us", category, pageSize: 5, apiKey: API_KEY },
      });
      allArticles.push({ category, articles: response.data.articles });
    } catch (err) {
      console.error(`Error fetching ${category}:`, err.message);
    }
  }

  res.json({ user: userProfile, news: allArticles });
});

// Start server
app.listen(5000, () => console.log("🚀 Server running at http://localhost:5000"));
