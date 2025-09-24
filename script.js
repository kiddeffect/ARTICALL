async function search() {
  const query = document.getElementById("searchInput").value;
  const useCrossRef = document.getElementById("crossref").checked;
  const useOpenAlex = document.getElementById("openalex").checked;
  const useSearx = document.getElementById("searxng").checked;

  document.getElementById("results").innerHTML = "";

  if (useCrossRef) fetchCrossRef(query);
  if (useOpenAlex) fetchOpenAlex(query);
  if (useSearx) fetchSearxng(query);
}

// 📚 CrossRef scholarly search
async function fetchCrossRef(query) {
  const res = await fetch(`https://api.crossref.org/works?query=${encodeURIComponent(query)}`);
  const data = await res.json();

  const articles = data.message.items.map(item => ({
    title: item.title?.[0],
    author: item.author?.[0]?.family || "Unknown",
    date: item.published?.["date-parts"]?.[0]?.[0],
    source: item.publisher || "Unknown",
    link: item.URL,
    engine: "CrossRef",
    citations: []
  }));

  displayResults(articles);
}

// 🎓 OpenAlex academic search
async function fetchOpenAlex(query) {
  const res = await fetch(`https://api.openalex.org/works?search=${encodeURIComponent(query)}`);
  const data = await res.json();

  const articles = data.results.map(item => ({
    title: item.title,
    author: item.authorships?.[0]?.author?.display_name || "Unknown",
    date: item.publication_date,
    source: item.host_venue?.publisher || "Unknown",
    link: item.primary_location?.source?.url || item.id,
    engine: "OpenAlex",
    citations: item.referenced_works?.slice(0, 3) || []
  }));

  displayResults(articles);
}

// 🌐 Dynamic SearXNG search using searx.space live instance list
async function fetchSearxng(query) {
  const resultsContainer = document.getElementById("results");
  const fallbackInstances = [
    "https://searx.be",           // may have issues, but a popular one
    "https://search.sapti.me",    // example from user community
    // add more that you’ve tested manually
  ];

  function timeoutFetch(url, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timeout")), timeout);
      fetch(url)
        .then(res => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch(err => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  try {
    const res = await timeoutFetch("https://searx.space/data/instances.json");
    const instanceData = await res.json();

    const instances = Object.entries(instanceData.instances)
      .filter(([url, info]) =>
        info.online &&
        info.api &&
        info.api.v1 &&
        info.api.v1.get &&
        !url.includes("localhost") &&
        url.startsWith("https://")
      )
      .map(([url]) => url.replace(/\/$/, ""));

    const allCandidates = [...instances, ...fallbackInstances];

    for (let instance of allCandidates) {
      try {
        const testUrl = `${instance}/search?q=test&format=json`;
        const testRes = await timeoutFetch(testUrl);
        if (!testRes.ok) throw new Error(`HTTP ${testRes.status}`);
        const testData = await testRes.json();
        if (!testData.results) throw new Error("No results field");
        if (!Array.isArray(testData.results)) throw new Error("Results not array");

        // If test passes, now do actual search
        const searchUrl = `${instance}/search?q=${encodeURIComponent(query)}&format=json`;
        const searchRes = await timeoutFetch(searchUrl);
        if (!searchRes.ok) throw new Error(`Search HTTP ${searchRes.status}`);
        const data = await searchRes.json();
        if (!data.results || data.results.length === 0) {
          console.warn(`Search pass but no results (empty) from instance: ${instance}`);
          continue;
        }

        const results = data.results.map(result => ({
          title: result.title,
          author: null,
          date: null,
          source: new URL(result.url).hostname,
          link: result.url,
          engine: "SearXNG",
          citations: []
        }));

        displayResults(results);
        return; // stop after first working instance
      } catch (err) {
        console.warn(`Instance failed: ${instance}`, err.message);
        // continue to next
      }
    }

    resultsContainer.innerHTML += `<p style="color:red">⚠️ No working SearXNG instances found.</p>`;

  } catch (err) {
    console.error("Failed to load searx.space instances:", err.message);
    resultsContainer.innerHTML += `<p style="color:red">⚠️ Failed to load SearXNG instance list.</p>`;
  }
}


// 📋 Display results in the page
function displayResults(results) {
  const container = document.getElementById("results");

  results.forEach(article => {
    const card = document.createElement("div");
    card.className = "result";
    card.innerHTML = `
      <h3>${article.title}</h3>
      <p><strong>Author:</strong> ${article.author || "Unknown"}</p>
      <p><strong>Date:</strong> ${article.date || "Unknown"}</p>
      <p><strong>Source:</strong> <a href="${article.link}" target="_blank">${article.source}</a></p>
      <p><strong>Engine Source:</strong> ${article.engine}</p>
      <a href="${article.link}" target="_blank">View Full Article</a>
      ${article.citations.length ? `
        <details><summary>Works Cited (${article.citations.length})</summary>
        <ul>
          ${article.citations.map(cite => `<li><a href="${cite}" target="_blank">${cite}</a></li>`).join("")}
        </ul></details>` : ""}
    `;
    container.appendChild(card);
  });
}

// ⌨️ Enable search on Enter key
document.getElementById("searchInput").addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    search();
  }
});
// 🎯 Automatically focus the search input on page load
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("searchInput").focus();
});

