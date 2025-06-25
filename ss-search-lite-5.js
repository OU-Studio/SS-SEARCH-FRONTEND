(function () {
  const DOMAIN = window.location.hostname;
  const CHECK_URL = 'https://search-api-production-ff51.up.railway.app/api/lite-allowed?domain=' + DOMAIN;

  fetch(CHECK_URL)
    .then(res => res.json())
    .then(data => {
      if (!data.allowed) {
        console.warn('🚫 Lite search not allowed for this domain.');
        return;
      }

      console.log('✅ Lite search allowed for', DOMAIN);
      initLiteSearch();
    })
    .catch(() => {
      console.warn('⚠️ Could not verify domain. Search disabled.');
    });

  function initLiteSearch() {
    const API_URL = 'https://search-api-production-ff51.up.railway.app/api/search-lite';
    const DOMAIN = window.location.hostname;

    console.log('✅ Lite search script loaded');

    // Inject CSS to hide Squarespace's default search content
    const styleTag = document.createElement('style');
    styleTag.textContent = `.sqs-search-page-content { opacity: 0 !important; }`;
    document.head.appendChild(styleTag);
    console.log('🎨 Custom CSS injected to hide .sqs-search-page-content');

    const searchHTML = `
<div id="ss-search-wrapper">
  <div class="sqs-search-page-input">
    <input id="ss-search-input" type="text" placeholder="Search this site..."
      style="width: 100%; padding: 10px; font-size: 16px; box-sizing: border-box;" />
  </div>
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

    window.addEventListener('load', () => {
      const replaceSearchBlock = (selector) => {
        waitForElement(selector, (el) => {
          console.log(`✅ Found ${selector}`);
          el.innerHTML = searchHTML;
        }, 10000);
      };

      replaceSearchBlock('.sqs-search-container');
      replaceSearchBlock('.sqs-block-search');
    });

    function runSearch(query) {
      const resultsContainer = document.getElementById('ss-search-results');
      resultsContainer.innerHTML = 'Searching...';

      fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, domain: DOMAIN })
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
  }
})();
