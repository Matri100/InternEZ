// Dev default — point this at the real deployed origin once InternEZ is
// hosted somewhere other than localhost (and update host_permissions in
// manifest.json to match, or Chrome will block the fetch).
const API_BASE = "http://localhost:4000/api";

const connectView = document.getElementById("connect-view");
const readyView = document.getElementById("ready-view");
const tokenInput = document.getElementById("token-input");
const connectBtn = document.getElementById("connect-btn");
const connectError = document.getElementById("connect-error");
const fillBtn = document.getElementById("fill-btn");
const disconnectBtn = document.getElementById("disconnect-btn");
const statusEl = document.getElementById("status");

async function getStoredToken() {
  const { internezToken } = await chrome.storage.local.get("internezToken");
  return internezToken || null;
}

async function render() {
  const token = await getStoredToken();
  connectView.hidden = Boolean(token);
  readyView.hidden = !token;
}

connectBtn.addEventListener("click", async () => {
  const token = tokenInput.value.trim();
  connectError.textContent = "";
  if (!token) return;
  connectBtn.disabled = true;
  try {
    const res = await fetch(`${API_BASE}/autofill/${token}`);
    if (!res.ok) throw new Error("That code doesn't look right — check it and try again.");
    await chrome.storage.local.set({ internezToken: token });
    tokenInput.value = "";
    await render();
  } catch (e) {
    connectError.textContent = e.message || "Couldn't connect — try again.";
  } finally {
    connectBtn.disabled = false;
  }
});

disconnectBtn.addEventListener("click", async () => {
  await chrome.storage.local.remove("internezToken");
  statusEl.textContent = "";
  await render();
});

fillBtn.addEventListener("click", async () => {
  statusEl.textContent = "Filling…";
  fillBtn.disabled = true;
  try {
    const token = await getStoredToken();
    const res = await fetch(`${API_BASE}/autofill/${token}`);
    if (!res.ok) throw new Error("Couldn't load your profile — try reconnecting.");
    const profile = await res.json();

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["src/fieldMatcher.js", "src/content.js"] });
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (p) => window.__internezFillForm(p),
      args: [profile],
    });

    statusEl.textContent =
      result.filledCount > 0
        ? `Envoy filled ${result.filledCount} of ${result.totalFields} field${result.totalFields === 1 ? "" : "s"} it recognized. Review before you submit.`
        : "Envoy didn't recognize any fields on this page.";
  } catch (e) {
    statusEl.textContent = e.message || "Something went wrong.";
  } finally {
    fillBtn.disabled = false;
  }
});

render();
