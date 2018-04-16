console.clear()

const log = console.log;

/*

fg :

activated tabId:number windowId:number
created tab

bg :

*/

/* Array used to temporarily store tab IDs. */

const tabs = {}

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

	/* backgrounded tab ? */
	if (!tab.active) {
		log("created", tab)

		tabs[tab.id] = tab
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
			case "file": // web extension can't manipulate this protocol
				break;
			default:
				chrome.tabs.update(tabId,
					{
						url: "html/tab.html?url=" + encodeURI(url)
					})
		}
	}

});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
	/*

	.windowId:number
	.isWindowClosing:false

	*/
	if (tabId in tabs) {
		delete tabs[tabId]
	}
})
