import { apiRequest } from "./httpClient";

export async function getOwnedPacks() {
  return apiRequest("/api/packs/mine", { method: "GET" });
}

export async function getSavedPacks() {
  return apiRequest("/api/packs/saved", { method: "GET" });
}

export async function createPack({ title, description, visibility }) {
  return apiRequest("/api/packs", {
    method: "POST",
    body: JSON.stringify({ title, description, visibility })
  });
}

export async function getPack(packId) {
  return apiRequest(`/api/packs/${packId}`, { method: "GET" });
}

export async function savePack(packId) {
  return apiRequest(`/api/packs/${packId}/save`, { method: "POST" });
}

export async function unsavePack(packId) {
  return apiRequest(`/api/packs/${packId}/save`, { method: "DELETE" });
}

export async function updatePackVisibility(packId, visibility) {
  return apiRequest(`/api/packs/${packId}/visibility`, {
    method: "PATCH",
    body: JSON.stringify({ visibility })
  });
}

export async function updatePackCards(packId, cards) {
  return apiRequest(`/api/packs/${packId}/cards`, {
    method: "PATCH",
    body: JSON.stringify({ cards })
  });
}

// NEW: update pack title/description
export async function updatePackMeta(packId, meta) {
  // meta can be { title } or { title, description }
  return apiRequest(`/api/packs/${packId}`, {
    method: "PATCH",
    body: JSON.stringify(meta)
  });
}


export async function deletePack(packId) {
  return apiRequest(`/api/packs/${packId}`, { method: "DELETE" });
}
