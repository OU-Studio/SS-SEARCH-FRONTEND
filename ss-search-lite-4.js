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
      initLiteSearch(); // this is your entire logic wrapped in a function
    })
    .catch(() => {
      console.warn('⚠️ Could not verify domain. Search disabled.');
    });
  function initLiteSearch() {
    const API_URL = 'https://search-api-production-ff51.up.railway.app/api/search-lite';
    const DOMAIN = window.location.hostname;
    const UNIQUE_ID = 'ss_' + Math.random().toString(36).slice(2);

    console.log('✅ Lite search script loaded');

    // Inject custom CSS to hide default Squarespace search container
const styleTag = document.createElement('style');
styleTag.textContent = `.sqs-search-container { opacity: 0 !important; }`;
document.head.appendChild(styleTag);
console.log('🎨 Custom CSS injected to hide .sqs-search-container');


    const searchHTML = `
<div id="ss-search-wrapper">
<div class="sqs-search-page-input">
<div class="spinner-wrapper"></div>
<input id="ss-search-input" type="text" placeholder="Search this site..."
style="width: 100%; padding: 10px; font-size: 16px; box-sizing: border-box;" />
</div>
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



    let indexingInProgress = false;

    let indexFinished = false;

    function runSearch(query) {
      if (indexingInProgress) {
        console.log('⏳ Indexing already in progress, skipping input:', query);
        return;
      }

      indexingInProgress = true;
      indexFinished = false;

      const resultsContainer = document.getElementById('ss-search-results');
      const progressWrap = document.getElementById('ss-search-progress');
      const progressBar = document.getElementById('ss-progress-bar');
      const progressText = document.getElementById('ss-progress-text');

      resultsContainer.innerHTML = 'Searching...';
      progressWrap.style.display = 'block';
      progressBar.style.width = '0%';
      progressText.textContent = 'Checking cache...';

      const source = new EventSource(`https://search-api-production-ff51.up.railway.app/api/progress/${UNIQUE_ID}`);
      source.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const percent = Math.round((data.done / data.total) * 100);
        progressBar.style.width = percent + '%';
        progressText.textContent = `Indexing ${data.done} of ${data.total} pages...`;

        if (data.done === data.total && !indexFinished) {
          indexFinished = true;
          source.close();
          indexingInProgress = false;

          const currentQuery = document.getElementById('ss-search-input')?.value.trim();
          if (currentQuery && currentQuery.length >= 3) {
            console.log('🔁 Re-running final search for:', currentQuery);
            runSearch(currentQuery); // <- this time it won't be blocked
          }
        }
      };

      fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, domain: DOMAIN, id: UNIQUE_ID })
      })
        .then(res => res.json())
        .then(data => {
          if (!indexFinished) {
            source.close();
            indexingInProgress = false;
            progressWrap.style.display = 'none';
          }

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
          source.close();
          indexingInProgress = false;
          console.error(err);
          resultsContainer.innerHTML = '<p>Error searching site. Please try again later.</p>';
          progressWrap.style.display = 'none';
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
