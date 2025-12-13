// src/routes/packRoutes.js
const express = require("express");
const User = require("../models/User");
const { FlashcardPack } = require("../models/FlashcardPack");
const authMiddleware = require("../middleware/authMiddleware");
const VisibilityEnum = require("../utils/visibilityEnum");

function createPackRoutes(io) {
  const router = express.Router();

  // All pack routes require auth
  router.use(authMiddleware);

  const emitPackUpdate = async (packId, eventType) => {
    try {
      const pack = await FlashcardPack.findById(packId).lean();
      if (!pack) return;
      const room = `pack:${packId}`;
      io.to(room).emit("pack-updated", {
        eventType,
        pack,
      });
    } catch (err) {
      console.error("emitPackUpdate error:", err);
    }
  };

  // GET /api/packs/mine
  router.get("/mine", async (req, res) => {
    try {
      const packs = await FlashcardPack.find({ ownerId: req.userId }).lean();
      res.json(packs);
    } catch (err) {
      console.error("Get /mine error:", err);
      res.status(500).json({ message: "Server error" });
    }
  });

  // GET /api/packs/saved
  router.get("/saved", async (req, res) => {
    try {
      const user = await User.findById(req.userId)
        .populate({
          path: "savedPackIds",
          populate: { path: "ownerId", select: "email" },
        })
        .lean();

      if (!user) return res.status(404).json({ message: "User not found" });

      const packs = (user.savedPackIds || []).map((pack) => {
        const ownerEmail = pack.ownerId?.email || "";
        const ownerId = pack.ownerId?._id || pack.ownerId;

        return {
          ...pack,
          ownerId,
          owner: ownerEmail ? { _id: ownerId, email: ownerEmail } : null,
          ownerEmail,
        };
      });

      res.json(packs);
    } catch (err) {
      console.error("Get /saved error:", err);
      res.status(500).json({ message: "Server error" });
    }
  });

  // POST /api/packs
  router.post("/", async (req, res) => {
    try {
      const { title, description, visibility } = req.body;

      const pack = new FlashcardPack({
        ownerId: req.userId,
        title,
        description,
        visibility: visibility || VisibilityEnum.PRIVATE,
        cards: [],
        // align with model field name
        subscriberIds: [],
      });

      await pack.save();

      await User.findByIdAndUpdate(req.userId, {
        $addToSet: { ownedPackIds: pack._id },
      });

      res.status(201).json(pack);
    } catch (err) {
      console.error("Create pack error:", err);
      res.status(500).json({ message: "Server error" });
    }
  });

  // GET /api/packs/:packId
  router.get("/:packId", async (req, res) => {
    try {
      const pack = await FlashcardPack.findById(req.params.packId).lean();
      if (!pack) return res.status(404).json({ message: "Pack not found" });

      // If private and not owner, forbid
      if (
        pack.visibility === VisibilityEnum.PRIVATE &&
        pack.ownerId.toString() !== req.userId
      ) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(pack);
    } catch (err) {
      console.error("Get pack error:", err);
      res.status(500).json({ message: "Server error" });
    }
  });

  // PATCH /api/packs/:packId  (update meta: title / description)
  router.patch("/:packId", async (req, res) => {
    try {
      const { packId } = req.params;
      const { title, description } = req.body;

      const pack = await FlashcardPack.findById(packId);
      if (!pack) return res.status(404).json({ message: "Pack not found" });

      if (pack.ownerId.toString() !== req.userId) {
        return res
          .status(403)
          .json({ message: "Only owner can update pack details" });
      }

      if (typeof title === "string" && title.trim().length > 0) {
        pack.title = title.trim();
      }

      if (typeof description === "string") {
        pack.description = description;
      }

      await pack.save();

      await emitPackUpdate(packId, "meta-updated");

      res.json(pack.toObject());
    } catch (err) {
      console.error("Update pack meta error:", err);
      res.status(500).json({ message: "Server error" });
    }
  });

  // PATCH /api/packs/:packId/cards
  router.patch("/:packId/cards", async (req, res) => {
    try {
      const { packId } = req.params;
      const { cards } = req.body;

      const pack = await FlashcardPack.findById(packId);
      if (!pack) return res.status(404).json({ message: "Pack not found" });

      if (pack.ownerId.toString() !== req.userId) {
        return res.status(403).json({ message: "Only owner can edit cards" });
      }

      if (Array.isArray(cards) && cards.length > 64) {
        return res
          .status(400)
          .json({ message: "Cannot have more than 64 cards" });
      }

      pack.cards = cards || [];
      await pack.save();

      await emitPackUpdate(packId, "cards-updated");

      res.json(pack.toObject());
    } catch (err) {
      console.error("Update cards error:", err);
      res.status(500).json({ message: "Server error" });
    }
  });

  // PATCH /api/packs/:packId/visibility
  router.patch("/:packId/visibility", async (req, res) => {
    try {
      const { packId } = req.params;
      const { visibility } = req.body;

      if (!Object.values(VisibilityEnum).includes(visibility)) {
        return res.status(400).json({ message: "Invalid visibility value" });
      }

      const pack = await FlashcardPack.findById(packId);
      if (!pack) return res.status(404).json({ message: "Pack not found" });

      if (pack.ownerId.toString() !== req.userId) {
        return res
          .status(403)
          .json({ message: "Only owner can change visibility" });
      }

      // Delegate PUBLIC -> PRIVATE cleanup to the model helper
      const updatedPack = await pack.changeVisibilityAndDetach(visibility, User);

      await emitPackUpdate(packId, "visibility-changed");

      res.json(updatedPack.toObject());
    } catch (err) {
      console.error("Update visibility error:", err);
      res.status(500).json({ message: "Server error" });
    }
  });

  // POST /api/packs/:packId/save
  router.post("/:packId/save", async (req, res) => {
    try {
      const { packId } = req.params;
      const pack = await FlashcardPack.findById(packId);
      if (!pack) return res.status(404).json({ message: "Pack not found" });

      if (pack.visibility !== VisibilityEnum.PUBLIC) {
        return res
          .status(403)
          .json({ message: "Cannot save a non-public pack" });
      }

      // Add to user's saved list
      await User.findByIdAndUpdate(req.userId, {
        $addToSet: { savedPackIds: pack._id },
      });

      // Track subscriber on the pack (align with model field name)
      await FlashcardPack.findByIdAndUpdate(pack._id, {
        $addToSet: { subscriberIds: req.userId },
      });

      res.status(201).json({ message: "Pack saved" });
    } catch (err) {
      console.error("Save pack error:", err);
      res.status(500).json({ message: "Server error" });
    }
  });

  // DELETE /api/packs/:packId/save
  router.delete("/:packId/save", async (req, res) => {
    try {
      const { packId } = req.params;

      await User.findByIdAndUpdate(req.userId, {
        $pull: { savedPackIds: packId },
      });

      await FlashcardPack.findByIdAndUpdate(packId, {
        $pull: { subscriberIds: req.userId },
      });

      res.json({ message: "Pack unsaved" });
    } catch (err) {
      console.error("Unsave pack error:", err);
      res.status(500).json({ message: "Server error" });
    }
  });

  // DELETE /api/packs/:packId
  router.delete("/:packId", async (req, res) => {
    try {
      const { packId } = req.params;
      const pack = await FlashcardPack.findById(packId);

      if (!pack) return res.status(404).json({ message: "Pack not found" });

      if (pack.ownerId.toString() !== req.userId) {
        return res.status(403).json({ message: "Only owner can delete" });
      }

      // Remove pack from saved lists of all users
      await User.updateMany(
        { savedPackIds: packId },
        { $pull: { savedPackIds: packId } }
      );

      // Remove from owner's ownedPacks
      await User.findByIdAndUpdate(req.userId, {
        $pull: { ownedPackIds: packId },
      });

      // Delete the pack itself
      await FlashcardPack.deleteOne({ _id: packId });

      await emitPackUpdate(packId, "deleted");

      res.json({ message: "Pack deleted" });
    } catch (err) {
      console.error("Delete pack error:", err);
      res.status(500).json({ message: "Server error" });
    }
  });

  return router;
}

module.exports = createPackRoutes;
