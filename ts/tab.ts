export {}
/*

	basically set the title and the favicon on the page

 */

const data = window.location.search.split("?data=")[1]

const tab: Tab = JSON.parse(decodeURIComponent(data))

document.title = tab.title
document.getElementById("favicon").setAttribute("href", tab.faviconUrl)
document.getElementById("url").setAttribute("href", tab.url)
