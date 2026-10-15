
const form = document.getElementById('shorten-form');
const input = document.getElementById('originalUrl');
const submitButton = document.getElementById('submit-button');
const message = document.getElementById('message');
const result = document.getElementById('result');
const shortLink = document.getElementById('short-link');
const copyButton = document.getElementById('copy-button');
const linksBody = document.getElementById('links-body');

function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle('error', isError);
}

function formatDate(value) {
    if (!value) return '—';
    return new Date(value).toLocaleString();
}

async function loadDashboard() {
    try {
        const [summaryResponse, linksResponse] = await Promise.all([
            fetch('/api/analytics/summary'),
            fetch('/api/urls')
        ]);

        if (!summaryResponse.ok || !linksResponse.ok) {
            throw new Error('Could not load dashboard data.');
        }

        const summary = await summaryResponse.json();
        const links = await linksResponse.json();

        document.getElementById('total-urls').textContent =
            summary.totalUrls;

        document.getElementById('total-clicks').textContent =
            summary.totalClicks;

        document.getElementById('clicks-today').textContent =
            summary.clicksToday;

        renderLinks(links);

    } catch (error) {
        linksBody.innerHTML =
            '<tr><td colspan="4" class="empty">' +
            'Unable to load dashboard data. Check the backend.' +
            '</td></tr>';

        console.error('Dashboard loading error:', error);
    }
}

function renderLinks(links) {
    if (!Array.isArray(links) || links.length === 0) {
        linksBody.innerHTML =
            '<tr><td colspan="4" class="empty">' +
            'No links yet. Shorten your first URL above.' +
            '</td></tr>';
        return;
    }

    linksBody.replaceChildren();

    for (const item of links) {
        const row = document.createElement('tr');

        const shortCell = document.createElement('td');
        const shortAnchor = document.createElement('a');

        shortAnchor.href = item.shortUrl;
        shortAnchor.target = '_blank';
        shortAnchor.rel = 'noopener noreferrer';
        shortAnchor.textContent = item.shortUrl.replace(
            /^https?:\/\//,
            ''
        );

        shortCell.appendChild(shortAnchor);

        const destination = document.createElement('td');
        destination.className = 'destination';
        destination.textContent = item.originalUrl;

        const clicks = document.createElement('td');
        clicks.textContent = item.clicks;

        const created = document.createElement('td');
        created.textContent = formatDate(item.createdAt);

        row.append(shortCell, destination, clicks, created);
        linksBody.appendChild(row);
    }
}

form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const originalUrl = input.value.trim();

    if (!originalUrl) {
        showMessage('Please enter a URL.', true);
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Working...';
    showMessage('');
    result.classList.add('hidden');

    try {
        const response = await fetch('/api/urls', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                originalUrl: originalUrl
            })
        });

        const responseText = await response.text();

        let data;

        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch {
            throw new Error(
                'The server returned an invalid response. Check the VS Code terminal.'
            );
        }

        if (!response.ok) {
            throw new Error(
                data.error ||
                data.message ||
                `Request failed with status ${response.status}.`
            );
        }

        if (!data.shortUrl) {
            throw new Error(
                'The server did not return a shortened URL. Check the backend response.'
            );
        }

        shortLink.href = data.shortUrl;
        shortLink.textContent = data.shortUrl;

        result.classList.remove('hidden');
        showMessage('Short URL created successfully.');

        // Clear the input only after successful URL creation.
        input.value = '';

        await loadDashboard();

    } catch (error) {
        showMessage(
            error.message || 'Something went wrong.',
            true
        );

        console.error('URL shortening error:', error);

    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Shorten URL';
    }
});

copyButton.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(shortLink.href);

        copyButton.textContent = 'Copied!';

        setTimeout(() => {
            copyButton.textContent = 'Copy link';
        }, 1400);

    } catch (error) {
        showMessage(
            'Copy failed. Select and copy the short URL manually.',
            true
        );
    }
});

document.getElementById('refresh-button')
    .addEventListener('click', loadDashboard);

loadDashboard();