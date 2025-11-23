declare const chrome: any;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'downloadFile') {
        const { url, filename, subfolder } = request;

        let finalFilename = filename;
        if (subfolder) {
            // Remove trailing slash if present and ensure valid path
            const cleanSubfolder = subfolder.replace(/\/$/, '');
            finalFilename = `${cleanSubfolder}/${filename}`;
        }

        // Sanitize filename to prevent issues (replace illegal chars)
        finalFilename = finalFilename.replace(/[:*?"<>|]/g, '_');

        chrome.downloads.download({
            url: url,
            filename: finalFilename,
            conflictAction: 'uniquify',
            saveAs: false
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                console.error('Download failed:', chrome.runtime.lastError);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
                sendResponse({ success: true, downloadId: downloadId });
            }
        });

        return true; // Keep channel open for async response
    }
});
