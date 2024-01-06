'use strict';

import { setBadgeAndShield } from "./utils.js";

async function getExtensionStatus(extensionId) {
    extensionId += '?&' + Date.now()
    try {
        const statusCode = await new Promise((resolve, reject) => {
            fetch("https://corsproxy.io/?https://chrome.google.com/webstore/detail/" + extensionId, {
                redirect: 'manual'
            }).then(response => {
                resolve(response.type == 'opaqueredirect' ? 301 : response.status)
                return {}
            }).catch(err => {
                reject(err)
            })
        });
        return statusCode
    } catch (error) {
    }
    try {
        const statusCode = await new Promise((resolve, reject) => {
            fetch("https://api.allorigins.win/get?url=https://chrome.google.com/webstore/detail/" + extensionId, {
                redirect: 'manual'
            }).then(resp => resp.json()).then(data => resolve(data.status.http_code == 200 ? 301 : data.status.http_code)).catch(err => reject(err))
        });
        return statusCode
    } catch (error) {
        throw error
    }
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
    chrome.alarms.create('CheckExtensions', { periodInMinutes: 30 })
});

chrome.alarms.onAlarm.addListener((alarm) => {
    switch (alarm.name) {
        case 'CheckExtensions':
            return checkExtensions()
    }
});
