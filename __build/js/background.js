const DEBUG = false;
const debug = console.debug;
const error = console.error;
let settings = {
    prefetching: true
};
const storage = chrome.runtime.id.includes("@temporary-addon") ? chrome.storage.local : chrome.storage.sync;
const tabs = [];
const isChrome = chrome.runtime.getURL("").split("-")[0] == "chrome";
storage.get(null, (items) => {
    if (items) {
        Object.assign(settings, items);
        DEBUG && debug("settings", settings);
    }
});
function onCreated(tab) {
    DEBUG && debug("onCreated", tab);
    if (tab.active == false) {
        tabs[tab.id] = {
            isSleeping: false,
            title: null,
            url: null,
            id: tab.id,
            faviconUrl: null,
            stop: true
        };
    }
}
function cleanUpLink(url) {
    DEBUG && debug(url);
    if (url.hostname.match("^www.youtube.[a-z]+$") && url.pathname == "/redirect") {
        return url.searchParams.get("q");
    }
    else if (url.hostname.match("^www.google.[a-z]+$") && url.pathname == "/url") {
        return url.searchParams.get("url");
    }
    else {
        return url.href;
    }
}
function onUpdated(tabId, changeInfo, tabInfo) {
    DEBUG && debug("onUpdated", tabId, changeInfo, tabInfo);
    if (tabId in tabs) {
        let tab = tabs[tabId];
        DEBUG && debug("tab", tab);
        if (tab.isSleeping) {
        }
        else {
            if (changeInfo.url && changeInfo.url != "about:blank")
                tab.url = changeInfo.url;
            if (changeInfo.title)
                tab.title = changeInfo.title;
            if (changeInfo.favIconUrl)
                tab.faviconUrl = changeInfo.favIconUrl;
            if (changeInfo.status && changeInfo.status == "complete" && tab.url) {
                tab.isSleeping = true;
                let url = new URL(tab.url);
                let protocol = url.protocol;
                switch (protocol) {
                    case "file:":
                    case "moz-extension:":
                    case "chrome-extension:":
                    case "about:":
                    case "chrome:":
                        delete tabs[tab.id];
                        break;
                    case "http:":
                    case "https:":
                        tab.url = cleanUpLink(url);
                        if (tab.title || !settings.prefetching)
                            return;
                        tab.stop = false;
                        DEBUG && debug("prefetching", tab);
                        fetch(tab.url, {
                            credentials: "include"
                        })
                            .then(res => res.text())
                            .then(body => {
                            tab.stop = true;
                            let html = new DOMParser().parseFromString(body, "text/html");
                            let titles = html.querySelectorAll("head title");
                            tab.title = titles.length ? titles[0].textContent : tab.url;
                            DEBUG && debug("titles", titles);
                            let links = html.querySelectorAll("head link");
                            let icons = [];
                            icons.push({
                                href: chrome.runtime.getURL("img/icon.png"),
                                size: 0
                            });
                            links.forEach(link => {
                                if (link.getAttribute("rel") == "icon") {
                                    let size = (link.getAttribute("sizes") || "32x32").split("x")[0];
                                    icons.push({
                                        href: new URL(link.getAttribute("href"), tab.url),
                                        size: size
                                    });
                                }
                            });
                            DEBUG && debug("favicons", icons);
                            tab.faviconUrl = icons.sort((a, b) => b.size - a.size)[0].href;
                            chrome.tabs.update(tabId, {
                                url: `html/tab.html?data=${encodeURIComponent(JSON.stringify(tab))}`
                            });
                            tab.stop = false;
                            DEBUG && debug(tab);
                        })
                            .catch(err => {
                            error(err);
                        });
                        break;
                    default:
                        error(protocol, tab.url);
                }
            }
        }
    }
}
function onActivated(activeInfo) {
    DEBUG && debug("onActivated", activeInfo);
    if (activeInfo.tabId in tabs) {
        let tab = tabs[activeInfo.tabId];
        let url = tab.url;
        if (!url)
            throw "url is empty !!!";
        delete tabs[activeInfo.tabId];
        chrome.tabs.update({
            url: url
        });
    }
}
function onRemoved(tabId, removeInfo) {
    DEBUG && debug("onRemoved", tabId, removeInfo);
    if (tabId in tabs) {
        delete tabs[tabId];
    }
}
function onBeforeRequest(details) {
    if (details.tabId < 0 && details.documentUrl && details.documentUrl.startsWith("moz-extension://")) {
        DEBUG && debug("addon bypass", details);
    }
    else if (details.tabId in tabs) {
        let tab = tabs[details.tabId];
        if (!tab.url)
            tab.url = details.url;
        if (tab.stop) {
            DEBUG && debug("block", details);
            return {
                cancel: true
            };
        }
        else {
            DEBUG && debug("allow", details);
        }
    }
    else {
    }
}
function onMessage(msg, sender, sendResponse) {
    try {
        if (msg == "settings") {
            sendResponse(settings);
        }
        else {
            settings = msg;
            storage.set(settings);
            DEBUG && console.debug("update settings", settings);
        }
    }
    catch (e) {
        error(e);
    }
}
chrome.runtime.onMessage.addListener(onMessage);
chrome.tabs.onUpdated.addListener(onUpdated);
chrome.tabs.onCreated.addListener(onCreated);
chrome.tabs.onActivated.addListener(onActivated);
chrome.tabs.onRemoved.addListener(onRemoved);
chrome.webRequest.onBeforeRequest.addListener(onBeforeRequest, {
    urls: ["<all_urls>"]
}, [
    "blocking"
]);
DEBUG && fetch("https://httpbin.org/headers")
    .then(res => res.json())
    .then(headers => {
    debug("headers %o", headers);
})
    .catch(error);
