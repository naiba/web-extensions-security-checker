'use strict';

import { setBadgeAndShield } from "./utils.js";

const HIGH_RISK_PERMISSIONS = ['debugger', 'nativeMessaging'];
const MEDIUM_RISK_PERMISSIONS = ['cookies', 'webRequest', 'webRequestBlocking', 'history', 'bookmarks', 'clipboardRead', 'topSites', 'management'];
const BROAD_HOST_PATTERNS = ['<all_urls>', '*://*/*', 'http://*/*', 'https://*/*'];

const RISK_PRIORITY = { high: 3, medium: 2, low: 1 };

function maxRiskLevel(current, incoming) {
    return (RISK_PRIORITY[incoming] > RISK_PRIORITY[current]) ? incoming : current;
}

async function getExtensionStatus(extensionId) {
    const url = `https://update.googleapis.com/service/update2/crx?response=updatecheck&acceptformat=crx3&prodversion=120.0&x=id%3D${extensionId}%26uc`
    const resp = await fetch(url)
    const text = await resp.text()
    console.log('check', extensionId, text);
    return text.includes('status="ok"') && text.includes('<updatecheck')
}

function checkPermissionRisk(extension) {
    const reasons = [];
    let riskLevel = null;

    const perms = extension.permissions || [];
    const hostPerms = extension.hostPermissions || [];

    const foundHigh = perms.filter(p => HIGH_RISK_PERMISSIONS.includes(p));
    if (foundHigh.length) {
        reasons.push(`Sensitive permissions: ${foundHigh.join(', ')}`);
        riskLevel = maxRiskLevel(riskLevel || 'low', 'high');
    }

    const foundMedium = perms.filter(p => MEDIUM_RISK_PERMISSIONS.includes(p));
    if (foundMedium.length >= 2) {
        reasons.push(`Sensitive permissions: ${foundMedium.join(', ')}`);
        riskLevel = maxRiskLevel(riskLevel || 'low', 'medium');
    }

    const foundBroadHost = hostPerms.filter(h => BROAD_HOST_PATTERNS.includes(h));
    if (foundBroadHost.length) {
        reasons.push(`Broad host access: ${foundBroadHost.join(', ')}`);
        riskLevel = maxRiskLevel(riskLevel || 'low', 'high');
    }

    return { reasons, riskLevel };
}

function checkInstallSource(extension) {
    const installType = extension.installType;
    if (installType === 'sideload') {
        return { reasons: ['Sideloaded by external software'], riskLevel: 'medium' };
    }
    if (installType === 'development') {
        return { reasons: ['Loaded in developer mode'], riskLevel: 'low' };
    }
    if (installType === 'other') {
        return { reasons: ['Installed from unknown source'], riskLevel: 'medium' };
    }
    return { reasons: [], riskLevel: null };
}

function checkVersionAndPermissionChanges(extension, snapshot) {
    if (!snapshot) return { reasons: [], riskLevel: null };

    const reasons = [];
    let riskLevel = null;

    if (snapshot.version && snapshot.version !== extension.version) {
        reasons.push(`Version changed: ${snapshot.version} → ${extension.version}`);
        riskLevel = maxRiskLevel(riskLevel || 'low', 'low');
    }

    const currentPerms = extension.permissions || [];
    const oldPerms = snapshot.permissions || [];
    const newPerms = currentPerms.filter(p => !oldPerms.includes(p));
    if (newPerms.length) {
        reasons.push(`New permissions added: ${newPerms.join(', ')}`);
        riskLevel = maxRiskLevel(riskLevel || 'low', 'medium');
    }

    const currentHostPerms = extension.hostPermissions || [];
    const oldHostPerms = snapshot.hostPermissions || [];
    const newHostPerms = currentHostPerms.filter(h => !oldHostPerms.includes(h));
    if (newHostPerms.length) {
        reasons.push(`New host permissions added: ${newHostPerms.join(', ')}`);
        riskLevel = maxRiskLevel(riskLevel || 'low', 'medium');
    }

    return { reasons, riskLevel };
}

async function checkExtensions() {
    const extensions = await chrome.management.getAll()
    const targets = extensions.filter(e => e.enabled && e.updateUrl && e.updateUrl.includes('google.com'))
    const highRiskExtensionsReason = {}
    let checked = 0

    const { extensionSnapshots: savedSnapshots, dismissedAlerts: savedDismissed } = await chrome.storage.local.get(['extensionSnapshots', 'dismissedAlerts']);
    const oldSnapshots = savedSnapshots || {};
    const dismissed = savedDismissed || {};
    const newSnapshots = {};

    await chrome.storage.local.set({ checkStatus: 'checking', checked: 0, total: targets.length, highRiskExtensionsReason })

    for (const extension of targets) {
        const reasons = [];
        let riskLevel = null;

        try {
            const exists = await getExtensionStatus(extension.id)
            if (!exists) {
                reasons.push('Removed from Chrome Web Store');
                riskLevel = maxRiskLevel(riskLevel || 'low', 'high');
            }
        } catch (error) {
            const msg = (typeof error == "object" && 'message' in error) ? error.message : error
            reasons.push('Error checking webstore: ' + msg);
            riskLevel = maxRiskLevel(riskLevel || 'low', 'high');
        }

        const permCheck = checkPermissionRisk(extension);
        if (permCheck.riskLevel) {
            reasons.push(...permCheck.reasons);
            riskLevel = maxRiskLevel(riskLevel || 'low', permCheck.riskLevel);
        }

        const sourceCheck = checkInstallSource(extension);
        if (sourceCheck.riskLevel) {
            reasons.push(...sourceCheck.reasons);
            riskLevel = maxRiskLevel(riskLevel || 'low', sourceCheck.riskLevel);
        }

        const changeCheck = checkVersionAndPermissionChanges(extension, oldSnapshots[extension.id]);
        if (changeCheck.riskLevel) {
            reasons.push(...changeCheck.reasons);
            riskLevel = maxRiskLevel(riskLevel || 'low', changeCheck.riskLevel);
        }

        newSnapshots[extension.id] = {
            version: extension.version,
            permissions: extension.permissions || [],
            hostPermissions: extension.hostPermissions || [],
        };

        if (reasons.length) {
            const fingerprint = [...reasons].sort().join('|');
            highRiskExtensionsReason[extension.id] = { reasons, riskLevel, fingerprint };
        }

        checked++
        const badgeCount = Object.entries(highRiskExtensionsReason)
            .filter(([id, v]) => (v.riskLevel === 'high' || v.riskLevel === 'medium') && dismissed[id] !== v.fingerprint)
            .length;
        setBadgeAndShield(badgeCount)
        await chrome.storage.local.set({ checked, highRiskExtensionsReason })
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 1000))
    }

    await chrome.storage.local.set({ checkStatus: 'done', lastCheckTime: Date.now(), extensionSnapshots: newSnapshots })
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
