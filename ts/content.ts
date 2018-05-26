let url = new URL(decodeURI(window.location.search.split("?url=")[1]))

/*

	remove tracking from google search @bonus

*/

if (url.hostname.match("^www.google.[a-z]+$")) {

	let realURL = url.searchParams.get("url")

	if (realURL) {
		url = new URL(realURL)
	}
}

/*

	add the favicon of the site @hack.
	google api works better but there is privacy issues...

*/

//let favicon = "https://www.google.com/s2/favicons?domain=" + encodeURIComponent(url.origin)

let favicon = url.origin + "/favicon.ico"
document.getElementById("favicon").setAttribute("href", favicon)

document.title = url.href

window.addEventListener("error", e => {
	document.getElementById("app").innerText = e.message;

})

window.addEventListener("focus", e => {
	window.location.replace(url.href)
})
