require("dotenv").config();
const express = require("express");
const router = express.Router();
const axios = require("axios");
const Repo = require("../schemas/Repo");
const schedule = require("node-schedule");

// Fetch repos from GitHub and write them to a MongoDB collection
const getReposAndWrite = async () => {
  await axios
    .get("https://api.github.com/users/PiotrRut/repos?sort=created", {
      headers: {
        Authorization: process.env.GITHUB_API_TOKEN,
      },
    })
    .then((res) => res.data.filter((r) => r.name !== "PiotrRut"))
    .then((res) => {
      for (let repo in res) {
        Repo.findOneAndUpdate(
          {
            name: res[repo].name,
          },
          {
            name: res[repo].name,
            description: res[repo].description,
            url: res[repo].html_url,
            language: res[repo].language,
            stars: res[repo].stargazers_count,
            forks: res[repo].forks,
            created: res[repo].created_at,
          },
          { upsert: true }
        ).exec();
      }
    });
};

// Run the function every 15 mins (4 times an hour)
schedule.scheduleJob("*/15 * * * *", () => {
  getReposAndWrite();
});

/**
 * Wrapper endpoint for the GitHub API to be used on my website
 * in order to go around the rate limit
 * (as this request is authenticated)
 */
router.get("/github/repos", async (_req, res) => {
  try {
    Repo.find({})
      .sort({ created: -1 })
      .exec()
      .then((repos) => res.status(200).send(repos));
  } catch (err) {
    res.status(400).send(err);
  }
});

module.exports = router;
