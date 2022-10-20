'use strict';

import { setBadgeAndShield } from "./utils.js";

async function checkExtensions() {
    chrome.management.getAll(async extensions => {
        var totalHighRiskExtensions = 0
        var highRiskExtensionsReason = {}
        for (let i = 0; i < extensions.length; i++) {
            const extension = extensions[i]
            // check if extension is from the webstore
            const extensionWebstoreUrl = "https://cdnjs.me/cs/" + extension.id
            const resp = await (await fetch(extensionWebstoreUrl)).json()
            if (!resp.title) {
                totalHighRiskExtensions++
                highRiskExtensionsReason[extension.id] = "Removed in webstore"
            }
        }
        setBadgeAndShield(totalHighRiskExtensions, false)
        chrome.storage.sync.set({ totalHighRiskExtensions: totalHighRiskExtensions, highRiskExtensionsReason: highRiskExtensionsReason })
    })
}

chrome.runtime.onInstalled.addListener(async () => {
    checkExtensions()
    chrome.alarms.create('CheckExtensions', { periodInMinutes: 30 })
});

chrome.alarms.onAlarm.addListener((alarm) => {
    switch (alarm.name) {
        case 'CheckExtensions':
            return checkExtensions()
    }
});
