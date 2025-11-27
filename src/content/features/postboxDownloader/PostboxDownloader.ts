/**
 * Postbox Downloader Feature
 * Adds bulk download capabilities to the Postbox page
 */

declare const JSZip: any;

interface DocItem {
    id: string;
    title: string;
    date: string;
    url: string;
    isNew: boolean;
    element: HTMLElement;
}

export const initPostboxDownloader = (enabled: boolean, filenameMode: 'original' | 'display' = 'display') => {
    if (!enabled) return;
    if (!window.location.href.includes('/posteingang')) return;

    setInterval(() => {
        const table = document.querySelector('table.table-post');
        const controls = document.getElementById('zd-postbox-controls');
        if (table && !controls) {
            const container = table.closest('.inbox');
            if (!container) return;

            const div = document.createElement('div');
            div.id = 'zd-postbox-controls';
            div.className = 'd-flex justify-content-end mb-2';
            div.style.cssText = 'gap:10px;padding:10px;background:#f8f9fa;border-radius:5px;border:1px solid #dee2e6';


            const btnExpand = document.createElement('button');
            btnExpand.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;margin-right:6px">
        <path d="M4 21H17M5 18H19M6 15H21M4 12H19M3 9H19M5.5 6H21M6 3H22" 
              stroke="currentColor" 
              stroke-width="1.5" 
              stroke-linecap="square"/>
      </svg>Alle anzeigen`;
            btnExpand.style.cssText = 'padding:5px 12px;background:#f3f4f6;color:#374151;border:1px solid #d1d5db;border-radius:4px;font-size:14px;font-weight:400;cursor:pointer;transition:all 0.2s;display:inline-flex;align-items:center';
            btnExpand.onmouseover = () => btnExpand.style.background = '#e5e7eb';
            btnExpand.onmouseout = () => btnExpand.style.background = '#f3f4f6';
            btnExpand.onclick = () => expandAllDocs();

            const btnAll = document.createElement('button');
            btnAll.textContent = 'Alle angezeigten laden (ZIP)';
            btnAll.style.cssText = 'padding:5px 12px;background:#e0e7ff;color:#3730a3;border:1px solid #c7d2fe;border-radius:4px;font-size:14px;font-weight:500;cursor:pointer;transition:all 0.2s';
            btnAll.onmouseover = () => btnAll.style.background = '#c7d2fe';
            btnAll.onmouseout = () => btnAll.style.background = '#e0e7ff';
            btnAll.onclick = () => downloadDocs(false, filenameMode);

            const btnNew = document.createElement('button');
            btnNew.textContent = 'Nur UNGELESENE laden (ZIP)';
            btnNew.style.cssText = 'padding:5px 12px;background:#e0e7ff;color:#3730a3;border:1px solid #c7d2fe;border-radius:4px;font-size:14px;font-weight:500;cursor:pointer;transition:all 0.2s';
            btnNew.onmouseover = () => btnNew.style.background = '#c7d2fe';
            btnNew.onmouseout = () => btnNew.style.background = '#e0e7ff';
            btnNew.onclick = () => downloadDocs(true, filenameMode);

            div.appendChild(btnExpand);
            div.appendChild(btnAll);
            div.appendChild(btnNew);
            container.insertAdjacentElement('beforebegin', div);
        }
    }, 1000);
};

const expandAllDocs = async () => {
    const status = document.createElement('div');
    status.style.cssText = 'position:fixed;top:20px;right:20px;background:#0ea5e9;color:white;padding:15px;border-radius:5px;z-index:9999;box-shadow:0 4px 6px rgba(0,0,0,0.1);font-weight:500';
    status.textContent = 'Expandiere Liste...';
    document.body.appendChild(status);

    let clickCount = 0;

    const clickMore = () => {
        const moreLink = document.querySelector('.link-secondary.cursor-pointer') as HTMLElement;

        // Check if link is hidden (all docs visible) or doesn't exist
        if (!moreLink || moreLink.classList.contains('hidden')) {
            status.style.background = '#10b981';
            const count = document.querySelectorAll('table.table-post tbody tr a[href*="/doc/"]').length;
            status.textContent = `✓ Alle ${count} Dokumente angezeigt!`;
            setTimeout(() => document.body.removeChild(status), 3000);
            return;
        }

        clickCount++;
        const visibleCount = document.querySelectorAll('table.table-post tbody tr a[href*="/doc/"]').length;
        status.textContent = `${visibleCount} Dokumente sichtbar... (${clickCount} Klicks)`;

        moreLink.click();

        // Wait for DOM update, then click again
        setTimeout(clickMore, 150);
    };

    clickMore();
};

const downloadDocs = async (onlyNew: boolean, filenameMode: 'original' | 'display') => {
    const rows = document.querySelectorAll('table.table-post tbody tr');
    const docs: DocItem[] = [];

    rows.forEach(row => {
        const linkEl = row.querySelector('a[href*="/doc/"]');
        if (!linkEl) return;
        const url = linkEl.getAttribute('href');
        if (!url) return;

        const title = linkEl.textContent?.trim() || 'Dokument';
        const isNew = linkEl.classList.contains('p-base-bold');
        const dateCell = row.querySelectorAll('td')[1];
        const dateText = dateCell?.textContent?.replace('Datum', '').trim() || '';
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

    const toDownload = onlyNew ? docs.filter(d => d.isNew) : docs;
    if (toDownload.length === 0) return alert('Keine Dokumente gefunden.');
    if (!confirm(`${toDownload.length} Dokumente als ZIP herunterladen?`)) return;

    const zip = new JSZip();
    const status = document.createElement('div');
    status.style.cssText = 'position:fixed;top:20px;right:20px;background:#248eff;color:white;padding:15px;border-radius:5px;z-index:9999;box-shadow:0 4px 6px rgba(0,0,0,0.1)';
    status.textContent = `API-Daten werden geladen...`;
    document.body.appendChild(status);

    // Fetch API data for exact timestamps
    let apiDocsMap: { [id: string]: any } = {};
    try {
        const customerId = window.location.pathname.match(/\/posteingang(?:\/(\d+))?/)?.[1]
            || document.querySelector('[href*="/api/posteingang/"]')?.getAttribute('href')?.match(/\/(\d+)/)?.[1];
        if (customerId) {
            // Determine tab type based on active nav-link: Eingang=P, Archiv=A, MiFID=M
            const activeTab = document.querySelector('.nav-link.active')?.textContent?.trim() || '';
            let tabParam = 'P'; // Default to Eingang
            if (activeTab.includes('Archiv')) {
                tabParam = 'A';
            } else if (activeTab.includes('MiFID')) {
                tabParam = 'M';
            }
            const apiUrl = `https://mein.finanzen-zero.net/api/posteingang/${customerId}?t=${tabParam}&m=1000`;

            const apiResponse = await fetch(apiUrl);
            if (apiResponse.ok) {
                const apiDocs = await apiResponse.json();
                // Create map: doc ID -> API document object
                apiDocs.forEach((apiDoc: any) => {
                    apiDocsMap[apiDoc.id.toString()] = apiDoc;
                });
                console.log(`API: ${Object.keys(apiDocsMap).length} Dokumente geladen`);
            }
        }
    } catch (e) {
        console.warn('API-Abfrage fehlgeschlagen, nutze Fallback-Datum:', e);
    }

    status.textContent = `Lade 0/${toDownload.length}...`;

    // Track filenames to handle duplicates
    const filenameCount: { [key: string]: number } = {};
    // Track time offsets per date for fallback (when no API match)
    const dateTimeOffsets: { [key: string]: number } = {};

    // Helper function: Calculate fallback date (12:00 + offset)
    const getFallbackDate = (dateStr: string, offsets: { [key: string]: number }): Date => {
        const [day, month, year] = dateStr.split('.');
        const dateKey = `${year}-${month}-${day}`;

        // Initialize offset for this date if needed
        if (!offsets[dateKey]) {
            offsets[dateKey] = 0;
        }

        const minutesOffset = offsets[dateKey];
        offsets[dateKey]++; // Increment for next file on same date

        return new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            12,  // Noon
            minutesOffset,
            0,
            0
        );
    };

    let count = 0;
    for (const doc of toDownload) {
        try {
            const response = await fetch(doc.url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();

            let filename = '';
            const useDisplayMode = filenameMode === 'display';

            if (useDisplayMode) {
                // Display mode: date prefix + title
                const [day, month, year] = doc.date.split('.');
                const datePrefix = `${year}-${month}-${day}`;
                const cleanTitle = doc.title.replace(/[^a-zA-Z0-9äöüÄÖÜß \-_]/g, '').trim();
                filename = `${datePrefix}_${cleanTitle}.pdf`;
            } else {
                // Original mode: extract from headers or URL
                const contentDisp = response.headers.get('Content-Disposition');
                if (contentDisp) {
                    const match = contentDisp.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                    if (match && match[1]) filename = match[1].replace(/['"]/g, '');
                }
                if (!filename) {
                    const urlParts = doc.url.split('/');
                    filename = urlParts[urlParts.length - 1] || `doc_${doc.id}.pdf`;
                }
            }

            // Handle duplicate filenames
            if (filenameCount[filename]) {
                const base = filename.replace(/\.pdf$/i, '');
                const ext = '.pdf';
                filenameCount[filename]++;
                filename = `${base}_${filenameCount[filename]}${ext}`;
            } else {
                filenameCount[filename] = 1;
            }

            // Parse date from API data if available, otherwise fallback to DOM date + offset
            let fileDate: Date;
            const apiDoc = apiDocsMap[doc.id];

            if (apiDoc) {
                // API data available - try to get exact timestamp
                let exactDateTime: Date | null = null;

                // Priority 1: pdfOrderDateTime (has exact time)
                if (apiDoc.pdfOrderDateTime) {
                    // Format: "31.07.2025 16:16:48:00" -> "DD.MM.YYYY HH:MM:SS:MS"
                    const match = apiDoc.pdfOrderDateTime.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
                    if (match) {
                        const [, day, month, year, hour, minute, second] = match;
                        exactDateTime = new Date(
                            parseInt(year),
                            parseInt(month) - 1,
                            parseInt(day),
                            parseInt(hour),
                            parseInt(minute),
                            parseInt(second)
                        );
                    }
                }

                // Priority 2: date field (ISO format, usually midnight)
                if (!exactDateTime && apiDoc.date) {
                    // Format: "2025-08-01T00:00:00"
                    const isoDate = new Date(apiDoc.date);
                    if (!isNaN(isoDate.getTime())) {
                        // Check if it has actual time (not just midnight)
                        if (isoDate.getHours() !== 0 || isoDate.getMinutes() !== 0) {
                            exactDateTime = isoDate;
                        }
                    }
                }

                if (exactDateTime && !isNaN(exactDateTime.getTime())) {
                    fileDate = exactDateTime;
                    console.log(`✓ API-Datum für ${doc.title}: ${fileDate.toLocaleString('de-DE')}`);
                } else {
                    // API data exists but no valid timestamp - use fallback
                    fileDate = getFallbackDate(doc.date, dateTimeOffsets);
                    console.log(`⚠ API-Match aber kein Datum für ${doc.title}, Fallback: ${fileDate.toLocaleString('de-DE')}`);
                }
            } else {
                // No API match - use fallback logic
                fileDate = getFallbackDate(doc.date, dateTimeOffsets);
                console.log(`⚠ Kein API-Match für ${doc.title}, Fallback: ${fileDate.toLocaleString('de-DE')}`);
            }

            zip.file(filename, blob, { date: fileDate });
            count++;
            status.textContent = `Lade ${count}/${toDownload.length}...`;
            await new Promise(r => setTimeout(r, 100));
        } catch (e) {
            console.error('Error:', e);
        }
    }

    status.textContent = 'Erstelle ZIP...';
    try {
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipName = `Zero-Posteingang_Download_vom_${new Date().toISOString().split('T')[0]}.zip`;
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = zipName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        status.style.background = '#28a745';
        status.textContent = `✓ ${count} Dateien heruntergeladen!`;
        setTimeout(() => document.body.removeChild(status), 3000);
    } catch (e) {
        status.style.background = '#dc3545';
        status.textContent = '✗ Fehler beim Erstellen';
        setTimeout(() => document.body.removeChild(status), 5000);
    }
};
