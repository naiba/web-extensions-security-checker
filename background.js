'use strict';

import { setBadgeAndShield } from "./utils.js";

const extensionUrlRegex = (extensionId) => new RegExp(`https:\/\/chromewebstore\\.google\\.com\/detail\/([^\\/]*)\/${extensionId}`);

async function getStatusFromResponseText(proxy, extensionId, urlEncode, customOptions) {
    const extensionUrl = "https://chromewebstore.google.com/detail/" + extensionId + '?&' + Date.now()
    const resp = await fetch(`${proxy}${urlEncode ? encodeURIComponent(extensionUrl) : extensionUrl}`, customOptions)
    const respText = await resp.text()
    const match = respText.match(extensionUrlRegex(extensionId))
    console.log(new URL(proxy).hostname, match);
    return match[1] != 'empty-title'
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

async function getExtensionStatus(extensionId) {
    const proxies = shuffleArray([
        "https://api.codetabs.com/v1/proxy/?quest=",
        "https://universal-cors-proxy.glitch.me/",
        "https://api.allorigins.win/get?url=",
        "https://corsproxy.io/?",
    ])
    const disableUrlEncode = {
        "https://thingproxy.freeboard.io/fetch/": true,
    }
    const customOptions = {
        "https://thingproxy.freeboard.io/fetch/": {
            headers: {
            }
        }
    }
    return await new Promise(async (resolve, reject) => {
        for (let i = 0; i < proxies.length; i++) {
            const proxy = proxies[i];
            try {
                resolve(await getStatusFromResponseText(proxy,
                    extensionId,
                    !disableUrlEncode[proxy],
                    customOptions[proxy]))
                break
            } catch (error) {
                console.error(`Error fetching from ${proxy}: ${error}`);
            }
        }
        reject("Fetch failed")
    })
}

async function checkExtensions() {
    chrome.management.getAll(async extensions => {
        var totalHighRiskExtensions = 0
        var highRiskExtensionsReason = {}
        for (let i = 0; i < extensions.length; i++) {
            const extension = extensions[i]
            // 跳过非 Chrome Web Store 的扩展或自身的扩展
            if (!extension.updateUrl || !extension.updateUrl.includes('google.com')) {
                console.log(`Skipping check for non-CWS extension: ${extension.name} (${extension.id})`);
                continue;
            }
            try {
                // check if extension is from the webstore
                const ret = await getExtensionStatus(extension.id)
                if (!ret) {
                    totalHighRiskExtensions++
                    highRiskExtensionsReason[extension.id] = "Removed in webstore"
                }
            } catch (error) {
                if (typeof error == "object" && 'message' in error) {
                    error = error.message
                }
                totalHighRiskExtensions++
                highRiskExtensionsReason[extension.id] = "Error checking webstore: " + error
            }
            await new Promise((resolve, reject) => setTimeout(resolve, Math.random() * 5000 + 5000))
        }
        setBadgeAndShield(totalHighRiskExtensions, false)
        chrome.storage.sync.set({ totalHighRiskExtensions: totalHighRiskExtensions, highRiskExtensionsReason: highRiskExtensionsReason })
    })
}

chrome.runtime.onInstalled.addListener(async () => {
    checkExtensions()
    chrome.alarms.create('CheckExtensions', { periodInMinutes: 60 })
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name == 'CheckExtensions') {
        await checkExtensions();
    }
});

chrome.runtime.onStartup.addListener(async () => {
    checkExtensions();
    chrome.alarms.get('CheckExtensions', (alarm) => {
        if (!alarm) {
            console.log('Alarm "CheckExtensions" not found on startup, recreating.');
            chrome.alarms.create('CheckExtensions', { periodInMinutes: 60 });
        }
    });
});
