// ==UserScript==
// @name         Expat Jobs Raw Page Copy
// @namespace    https://www.expatriates.com/
// @match        https://www.expatriates.com/classifieds/jobs/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  function getRawPageText() {
    const page = document.documentElement.cloneNode(true);
    const panel = page.querySelector("#expat-raw-panel");
    if (panel) panel.remove();
    return page.outerHTML;
  }

  function getJobs(documentRoot, pageUrl) {
    return Array.from(documentRoot.querySelectorAll(".listing-content li"))
      .map((item) => {
        const link = item.querySelector('a[href*="/cls/"]');
        if (!link) return null;

        const image = item.querySelector("img");
        const title = (
          image ? link.nextElementSibling : link
        )?.textContent.trim();
        const locations = Array.from(item.querySelectorAll("a"))
          .filter((anchor) => !anchor.getAttribute("href")?.includes("/cls/"))
          .map((anchor) => anchor.textContent.trim())
          .filter(Boolean);

        return {
          title: title || link.textContent.trim(),
          url: new URL(link.getAttribute("href"), pageUrl).href,
          location: locations,
          image: image
            ? new URL(image.getAttribute("src"), pageUrl).href
            : null,
          premium: item.getAttribute("premium") === "True",
          epoch: Number(item.getAttribute("epoch")) || null,
        };
      })
      .filter(Boolean);
  }

  function getJobsJsonText() {
    return JSON.stringify(getJobs(document, window.location.href), null, 2);
  }

  function downloadText(text, filename, mimeType) {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function getPageUrl(pageNumber) {
    const suffix =
      pageNumber === 1 ? "" : `index${(pageNumber - 1) * 100}.html`;
    return new URL(`/classifieds/jobs/${suffix}`, window.location.origin).href;
  }

  async function downloadAllJobs(status) {
    const pages = [];

    for (let pageNumber = 1; pageNumber <= 313; pageNumber += 1) {
      const pageUrl = getPageUrl(pageNumber);
      status.textContent = `Loading page ${pageNumber} of 313...`;
      const response = await fetch(pageUrl, { credentials: "include" });
      if (!response.ok) {
        throw new Error(`Page ${pageNumber} returned ${response.status}`);
      }

      const html = await response.text();
      const parsedPage = new DOMParser().parseFromString(html, "text/html");
      pages.push({
        page: pageNumber,
        url: pageUrl,
        jobs: getJobs(parsedPage, pageUrl),
      });
    }

    downloadText(
      JSON.stringify(pages, null, 2),
      "expat-jobs-all-pages.json",
      "application/json",
    );
    status.textContent = "All pages downloaded";
  }

  function addRawPanel() {
    const existing = document.getElementById("expat-raw-panel");
    if (existing) return;
    if (!document.body) return;

    const panel = document.createElement("div");
    panel.id = "expat-raw-panel";
    panel.style.cssText = [
      "position:fixed",
      "top:16px",
      "right:16px",
      "z-index:999999",
      "background:#111827",
      "color:#f9fafb",
      "padding:12px",
      "border-radius:10px",
      "font-family:Arial,sans-serif",
      "max-width:340px",
      "max-height:80vh",
      "overflow:auto",
      "box-shadow:0 12px 30px rgba(0,0,0,0.25)",
    ].join(";");

    const heading = document.createElement("div");
    heading.textContent = "Expat jobs exporter";
    heading.style.fontWeight = "700";
    heading.style.marginBottom = "8px";

    const buttonStyle =
      "padding:8px 10px; border:none; border-radius:6px; color:white; cursor:pointer; margin:0 6px 10px 0;";

    const htmlButton = document.createElement("button");
    htmlButton.textContent = "Download current HTML";
    htmlButton.style.cssText = buttonStyle + "background:#2563eb;";
    htmlButton.onclick = () => {
      downloadText(getRawPageText(), "expat-jobs-current.html", "text/html");
    };

    const jsonButton = document.createElement("button");
    jsonButton.textContent = "Download current JSON";
    jsonButton.style.cssText = buttonStyle + "background:#059669;";
    jsonButton.onclick = () => {
      downloadText(
        getJobsJsonText(),
        "expat-jobs-current.json",
        "application/json",
      );
    };

    const allButton = document.createElement("button");
    allButton.textContent = "Download all 313 pages JSON";
    allButton.style.cssText = buttonStyle + "background:#d97706;";

    const status = document.createElement("div");
    status.textContent = "Ready";
    status.style.cssText = "font-size:11px; color:#d1d5db; margin-top:4px;";
    allButton.onclick = async () => {
      allButton.disabled = true;
      try {
        await downloadAllJobs(status);
      } catch (error) {
        status.textContent = `Export failed: ${error.message}`;
      } finally {
        allButton.disabled = false;
      }
    };

    panel.appendChild(heading);
    panel.appendChild(htmlButton);
    panel.appendChild(jsonButton);
    panel.appendChild(allButton);
    panel.appendChild(status);
    document.body.appendChild(panel);
  }

  addRawPanel();
})();
