## LoadTabOnSelect Evolution

**20180505 Version 1.3**

add favicon to the tab (not always working btw, but google favicon api has privacy issues)
bonus : remove google link obfuscation/referer/sniffing whatever it's called.

**20180418 Version 1.2**

fix : forget decodeURI (google search was broken)

**20180416 Version 1.1**

add : ignoring file:// to respect web extension policy

**20180416 Version 1.0**

Forked from the original https://addons.mozilla.org/en-US/firefox/addon/loadtabonselect/

#### Description

LoadTabOnSelect prevents new tabs from automatically loading, instead loading them on selection.

The intended usage of the addon is to facilitate power-users who open many tabs before viewing, but dislike auto-playing videos (and other annoyances).

This addon uses the WebExtensions API, and therefore fully supports Firefox 48+ (tested on Firefox ESR).

The only required permission is `tabs`.

As a bonus the extension "fix" google.* search links prefix.

#### Tips about:config

To background a page with ctrl set browser.tabs.loadInBackground to true.
To background popup with ctrl set browser.tabs.loadDivertedInBackground to true.
To background bookmarked links set browser.tabs.loadBookmarksInBackground to true.

#### Download

[Mozilla Add-ons (AMO)](https://addons.mozilla.org/en-US/firefox/addon/loadtabonselect-evolution/)

---

#### Privacy

LoadTabOnSelect does not collect any user data.

The extension is hosted entirely on GitHub, and Mozilla Add-ons (AMO). These services may independently collect user data.
