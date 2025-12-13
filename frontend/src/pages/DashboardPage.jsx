// src/pages/DashboardPage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getOwnedPacks,
  getSavedPacks,
  createPack,
  deletePack,
  unsavePack
} from "../api/packs";
import {
  getMyFriends,
  addFriendByEmail,
  removeFriend,
  searchUsers
} from "../api/users";
import { useAuth } from "../context/AuthContext";
import VisibilityEnum from "../utils/visibilityEnum";

function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [ownedPacks, setOwnedPacks] = useState([]);
  const [savedPacks, setSavedPacks] = useState([]);
  const [friends, setFriends] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Friend actions (add/remove)
  const [friendActionLoading, setFriendActionLoading] = useState(false);

  // Live friend search (by email only)
  const [friendSearchQuery, setFriendSearchQuery] = useState("");
  const [friendSearchResults, setFriendSearchResults] = useState([]);
  const [friendSearchLoading, setFriendSearchLoading] = useState(false);
  const [friendSearchError, setFriendSearchError] = useState("");

  async function loadData() {
    setError("");
    setLoading(true);
    try {
      const [owned, saved, friendsList] = await Promise.all([
        getOwnedPacks(),
        getSavedPacks(),
        getMyFriends()
      ]);

      setOwnedPacks(owned);
      setSavedPacks(saved);
      setFriends(friendsList);
    } catch (err) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreatePack() {
    try {
      const pack = await createPack({
        title: "New Flashcard Pack",
        description: "",
        visibility: VisibilityEnum.PRIVATE
      });
      navigate(`/editor/${pack._id}`);
    } catch (err) {
      setError(err.message || "Failed to create pack");
    }
  }

  async function handleDeletePack(packId) {
    if (!window.confirm("Delete this pack?")) return;
    try {
      await deletePack(packId);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to delete pack");
    }
  }

  async function handleUnsavePack(packId) {
    try {
      await unsavePack(packId);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to unsave pack");
    }
  }

  async function handleRemoveFriend(friendId) {
    if (!window.confirm("Remove this friend?")) return;
    setFriendActionLoading(true);
    setError("");
    try {
      await removeFriend(friendId);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to remove friend");
    } finally {
      setFriendActionLoading(false);
    }
  }

  // Live search: by email only (backend enforces that)
  async function handleFriendSearchChange(e) {
    const value = e.target.value;
    setFriendSearchQuery(value);
    setFriendSearchError("");

    if (!value.trim()) {
      setFriendSearchResults([]);
      return;
    }

    try {
      setFriendSearchLoading(true);
      const results = await searchUsers(value.trim());
      // Show at most 5 in dropdown
      setFriendSearchResults(results.slice(0, 5));
    } catch (err) {
      console.error("Friend search error:", err);
      setFriendSearchError(err.message || "Failed to search users");
      setFriendSearchResults([]);
    } finally {
      setFriendSearchLoading(false);
    }
  }

  // Click on suggestion: go to that user's profile (optional)
  function handleFriendSuggestionClick(userObj) {
    navigate(`/users/${userObj._id}`);
  }

  // Add friend directly from suggestion (by email)
  async function handleAddFriendFromSearch(e, email) {
    e.stopPropagation(); // avoid triggering suggestion click
    if (!email) return;

    setFriendActionLoading(true);
    setError("");
    try {
      await addFriendByEmail(email);
      await loadData();
      // Optionally clear search:
      // setFriendSearchQuery("");
      // setFriendSearchResults([]);
    } catch (err) {
      setError(err.message || "Failed to add friend");
    } finally {
      setFriendActionLoading(false);
    }
  }

  const renderOwner = (pack) => {
    const ownerEmail =
      pack.owner?.email || pack.ownerId?.email || pack.ownerEmail || "";
    if (ownerEmail) return ownerEmail;
    if (typeof pack.ownerId === "string") return pack.ownerId;
    return "Unknown";
  };

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <h1 className="page-title">My Dashboard</h1>
          <p className="subtitle">
            {user ? `Logged in as ${user.email}` : "Welcome back!"}
          </p>
        </div>
        <button className="btn secondary" onClick={logout}>
          Logout
        </button>
      </header>

      <div className="section-card" style={{ textAlign: "center" }}>
        <p className="helper-text">
          Build and explore colorful flashcard packs. Create, practice, and share
          with friends.
        </p>
        <div className="button-row" style={{ marginTop: "0.5rem" }}>
          <button className="btn" onClick={handleCreatePack}>
            Create New Flashcard Pack
          </button>
        </div>
      </div>

      {error && <p className="notice">{error}</p>}
      {loading && <p className="helper-text">Loading...</p>}

      {/* Owned Packs */}
      <section className="section-card">
        <h2>Owned Packs</h2>
        {ownedPacks.length === 0 ? (
          <p className="helper-text">No owned packs yet.</p>
        ) : (
          <div className="grid">
            {ownedPacks.map((pack) => (
              <div className="tile" key={pack._id}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <h3 style={{ margin: 0 }}>{pack.title}</h3>
                  <span className="tag">{pack.visibility}</span>
                </div>
                <p className="helper-text" style={{ marginTop: "0.25rem" }}>
                  Owner: You
                </p>
                <div className="button-row" style={{ marginTop: "0.75rem" }}>
                  <button
                    className="btn secondary"
                    onClick={() => navigate(`/editor/${pack._id}`)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn secondary"
                    onClick={() => navigate(`/deck/${pack._id}`)}
                  >
                    Deck Mode
                  </button>
                  <button
                    className="btn secondary"
                    onClick={() => handleDeletePack(pack._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Saved Packs */}
      <section className="section-card">
        <h2>Saved Packs</h2>
        {savedPacks.length === 0 ? (
          <p className="helper-text">No saved packs.</p>
        ) : (
          <div className="grid">
            {savedPacks.map((pack) => (
              <div className="tile" key={pack._id}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <h3 style={{ margin: 0 }}>{pack.title}</h3>
                  <span className="tag">{pack.visibility}</span>
                </div>
                <p className="helper-text" style={{ marginTop: "0.25rem" }}>
                  Owner: {renderOwner(pack)}
                </p>
                <div className="button-row" style={{ marginTop: "0.75rem" }}>
                  <button
                    className="btn secondary"
                    onClick={() => navigate(`/deck/${pack._id}`)}
                  >
                    Deck Mode
                  </button>
                  <button
                    className="btn secondary"
                    onClick={() => handleUnsavePack(pack._id)}
                  >
                    Unsave
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Friends */}
      <section className="section-card">
        <h2>Friends</h2>

        {/* Live search with dropdown (by email only) */}
        <div style={{ width: "100%", position: "relative", maxWidth: 520 }}>
          <label className="label">Search and add friends by email:</label>
          <input
            type="email"
            value={friendSearchQuery}
            onChange={handleFriendSearchChange}
            placeholder="Type an email address..."
          />

          {friendSearchQuery.trim().length > 0 &&
            friendSearchResults.length > 0 && (
              <ul
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 10,
                  backgroundColor: "#0b1221",
                  border: "1px solid rgba(148, 163, 184, 0.4)",
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                  maxHeight: "200px",
                  overflowY: "auto",
                  borderRadius: "0 0 12px 12px"
                }}
              >
                {friendSearchResults.map((u) => (
                  <li
                    key={u._id}
                    onClick={() => handleFriendSuggestionClick(u)}
                    style={{
                      padding: "0.55rem 0.7rem",
                      cursor: "pointer",
                      borderBottom: "1px solid rgba(148, 163, 184, 0.3)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "0.5rem"
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: "bold" }}>{u.email}</div>
                    </div>
                    <button
                      type="button"
                      className="btn secondary"
                      disabled={friendActionLoading}
                      onClick={(e) => handleAddFriendFromSearch(e, u.email)}
                      style={{ padding: "0.4rem 0.7rem" }}
                    >
                      Add
                    </button>
                  </li>
                ))}
              </ul>
            )}

          {friendSearchLoading && (
            <div className="helper-text" style={{ marginTop: "0.25rem" }}>
              Searching...
            </div>
          )}
          {friendSearchError && (
            <div className="notice" style={{ marginTop: "0.25rem" }}>
              {friendSearchError}
            </div>
          )}
        </div>

        {/* Friends list */}
        {friends.length === 0 ? (
          <p className="helper-text">No friends yet.</p>
        ) : (
          <div className="grid" style={{ marginTop: "1rem" }}>
            {friends.map((friend) => (
              <div className="tile" key={friend._id}>
                <div
                  style={{ cursor: "pointer", textDecoration: "underline" }}
                  onClick={() => navigate(`/users/${friend._id}`)}
                >
                  {friend.email}
                </div>
                <div className="button-row" style={{ marginTop: "0.75rem" }}>
                  <button
                    className="btn secondary"
                    onClick={() => handleRemoveFriend(friend._id)}
                    disabled={friendActionLoading}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default DashboardPage;
