// ss-search-main.js
(function () {
  const API_URL = 'https://search-api-production-ff51.up.railway.app/api/search';

  // Pull SITE_TOKEN and FILE_NAME from global scope (set by loader script)
  const SITE_TOKEN = window.SS_SITE_TOKEN;
  const FILE_NAME = window.SS_INDEX_FILE || 'site-index.json';
  const INDEX_URL = window.location.origin + '/s/' + FILE_NAME;

  // Inject search UI
  const searchHTML = `
    <div id="ss-search-wrapper" style="padding: 40px 0;">
      <h1>Search</h1>
      <input id="ss-search-input" type="text" placeholder="Search this site..."
        style="width: 100%; padding: 10px; font-size: 16px;" />
      <p id="status"></p>
      <div id="ss-search-results" style="margin-top: 20px; font-family: sans-serif;"></div>
    </div>
  `;

  function waitForElement(selector, callback, timeout = 5000) {
    const start = Date.now();
    const interval = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(interval);
        callback(el);
      } else if (Date.now() - start > timeout) {
        clearInterval(interval);
        console.warn(`Element "${selector}" not found within timeout.`);
      }
    }, 100);
  }

  document.addEventListener('DOMContentLoaded', () => {
    waitForElement('.sqs-search-container', (container) => {
      container.parentElement.innerHTML = searchHTML;
    });
  });

  function runSearch(query) {
    const resultsContainer = document.getElementById('ss-search-results');
    resultsContainer.innerHTML = 'Searching...';

    fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Site-Token': SITE_TOKEN,
        'X-Origin-Domain': window.location.hostname
      },
      body: JSON.stringify({ query, url: INDEX_URL })
    })
    .then(res => res.json())
    .then(data => {
      if (!data.results || data.results.length === 0) {
        resultsContainer.innerHTML = '<p>No results found.</p>';
        return;
      }

      const html = data.results.map(item => `
        <div class="result result-${item.type}" style="margin-bottom: 20px;">
          <a href="${item.url}" target="_blank" style="font-weight: bold; text-decoration: underline;">
            ${item.title}
          </a>
          <p style="margin: 5px 0;">${item.snippet}</p>
        </div>
      `).join('');

      resultsContainer.innerHTML = html;
    })
    .catch(err => {
      console.error(err);
      resultsContainer.innerHTML = '<p>Error searching site. Please try again later.</p>';
    });
  }

  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'ss-search-input') {
      const query = e.target.value.trim();
      if (query.length >= 3) {
        runSearch(query);
      } else {
        const resultsContainer = document.getElementById('ss-search-results');
        if (resultsContainer) resultsContainer.innerHTML = '';
      }
    }
  });
})();
