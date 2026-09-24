// ==UserScript==
// @name         Expat Jobs Detail Scraper
// @namespace    https://www.expatriates.com/
// @match        https://www.expatriates.com/classifieds/jobs/*
// @match        https://www.expatriates.com/cls/*.html
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  const STORAGE_KEY = "expat-detail-scraper-state-v1";
  const PANEL_ID = "expat-detail-scraper-panel";
  const WAIT_AFTER_LOAD_MS = 2500;

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch (error) {
      return null;
    }
  }

  function writeState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function downloadJson(filename, value) {
    const blob = new Blob([JSON.stringify(value, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function getInfo(label) {
    const item = Array.from(document.querySelectorAll(".post-info li")).find(
      (candidate) =>
        candidate.querySelector("strong")?.textContent.trim() === label,
    );
    if (!item) return null;
    const strong = item.querySelector("strong");
    return item.textContent.replace(strong.textContent, "").trim() || null;
  }

  function getDescription() {
    const content =
      document.querySelector(".post-body") ||
      document.querySelector(".posting-main-content");
    if (!content) return null;

    const clone = content.cloneNode(true);
    clone
      .querySelectorAll("script, style, iframe, ins, .exp-ads")
      .forEach((node) => node.remove());
    return clone.innerText.trim() || null;
  }

  function scrapeCurrentPage() {
    const title = document.querySelector("h1")?.textContent.trim() || null;
    const canonicalUrl =
      document.querySelector('link[rel="canonical"]')?.href || location.href;
    const whatsapp = document.querySelector('a[href*="wa.me/"]')?.href || null;
    const email =
      document
        .querySelector('a[href^="mailto:"]')
        ?.href.replace(/^mailto:/, "") || null;
    const images = Array.from(
      document.querySelectorAll(".posting-images img, .post-body img"),
    )
      .map((image) => image.src)
      .filter(Boolean);

    return {
      url: location.href,
      canonicalUrl,
      postingId: getInfo("Posting ID:"),
      title,
      description: getDescription(),
      postedBy: getInfo("Posted by:"),
      memberSince: getInfo("Member since:"),
      posted: getInfo("Posted:"),
      category: getInfo("Category:"),
      region: getInfo("Region:"),
      email,
      whatsapp,
      images: [...new Set(images)],
      scrapedAt: new Date().toISOString(),
    };
  }

  function normalizeUrl(url) {
    return new URL(url, location.origin).href.replace(/\/$/, "");
  }

  function isDetailUrl(url) {
    return /^https:\/\/www\.expatriates\.com\/cls\/\d+\.html$/.test(
      normalizeUrl(url),
    );
  }

  function setStatus(text) {
    const status = document.querySelector("#expat-detail-scraper-status");
    if (status) status.textContent = text;
  }

  function finish(state) {
    state.running = false;
    writeState(state);
    downloadJson("expat-jobs-details.json", state.results);
    downloadJson("expat-jobs-failed.json", state.failures);
    setStatus(
      `Finished: ${state.results.length} scraped, ${state.failures.length} failed`,
    );
  }

  function goToNext(state) {
    state.index += 1;
    writeState(state);

    if (state.index >= state.urls.length) {
      finish(state);
      return;
    }

    setStatus(`Opening ${state.index + 1} of ${state.urls.length}...`);
    setTimeout(() => {
      window.location.href = state.urls[state.index];
    }, WAIT_AFTER_LOAD_MS);
  }

  function processDetailPage() {
    const state = readState();
    if (!state?.running || !Array.isArray(state.urls)) return;

    const expectedUrl = normalizeUrl(state.urls[state.index]);
    const currentUrl = normalizeUrl(location.href);
    if (expectedUrl !== currentUrl) {
      setStatus("Paused: current page is not the expected job URL");
      return;
    }

    setStatus(`Scraping ${state.index + 1} of ${state.urls.length}...`);
    try {
      state.results.push(scrapeCurrentPage());
    } catch (error) {
      state.failures.push({
        url: location.href,
        error: error.message,
        failedAt: new Date().toISOString(),
      });
    }

    goToNext(state);
  }

  function createButton(text, color) {
    const button = document.createElement("button");
    button.textContent = text;
    button.style.cssText = [
      "padding:8px 10px",
      "border:none",
      "border-radius:6px",
      `background:${color}`,
      "color:white",
      "cursor:pointer",
      "margin:0 6px 6px 0",
    ].join(";");
    return button;
  }

  function addControlPanel() {
    if (document.getElementById(PANEL_ID) || !document.body) return;

    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.style.cssText = [
      "position:fixed",
      "top:16px",
      "left:16px",
      "z-index:999999",
      "background:#111827",
      "color:#f9fafb",
      "padding:12px",
      "border-radius:10px",
      "font:13px Arial,sans-serif",
      "max-width:360px",
      "box-shadow:0 12px 30px rgba(0,0,0,0.25)",
    ].join(";");

    const heading = document.createElement("div");
    heading.textContent = "Detail-page scraper";
    heading.style.cssText = "font-weight:700;margin-bottom:8px;";

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json,application/json";
    fileInput.style.cssText = "display:block;max-width:100%;margin-bottom:8px;";

    const startButton = createButton("Start / resume", "#2563eb");
    const resultsButton = createButton("Download saved results", "#059669");
    const resetButton = createButton("Reset progress", "#dc2626");
    const status = document.createElement("div");
    status.id = "expat-detail-scraper-status";
    status.style.cssText = "font-size:11px;color:#d1d5db;margin-top:4px;";

    startButton.onclick = () => {
      const file = fileInput.files[0];
      const existing = readState();
      if (existing?.running) {
        setStatus(
          `Already running at ${existing.index + 1} of ${existing.urls.length}`,
        );
        return;
      }

      if (!file && !existing?.urls?.length) {
        setStatus("Choose filtered-jobs.json first");
        return;
      }

      const begin = (parsed) => {
        const source = Array.isArray(parsed) ? parsed : parsed.jobs;
        const urls = [
          ...new Set(
            (source || [])
              .map((job) => job.url)
              .filter((url) => isDetailUrl(url))
              .map(normalizeUrl),
          ),
        ];
        if (!urls.length) {
          setStatus("No valid detail URLs found");
          return;
        }

        const state =
          existing?.urls?.length && existing.index < existing.urls.length
            ? { ...existing, running: true }
            : { urls, index: 0, results: [], failures: [], running: true };
        writeState(state);
        window.location.href = state.urls[state.index];
      };

      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            begin(JSON.parse(reader.result));
          } catch (error) {
            setStatus(`Invalid JSON: ${error.message}`);
          }
        };
        reader.readAsText(file);
      } else {
        begin(existing);
      }
    };

    resultsButton.onclick = () => {
      const state = readState();
      if (!state) {
        setStatus("No saved results yet");
        return;
      }
      downloadJson("expat-jobs-details.json", state.results || []);
      downloadJson("expat-jobs-failed.json", state.failures || []);
    };

    resetButton.onclick = () => {
      localStorage.removeItem(STORAGE_KEY);
      setStatus("Progress reset");
    };

    const state = readState();
    if (state?.running) {
      status.textContent = `Running: ${state.index + 1} of ${state.urls.length}`;
    } else if (state?.results?.length) {
      status.textContent = `Saved: ${state.results.length} results, ${state.failures.length} failed`;
    } else {
      status.textContent = "Choose filtered-jobs.json to begin";
    }

    panel.appendChild(heading);
    panel.appendChild(fileInput);
    panel.appendChild(startButton);
    panel.appendChild(resultsButton);
    panel.appendChild(resetButton);
    panel.appendChild(status);
    document.body.appendChild(panel);
  }

  if (location.pathname.startsWith("/cls/")) {
    setTimeout(processDetailPage, 1200);
  } else {
    addControlPanel();
  }
})();
