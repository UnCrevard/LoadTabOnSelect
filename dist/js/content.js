let url = new URL(decodeURI(window.location.search.split("?url=")[1]));
if (url.hostname.match("^www.google.[a-z]+$")) {
    let realURL = url.searchParams.get("url");
    if (realURL) {
        url = new URL(realURL);
    }
}
let favicon = url.origin + "/favicon.ico";
document.getElementById("favicon").setAttribute("href", favicon);
document.title = url.href;
window.addEventListener("error", e => {
    document.getElementById("app").innerText = e.message;
});
window.addEventListener("focus", e => {
    window.location.replace(url.href);
});
