// src/pages/FriendProfilePage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPublicPacksForUser } from "../api/users";
import { savePack } from "../api/packs";

function FriendProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [owner, setOwner] = useState(null);
  const [packs, setPacks] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingPackId, setSavingPackId] = useState(null);

  async function loadProfile() {
    setError("");
    setLoading(true);
    try {
      const data = await getPublicPacksForUser(userId);
      setOwner(data.owner);
      setPacks(data.packs || []);
    } catch (err) {
      setError(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, [userId]);

  async function handleSavePack(packId) {
    setSavingPackId(packId);
    setError("");
    try {
      await savePack(packId);
      // No need to reload entire profile; saved packs will appear in dashboard
      alert("Pack saved to your Saved Packs.");
    } catch (err) {
      setError(err.message || "Failed to save pack");
    } finally {
      setSavingPackId(null);
    }
  }

  if (loading && !owner) {
    return (
      <div style={{ padding: "1rem" }}>
        <button onClick={() => navigate("/dashboard")}>Back</button>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (error && !owner) {
    return (
      <div style={{ padding: "1rem" }}>
        <button onClick={() => navigate("/dashboard")}>Back</button>
        <p style={{ color: "red" }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem" }}>
      <button onClick={() => navigate("/dashboard")}>Back</button>

      <h1>Friend Profile</h1>
      {owner && <p>User: {owner.email}</p>}

      {error && <p style={{ color: "red" }}>{error}</p>}

      <section style={{ marginTop: "1rem" }}>
        <h2>Public Flashcard Packs</h2>
        {packs.length === 0 ? (
          <p>No public packs for this user.</p>
        ) : (
          packs.map((pack) => (
            <div
              key={pack._id}
              style={{
                border: "1px solid #ccc",
                padding: "0.5rem",
                marginBottom: "0.5rem"
              }}
            >
              <h3>{pack.title}</h3>
              <p>{pack.description}</p>
              <p>Visibility: {pack.visibility}</p>
              <p>Owner: {owner ? owner.email : pack.ownerId}</p>
              <button onClick={() => navigate(`/deck/${pack._id}`)}>
                Deck Mode
              </button>
              <button
                onClick={() => handleSavePack(pack._id)}
                disabled={savingPackId === pack._id}
                style={{ marginLeft: "0.5rem" }}
              >
                {savingPackId === pack._id ? "Saving..." : "Save Pack"}
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

export default FriendProfilePage;
