console.clear();
const log = console.log;
const tabs = {};
const managedTabs = [];
function handleActivated(activeInfo) {
    if (activeInfo.tabId in tabs) {
        log("activated", activeInfo);
        log(tabs[activeInfo.tabId].url);
    }
}
chrome.tabs.onCreated.addListener(tab => {
    if (!tab.active) {
        log("created", tab);
        tabs[tab.id] = tab;
        managedTabs.push(tab.id);
    }
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tabInfo) => {
    if (tabInfo.active == false && changeInfo.url && tabId in tabs) {
        let url = changeInfo.url;
        let proto = url.split(":")[0];
        log("updated", tabId, changeInfo, tabInfo);
        switch (proto) {
            case "moz-extension":
            case "chrome-extension":
            case "about":
                break;
            default:
                chrome.tabs.update(tabId, {
                    url: "html/tab.html?url=" + encodeURI(url)
                });
        }
    }
});
chrome.tabs.onActivated.addListener(handleActivated);
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    if (tabId in tabs) {
        delete tabs[tabId];
    }
});
