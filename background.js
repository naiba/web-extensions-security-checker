'use strict';

import { setBadgeAndShield } from "./utils.js";

async function checkExtensions() {
    chrome.management.getAll(async extensions => {
        var totalHighRiskExtensions = 0
        var highRiskExtensionsReason = {}
        for (let i = 0; i < extensions.length; i++) {
            const extension = extensions[i]
            try {
                // check if extension is from the webstore
                const statusCode = await new Promise((resolve, reject) => {
                    fetch("https://corsproxy.io/?https://chrome.google.com/webstore/detail/" + extension.id, {
                        redirect: 'manual'
                    }).then(response => {
                        resolve(response.type == 'opaqueredirect' ? 301 : response.status)
                        return {}
                    }).catch(err => {
                        reject(err)
                    })
                });
                if (statusCode != 301) {
                    totalHighRiskExtensions++
                    highRiskExtensionsReason[extension.id] = "Removed in webstore"
                }
            } catch (error) {
                continue;
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
