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

async function fetchCrossRef(query) {
  const res = await fetch(`https://api.crossref.org/works?query=${encodeURIComponent(query)}`);
  const data = await res.json();

  const articles = data.message.items.map(item => ({
    title: item.title?.[0],
    author: item.author?.[0]?.family || "Unknown",
    date: item.published?.["date-parts"]?.[0]?.[0],
    source: "CrossRef",
    link: item.URL,
    citations: []
  }));

  displayResults(articles);
}

async function fetchOpenAlex(query) {
  const res = await fetch(`https://api.openalex.org/works?search=${encodeURIComponent(query)}`);
  const data = await res.json();

  const articles = data.results.map(item => ({
    title: item.title,
    author: item.authorships?.[0]?.author?.display_name || "Unknown",
    date: item.publication_date,
    source: "OpenAlex",
    link: item.id,
    citations: item.referenced_works?.slice(0, 3) || []
  }));

  displayResults(articles);
}

async function fetchSearxng(query) {
  const res = await fetch(`https://searx.be/search?q=${encodeURIComponent(query)}&format=json`);
  const data = await res.json();

  const results = data.results.map(result => ({
    title: result.title,
    author: null,
    date: null,
    source: "Web (SearXNG)",
    link: result.url,
    citations: []
  }));

  displayResults(results);
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
      <p><strong>Source:</strong> ${article.source}</p>
      <a href="${article.link}" target="_blank">View Article</a>
      ${article.citations.length ? `
        <details><summary>Works Cited (${article.citations.length})</summary>
        <ul>
          ${article.citations.map(cite => `<li><a href="${cite}" target="_blank">${cite}</a></li>`).join("")}
        </ul></details>` : ""}
    `;
    container.appendChild(card);
  });
}
