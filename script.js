async function search() {
  const query = document.getElementById("searchInput").value.trim();
  if (!query) return;

  const useCrossRef = document.getElementById("crossref").checked;
  const useOpenAlex = document.getElementById("openalex").checked;
  const useSearx = document.getElementById("searxng").checked;

  const resultsContainer = document.getElementById("results");
  resultsContainer.innerHTML = "";

  if (useCrossRef) await fetchCrossRef(query);
  if (useOpenAlex) await fetchOpenAlex(query);
  if (useSearx) await fetchSearxng(query);
}

async function fetchCrossRef(query) {
  try {
    const res = await fetch(`https://api.crossref.org/works?query=${encodeURIComponent(query)}`);
    const data = await res.json();

    const articles = data.message.items.map(item => ({
      title: item.title?.[0] || "No title",
      author: item.author?.[0]?.family || "Unknown",
      date: item.published?.["date-parts"]?.[0]?.[0] || "Unknown",
      source: item.publisher || "Unknown",
      link: item.URL,
      engine: "CrossRef",
      citations: []
    }));

    displayResults(articles);
  } catch (error) {
    console.error("CrossRef fetch error:", error);
  }
}

async function fetchOpenAlex(query) {
  try {
    const res = await fetch(`https://api.openalex.org/works?search=${encodeURIComponent(query)}`);
    const data = await res.json();

    const articles = data.results.map(item => ({
      title: item.title || "No title",
      author: item.authorships?.[0]?.author?.display_name || "Unknown",
      date: item.publication_date || "Unknown",
      source: item.host_venue?.publisher || "Unknown",
      link: item.primary_location?.source?.url || item.id,
      engine: "OpenAlex",
      citations: item.referenced_works?.slice(0, 3) || []
    }));

    displayResults(articles);
  } catch (error) {
    console.error("OpenAlex fetch error:", error);
  }
}

async function fetchSearxng(query) {
  const resultsContainer = document.getElementById("results");

  try {
    const res = await fetch("https://searx.space/data/instances.json");
    const instanceData = await res.json();

    const instances = Object.entries(instanceData.instances)
      .filter(([url, info]) =>
        info.online &&
        info.api &&
        info.api.v1 &&
        info.api.v1.get &&
        !url.includes("localhost")
      )
      .map(([url]) => url.replace(/\/$/, ""));

    for (let instance of instances) {
      try {
        const searchUrl = `${instance}/search?q=${encodeURIComponent(query)}&format=json`;
        const response = await fetch(searchUrl);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        if (!data.results || data.results.length === 0) continue;

        const results = data.results.map(result => ({
          title: result.title || "No title",
          author: null,
          date: null,
          source: new URL(result.url).hostname,
          link: result.url,
          engine: "SearXNG",
          citations: []
        }));

        displayResults(results);
        return;

      } catch (err) {
        console.warn(`SearXNG instance failed: ${instance}`, err.message);
      }
    }

    resultsContainer.innerHTML += `<p style="color:red">⚠️ No working SearXNG instances found.</p>`;

  } catch (err) {
    console.error("Failed to load searx.space instances:", err.message);
    resultsContainer.innerHTML += `<p style="color:red">⚠️ Failed to load SearXNG instance list.</p>`;
  }
}

function displayResults(results) {
  const container = document.getElementById("results");

  results.forEach(article => {
    const card = document.createElement("div");
    card.className = "result";
    card.innerHTML = `
      <h3>${article.title}</h3>
      <p><strong>Author:</strong> ${article.author || "Unknown"}</p>
      <p><strong>Date:</strong> ${article.date || "Unknown"}</p>
      <p><strong>Source:</strong> <a href="${article.link}" target="_blank" rel="noopener noreferrer">${article.source}</a></p>
      <p><strong>Engine Source:</strong> ${article.engine}</p>
      <a href="${article.link}" target="_blank" rel="noopener noreferrer">View Full Article</a>
      ${article.citations.length ? `
        <details><summary>Works Cited (${article.citations.length})</summary>
        <ul>
          ${article.citations.map(cite => `<li><a href="${cite}" target="_blank" rel="noopener noreferrer">${cite}</a></li>`).join("")}
        </ul></details>` : ""}
    `;
    container.appendChild(card);
  });
}

// --- Keyboard: search on Enter ---
document.getElementById("searchInput").addEventListener("keydown", e => {
  if (e.key === "Enter") {
    search();
  }
});

// --- Search button ---
document.getElementById("searchBtn").addEventListener("click", search);

// --- Dark mode toggle ---
const themeToggle = document.getElementById('themeToggle');
function setTheme(dark) {
  if (dark) {
    document.body.classList.add('dark');
    themeToggle.textContent = '☀️ Light Mode';
    localStorage.setItem('theme', 'dark');
  } else {
    document.body.classList.remove('dark');
    themeToggle.textContent = '🌙 Dark Mode';
    localStorage.setItem('theme', 'light');
  }
}
// Load saved preference or default to light
const savedTheme = localStorage.getItem('theme');
setTheme(savedTheme === 'dark');

themeToggle.addEventListener('click', () => {
  setTheme(!document.body.classList.contains('dark'));
});
