(function () {
  const API_URL = 'https://search-api-production-ff51.up.railway.app/api/search-lite';
  const DOMAIN = window.location.hostname;
  const UNIQUE_ID = 'ss_' + Math.random().toString(36).slice(2);

  console.log('✅ Lite search script loaded');

  const searchHTML = `
    <div id="ss-search-wrapper" style="padding: 40px 0;">
      <h1>Search</h1>
      <input id="ss-search-input" type="text" placeholder="Search this site..."
        style="width: 100%; padding: 10px; font-size: 16px;" />
      <div id="ss-search-progress" style="margin-top: 1em; display: none;">
        <div style="height: 10px; background: #eee; width: 100%; border-radius: 5px; overflow: hidden;">
          <div id="ss-progress-bar" style="height: 10px; background: #0070f3; width: 0%; transition: width 0.2s;"></div>
        </div>
        <p id="ss-progress-text" style="font-size: 14px; margin-top: 0.5em;"></p>
      </div>
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
      console.log('✅ Found .sqs-search-container');
      container.parentElement.innerHTML = searchHTML;
    });
  });

  function runSearch(query) {
    const resultsContainer = document.getElementById('ss-search-results');
    const progressWrap = document.getElementById('ss-search-progress');
    const progressBar = document.getElementById('ss-progress-bar');
    const progressText = document.getElementById('ss-progress-text');

    resultsContainer.innerHTML = 'Searching...';
    progressWrap.style.display = 'none';

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, domain: DOMAIN, id: UNIQUE_ID })
    })
      .then(res => {
        if (res.status === 404) {
          // Start progress stream
          progressWrap.style.display = 'block';
          progressBar.style.width = '0%';
          progressText.textContent = 'Preparing index...';

          const source = new EventSource(`https://search-api-production-ff51.up.railway.app/api/progress/${UNIQUE_ID}`);
          source.onmessage = (event) => {
            const data = JSON.parse(event.data);
            const percent = Math.round((data.done / data.total) * 100);
            progressBar.style.width = percent + '%';
            progressText.textContent = `Indexing ${data.done} of ${data.total} pages...`;

            if (data.done === data.total) {
  source.close();
  indexingInProgress = false;

  // Grab latest input value
  const currentQuery = document.getElementById('ss-search-input')?.value.trim();
  if (currentQuery && currentQuery.length >= 3) {
    console.log('🔁 Re-running final search for:', currentQuery);
    runSearch(currentQuery);
  }
}

          };
          return Promise.reject('Index building');
        }
        return res.json();
      })
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
        progressWrap.style.display = 'none';
      })
      .catch(err => {
        if (err !== 'Index building') {
          console.error(err);
          resultsContainer.innerHTML = '<p>Error searching site. Please try again later.</p>';
        }
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
