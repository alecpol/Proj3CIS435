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

  return (
    <div style={{ padding: "1rem 2rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <h1>My Dashboard</h1>
          <p>{user ? `Logged in as ${user.email}` : ""}</p>
        </div>
        <button onClick={logout}>Logout</button>
      </header>

      <section style={{ marginTop: "1rem" }}>
        <button onClick={handleCreatePack}>Create New Flashcard Pack</button>
      </section>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {loading && <p>Loading...</p>}

      {/* Owned Packs */}
      <section style={{ marginTop: "2rem" }}>
        <h2>Owned Packs</h2>
        {ownedPacks.length === 0 ? (
          <p>No owned packs yet.</p>
        ) : (
          ownedPacks.map((pack) => (
            <div
              key={pack._id}
              style={{
                border: "1px solid #ccc",
                padding: "0.5rem",
                marginBottom: "0.5rem"
              }}
            >
              <h3>{pack.title}</h3>
              <p>Visibility: {pack.visibility}</p>
              <p>Owner: You</p>
              <button onClick={() => navigate(`/editor/${pack._id}`)}>
                Edit
              </button>
              <button onClick={() => navigate(`/deck/${pack._id}`)}>
                Deck Mode
              </button>
              <button onClick={() => handleDeletePack(pack._id)}>
                Delete
              </button>
            </div>
          ))
        )}
      </section>

      {/* Saved Packs */}
      <section style={{ marginTop: "2rem" }}>
        <h2>Saved Packs</h2>
        {savedPacks.length === 0 ? (
          <p>No saved packs.</p>
        ) : (
          savedPacks.map((pack) => (
            <div
              key={pack._id}
              style={{
                border: "1px solid #ccc",
                padding: "0.5rem",
                marginBottom: "0.5rem"
              }}
            >
              <h3>{pack.title}</h3>
              <p>Visibility: {pack.visibility}</p>
              <p>Owner: {pack.ownerId}</p>
              <button onClick={() => navigate(`/deck/${pack._id}`)}>
                Deck Mode
              </button>
              <button onClick={() => handleUnsavePack(pack._id)}>
                Unsave
              </button>
            </div>
          ))
        )}
      </section>

      {/* Friends */}
      <section style={{ marginTop: "2rem" }}>
        <h2>Friends</h2>

        {/* Live search with dropdown (by email only) */}
        <div
          style={{
            marginBottom: "1rem",
            position: "relative",
            maxWidth: "400px"
          }}
        >
          <label
            style={{
              display: "block",
              marginBottom: "0.25rem",
              fontWeight: "bold"
            }}
          >
            Search and add friends by email:
          </label>
          <input
            type="email"
            value={friendSearchQuery}
            onChange={handleFriendSearchChange}
            placeholder="Type an email address..."
            style={{
              width: "100%",
              padding: "0.4rem 0.5rem",
              boxSizing: "border-box"
            }}
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
                  backgroundColor: "#fff",
                  border: "1px solid #ccc",
                  borderTop: "none",
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                  maxHeight: "200px",
                  overflowY: "auto"
                }}
              >
                {friendSearchResults.map((u) => (
                  <li
                    key={u._id}
                    onClick={() => handleFriendSuggestionClick(u)}
                    style={{
                      padding: "0.4rem 0.5rem",
                      cursor: "pointer",
                      borderBottom: "1px solid #eee",
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
                      style={{ fontSize: "0.8rem" }}
                      disabled={friendActionLoading}
                      onClick={(e) => handleAddFriendFromSearch(e, u.email)}
                    >
                      Add
                    </button>
                  </li>
                ))}
              </ul>
            )}

          {friendSearchLoading && (
            <div style={{ marginTop: "0.25rem", fontSize: "0.8rem" }}>
              Searching...
            </div>
          )}
          {friendSearchError && (
            <div
              style={{
                marginTop: "0.25rem",
                fontSize: "0.8rem",
                color: "red"
              }}
            >
              {friendSearchError}
            </div>
          )}
        </div>

        {/* Friends list */}
        {friends.length === 0 ? (
          <p>No friends yet.</p>
        ) : (
          friends.map((friend) => (
            <div
              key={friend._id}
              style={{
                border: "1px solid #ccc",
                padding: "0.5rem",
                marginBottom: "0.5rem"
              }}
            >
              <span
                style={{ cursor: "pointer", textDecoration: "underline" }}
                onClick={() => navigate(`/users/${friend._id}`)}
              >
                {friend.email}
              </span>
              <button
                onClick={() => handleRemoveFriend(friend._id)}
                style={{ marginLeft: "0.5rem" }}
                disabled={friendActionLoading}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

export default DashboardPage;
