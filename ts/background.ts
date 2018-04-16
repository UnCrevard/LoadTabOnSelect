console.clear()

const log = console.log;

/*

fore :

activated tabId:number windowId:number
created tab

bg :

*/

const tabs = {}

/* Array used to temporarily store tab IDs. */

const managedTabs = [];

/* Function to redirect a selected tab to its actual url. */

function handleActivated(activeInfo: chrome.tabs.TabActiveInfo) {


	if (activeInfo.tabId in tabs) {
		log("activated", activeInfo)
		log(tabs[activeInfo.tabId].url)
	}

	/*
		chrome.tabs.get(activeInfo.tabId,tab=>
		{
			if (tab.url.startsWith(chrome.extension.getURL("/html/tab.html?managedUrl=")))
			{
				chrome.tabs.update(activeInfo.tabId,
				{
					url: tab.url.split("/html/tab.html?managedUrl=")[1]
				});
			}
		}).then(function() {
			managedTabs.splice(managedTabs.indexOf(activeInfo.tabId), 1);
		});
	*/
}

/* Function to store a newly-created tab's id to the managedTabs array. */

/*

open in bg :

active:false
highlighted:false
selected:false
status:"loading"
title:"Connecting..."
url:"about:blank"

open in fg :
active:true
highlighted:true
selected:true
status:"complete"
url:"about:newtab"

*/
chrome.tabs.onCreated.addListener(tab => {

	/* bg ? */
	if (!tab.active) {
		log("created", tab)

		tabs[tab.id] = tab
		managedTabs.push(tab.id);
	}
});

/* Function to wait until the url of the tab is set, and redirect the loaded tab to a local addon page. */

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tabInfo) => {

	/*

	changeInfo.status:undefined
	changeInfo{status:"complete",url:string}
	changeInfo{status:"loading"}
	changeInfo{status:"loading",url:string}
	changeInfo{favIconUrl:url}
	changeInfo{status:"complete"}
	changeInfo{status:undefined}


	*/
	if (tabInfo.active == false && changeInfo.url && tabId in tabs) {
		let url = changeInfo.url
		let proto = url.split(":")[0]
		log("updated", tabId, changeInfo, tabInfo)

		switch (proto) {
			case "moz-extension":
			case "chrome-extension":
			case "about":
				break;
			default:
				chrome.tabs.update(tabId,
					{
						url: "html/tab.html?url=" + encodeURI(url)
					})
		}
	}

	/*
		if (changeInfo.url !== undefined
			&& managedTabs.includes(tabId)
			&& !changeInfo.url.startsWith("moz-extension://")
			&& !changeInfo.url.startsWith("about:")) {
			chrome.tabs.update(tabId, {
				url: "html/tab.html?managedUrl=" + changeInfo.url
			});
		}
	*/
});
chrome.tabs.onActivated.addListener(handleActivated);
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
	/*

	.windowId:number
	.isWindowClosing:false

	*/
	if (tabId in tabs) {
		delete tabs[tabId]
	}
})
