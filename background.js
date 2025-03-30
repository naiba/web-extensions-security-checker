'use strict';

import { setBadgeAndShield } from "./utils.js";

async function getExtensionStatus(extensionId) {
    extensionId += '?&' + Date.now()
    const extensionUrl = "https://chromewebstore.google.com/detail/" + extensionId
    const statusCode = await new Promise((resolve, reject) => {
        fetch("https://playground.httpstatus.io/fetch-status", {
            headers: {
                "content-type": "application/json",
            },
            "referrer": "https://httpstatus.io/api",
            "referrerPolicy": "no-referrer-when-downgrade",
            "body": "{\"requestUrl\":\"" + extensionUrl + "\",\"userAgent\":\"chrome\",\"maxRedirects\":10,\"followRedirect\":false,\"dnsLookupIpVersion\":4,\"validateTlsCertificate\":true,\"https\":false,\"requestHeaders\":false,\"responseHeaders\":false,\"responseBody\":false,\"parsedUrl\":false,\"parsedHostname\":false,\"timings\":false,\"meta\":false}",
            "method": "POST",
        })
            .then(resp => resp.json())
            .then(data => {
                if (data.response.chain[0].redirectTo.indexOf('empty-title') != -1) {
                    resolve(404)
                } else {
                    resolve(data.response.chain[0].statusCode)
                }
            }).catch(err => reject(err))
    })
    return statusCode

}

async function checkExtensions() {
    chrome.management.getAll(async extensions => {
        var totalHighRiskExtensions = 0
        var highRiskExtensionsReason = {}
        for (let i = 0; i < extensions.length; i++) {
            const extension = extensions[i]
            try {
                // check if extension is from the webstore
                const statusCode = await getExtensionStatus(extension.id)
                if (statusCode != 301 && statusCode != 404) {
                    throw "Unexpected status code: " + statusCode
                }
                if (statusCode != 301) {
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

chrome.alarms.onAlarm.addListener((alarm) => {
    switch (alarm.name) {
        case 'CheckExtensions':
            return checkExtensions()
    }
});
