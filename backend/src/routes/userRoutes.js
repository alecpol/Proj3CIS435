// src/routes/userRoutes.js
const express = require("express");
const User = require("../models/User");
const { FlashcardPack } = require("../models/FlashcardPack");
const authMiddleware = require("../middleware/authMiddleware");
const VisibilityEnum = require("../utils/visibilityEnum");

const router = express.Router();

// All user routes require auth
router.use(authMiddleware);

/**
 * GET /api/users/me
 * Basic profile info for current user.
 */
router.get("/me", async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select("_id email ownedPackIds savedPackIds friendIds")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Get /me error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/users/me/friends
 * Returns friend list with emails.
 */
router.get("/me/friends", async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate("friendIds", "_id email")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const friends = (user.friendIds || []).map((f) => ({
      _id: f._id,
      email: f.email
    }));

    res.json(friends);
  } catch (err) {
    console.error("Get friends error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/users/me/friends
 * Body: { friendEmail }
 * Adds a friend by their email.
 */
router.post("/me/friends", async (req, res) => {
  try {
    const { friendEmail } = req.body;

    if (!friendEmail) {
      return res.status(400).json({ message: "friendEmail is required" });
    }

    const me = await User.findById(req.userId);
    if (!me) {
      return res.status(404).json({ message: "User not found" });
    }

    const friend = await User.findOne({ email: friendEmail });
    if (!friend) {
      return res
        .status(404)
        .json({ message: "No user found with that email" });
    }

    if (friend._id.toString() === me._id.toString()) {
      return res
        .status(400)
        .json({ message: "You cannot add yourself as a friend" });
    }

    // Add each other as friends (mutual friendship)
    await User.findByIdAndUpdate(me._id, {
      $addToSet: { friendIds: friend._id }
    });
    await User.findByIdAndUpdate(friend._id, {
      $addToSet: { friendIds: me._id }
    });

    res.status(201).json({
      message: "Friend added",
      friend: { _id: friend._id, email: friend.email }
    });
  } catch (err) {
    console.error("Add friend error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * DELETE /api/users/me/friends/:friendId
 * Removes friendship (both sides).
 */
router.delete("/me/friends/:friendId", async (req, res) => {
  try {
    const friendId = req.params.friendId;

    await User.findByIdAndUpdate(req.userId, {
      $pull: { friendIds: friendId }
    });

    await User.findByIdAndUpdate(friendId, {
      $pull: { friendIds: req.userId }
    });

    res.json({ message: "Friend removed" });
  } catch (err) {
    console.error("Remove friend error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/users/search?q=...
 * Search users by email only, excluding self.
 * (Important: this route must be defined BEFORE parameterized routes.)
 */
router.get("/search", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();

    if (!q) {
      return res.json([]);
    }

    const regex = new RegExp(q, "i");

    const users = await User.find({
      _id: { $ne: req.userId }, // exclude self
      email: { $regex: regex }
    })
      .select("_id email")
      .limit(10)
      .lean();

    res.json(users);
  } catch (err) {
    console.error("User search error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/users/:userId/public-packs
 * Returns PUBLIC packs for the specified user (for friend profile).
 */
router.get("/:userId/public-packs", async (req, res) => {
  try {
    const { userId } = req.params;

    // Ensure user exists (optional, but nicer errors)
    const owner = await User.findById(userId).select("_id email");
    if (!owner) {
      return res.status(404).json({ message: "User not found" });
    }

    const packs = await FlashcardPack.find({
      ownerId: userId,
      visibility: VisibilityEnum.PUBLIC
    }).lean();

    res.json({
      owner: { _id: owner._id, email: owner.email },
      packs
    });
  } catch (err) {
    console.error("Get user public packs error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
