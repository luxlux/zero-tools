declare const chrome: any;
declare const JSZip: any; // Loaded globally from jszip.min.js

interface DocItem {
    id: string;
    title: string;
    date: string; // DD.MM.YYYY
    url: string;
    isNew: boolean;
    element: HTMLElement;
}

interface Settings {
    postboxDownloaderEnabled: boolean;
    postboxFilenameMode: 'original' | 'display';
}

let settings: Settings = {
    postboxDownloaderEnabled: true,
    postboxFilenameMode: 'original',
};

// Load settings
if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.sync.get(['latencySettings'], (result: any) => {
        if (result.latencySettings) {
            settings = {
                postboxDownloaderEnabled: result.latencySettings.postboxDownloaderEnabled ?? true,
                postboxFilenameMode: result.latencySettings.postboxFilenameMode ?? 'original',
            };
        }
    });

    chrome.storage.onChanged.addListener((changes: any, namespace: string) => {
        if (namespace === 'sync' && changes.latencySettings) {
            const newSettings = changes.latencySettings.newValue;
            settings = {
                postboxDownloaderEnabled: newSettings.postboxDownloaderEnabled ?? true,
                postboxFilenameMode: newSettings.postboxFilenameMode ?? 'original',
            };
        }
    });
}

export const initPostboxDownloader = (enabled: boolean) => {
    console.log('[Postbox] initPostboxDownloader called, enabled:', enabled);
    if (!enabled) return;

    // Check if we are on the postbox page
    const isPostboxPage = window.location.href.includes('/posteingang');
    console.log('[Postbox] Current URL:', window.location.href, 'isPostboxPage:', isPostboxPage);
    if (!isPostboxPage) return;

    // Run periodically to check for the table and inject buttons
    const interval = setInterval(() => {
        const table = document.querySelector('table.table-post');
        const existingControls = document.getElementById('zd-postbox-controls');
        console.log('[Postbox] Interval check - table:', !!table, 'existingControls:', !!existingControls);

        if (table && !existingControls) {
            console.log('[Postbox] Injecting controls...');
            injectControls(table);
        }
    }, 1000);
};

const injectControls = (table: Element) => {
    // Find a place to inject. The table is usually inside a .inbox container.
    // We'll try to put it above the table or in the header row if possible, 
    // but a separate toolbar above the table seems safest.

    const container = table.closest('.inbox');
    if (!container) return;

    const controlsDiv = document.createElement('div');
    controlsDiv.id = 'zd-postbox-controls';
    controlsDiv.className = 'd-flex justify-content-end mb-2';
    controlsDiv.style.gap = '10px';
    controlsDiv.style.padding = '10px';
    controlsDiv.style.backgroundColor = '#f8f9fa';
    controlsDiv.style.borderRadius = '5px';
    controlsDiv.style.border = '1px solid #dee2e6';

    // Button: Download All Visible
    const btnAll = document.createElement('button');
    btnAll.className = 'zd-btn zd-btn-primary';
    btnAll.textContent = 'Alle sichtbaren PDFs laden (ZIP)';
    btnAll.onclick = () => downloadDocs(false);

    // Button: Download New Only
    const btnNew = document.createElement('button');
    btnNew.className = 'zd-btn zd-btn-primary';
    btnNew.textContent = 'Nur NEUE laden (ZIP)';
    btnNew.onclick = () => downloadDocs(true);

    controlsDiv.appendChild(btnAll);
    controlsDiv.appendChild(btnNew);

    container.insertAdjacentElement('beforebegin', controlsDiv);
};

const downloadDocs = async (onlyNew: boolean) => {
    const docs = getVisibleDocs();
    if (docs.length === 0) {
        alert('Keine Dokumente gefunden.');
        return;
    }

    const toDownload = onlyNew ? docs.filter(d => d.isNew) : docs;

    if (toDownload.length === 0) {
        alert('Keine entsprechenden Dokumente gefunden.');
        return;
    }

    if (!confirm(`${toDownload.length} Dokumente als ZIP herunterladen?`)) return;

    // Create ZIP
    const zip = new JSZip();
    let successCount = 0;
    let failCount = 0;

    // Status indicator
    const statusDiv = document.createElement('div');
    statusDiv.style.position = 'fixed';
    statusDiv.style.top = '20px';
    statusDiv.style.right = '20px';
    statusDiv.style.backgroundColor = '#248eff';
    statusDiv.style.color = 'white';
    statusDiv.style.padding = '15px';
    statusDiv.style.borderRadius = '5px';
    statusDiv.style.zIndex = '9999';
    statusDiv.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    statusDiv.textContent = `Lade 0/${toDownload.length} Dokumente...`;
    document.body.appendChild(statusDiv);

    for (const doc of toDownload) {
        try {
            // Fetch the file
            const response = await fetch(doc.url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const blob = await response.blob();

            // Determine filename
            let filename = '';
            if (settings.postboxFilenameMode === 'original') {
                // Try to extract from Content-Disposition header
                const contentDisposition = response.headers.get('Content-Disposition');
                if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                    if (filenameMatch && filenameMatch[1]) {
                        filename = filenameMatch[1].replace(/['"]/g, '');
                    }
                }

                // Fallback: Extract from URL
                if (!filename) {
                    const urlParts = doc.url.split('/');
                    filename = urlParts[urlParts.length - 1] || `document_${doc.id}.pdf`;
                }
            } else {
                // Use display title
                const cleanTitle = doc.title.replace(/[^a-zA-Z0-9äöüÄÖÜß \-_]/g, '').trim();
                filename = `${cleanTitle}.pdf`;
            }

            // Parse date for file timestamp (DD.MM.YYYY -> YYYY-MM-DD)
            const [day, month, year] = doc.date.split('.');
            const fileDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

            // Add to ZIP with date
            zip.file(filename, blob, {
                date: fileDate,
            });

            successCount++;
            statusDiv.textContent = `Lade ${successCount}/${toDownload.length} Dokumente...`;

            // Small delay to prevent browser throttling
            await new Promise(r => setTimeout(r, 100));

        } catch (e) {
            console.error('Error processing doc', doc, e);
            failCount++;
        }
    }

    statusDiv.textContent = 'Erstelle ZIP-Archiv...';

    try {
        // Generate ZIP
        const zipBlob = await zip.generateAsync({ type: 'blob' });

        // Create download
        const zipFilename = `Posteingang_${new Date().toISOString().split('T')[0]}.zip`;
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = zipFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        statusDiv.style.backgroundColor = '#28a745';
        statusDiv.textContent = `✓ Download abgeschlossen! ${successCount} Dateien`;
        setTimeout(() => document.body.removeChild(statusDiv), 3000);

    } catch (e) {
        console.error('Error creating ZIP', e);
        statusDiv.style.backgroundColor = '#dc3545';
        statusDiv.textContent = '✗ Fehler beim Erstellen des ZIP-Archivs';
        setTimeout(() => document.body.removeChild(statusDiv), 5000);
    }
};

const getVisibleDocs = (): DocItem[] => {
    const rows = document.querySelectorAll('table.table-post tbody tr');
    const docs: DocItem[] = [];

    rows.forEach(row => {
        // Title & Link
        const linkEl = row.querySelector('a[href*="/doc/"]');
        if (!linkEl) return;

        const url = linkEl.getAttribute('href');
        if (!url) return;

        const title = linkEl.textContent?.trim() || 'Unbekanntes Dokument';

        // Check if new (bold class)
        // Based on HTML provided: <a ... class="... p-base-bold" ...> -> New/Unread
        const isNew = linkEl.classList.contains('p-base-bold');

        // Date
        // The date is in the second column (index 1)
        // <div class="..."> 21.11.2025 </div>
        const dateCell = row.querySelectorAll('td')[1];
        const dateText = dateCell?.textContent?.replace('Datum', '').trim() || '';

        // ID from URL (e.g. .../doc/167300856/...)
        const idMatch = url.match(/\/doc\/(\d+)\//);
        const id = idMatch ? idMatch[1] : Math.random().toString(36).substr(2, 9);

        docs.push({
            id,
            title,
            date: dateText,
            url: url.startsWith('http') ? url : `https://mein.finanzen-zero.net${url}`,
            isNew,
            element: row as HTMLElement
        });
    });

    return docs;
};
