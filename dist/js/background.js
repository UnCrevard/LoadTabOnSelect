const tabs = {};
chrome.tabs.onCreated.addListener(tab => {
    if (!tab.active) {
        tabs[tab.id] = tab;
    }
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tabInfo) => {
    if (tabInfo.active == false && changeInfo.url && tabId in tabs) {
        let url = changeInfo.url;
        let proto = url.split(":")[0];
        switch (proto) {
            case "moz-extension":
            case "chrome-extension":
            case "about":
            case "file":
                break;
            default:
                chrome.tabs.update(tabId, {
                    url: "html/tab.html?url=" + encodeURI(url)
                });
        }
    }
});
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    if (tabId in tabs) {
        delete tabs[tabId];
    }
});
