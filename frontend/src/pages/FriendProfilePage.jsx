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
      <div className="page-shell" style={{ alignItems: "flex-start" }}>
        <button className="btn secondary" onClick={() => navigate("/dashboard")}>
          Back
        </button>
        <p className="helper-text">Loading profile...</p>
      </div>
    );
  }

  if (error && !owner) {
    return (
      <div className="page-shell" style={{ alignItems: "flex-start" }}>
        <button className="btn secondary" onClick={() => navigate("/dashboard")}>
          Back
        </button>
        <p className="notice">{error}</p>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <h1 className="page-title">Friend Profile</h1>
          {owner && <p className="subtitle">User: {owner.email}</p>}
        </div>
        <button className="btn secondary" onClick={() => navigate("/dashboard")}>
          Back
        </button>
      </header>

      {error && <p className="notice">{error}</p>}

      <section className="section-card">
        <h2 style={{ marginTop: 0 }}>Public Flashcard Packs</h2>
        {packs.length === 0 ? (
          <p className="helper-text">No public packs for this user.</p>
        ) : (
          <div className="grid">
            {packs.map((pack) => (
              <div className="tile" key={pack._id}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <h3 style={{ margin: 0 }}>{pack.title}</h3>
                  <span className="tag">{pack.visibility}</span>
                </div>
                <p className="helper-text" style={{ marginTop: "0.35rem" }}>
                  Owner: {owner ? owner.email : pack.ownerId}
                </p>
                <p className="helper-text" style={{ marginTop: "0.35rem" }}>
                  {pack.description}
                </p>
                <div className="button-row" style={{ marginTop: "0.75rem" }}>
                  <button
                    className="btn secondary"
                    onClick={() => navigate(`/deck/${pack._id}`)}
                  >
                    Deck Mode
                  </button>
                  <button
                    className="btn"
                    onClick={() => handleSavePack(pack._id)}
                    disabled={savingPackId === pack._id}
                  >
                    {savingPackId === pack._id ? "Saving..." : "Save Pack"}
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

export default FriendProfilePage;
