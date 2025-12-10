// src/api/users.js
import { apiRequest } from "./httpClient";

export async function getMe() {
  return apiRequest("/api/users/me", { method: "GET" });
}

export async function getMyFriends() {
  return apiRequest("/api/users/me/friends", { method: "GET" });
}

export async function addFriendByEmail(friendEmail) {
  return apiRequest("/api/users/me/friends", {
    method: "POST",
    body: JSON.stringify({ friendEmail })
  });
}

export async function removeFriend(friendId) {
  return apiRequest(`/api/users/me/friends/${friendId}`, {
    method: "DELETE"
  });
}

export async function getPublicPacksForUser(userId) {
  return apiRequest(`/api/users/${userId}/public-packs`, {
    method: "GET"
  });
}

export async function searchUsers(query) {
  const q = query.trim();
  if (!q) return [];

  const params = new URLSearchParams({ q });
  return apiRequest(`/api/users/search?${params.toString()}`, {
    method: "GET"
  });
}
