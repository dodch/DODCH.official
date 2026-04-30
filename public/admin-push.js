import { getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import * as jose from "https://cdn.jsdelivr.net/npm/jose@5.2.3/dist/browser/index.js";

document.addEventListener('DOMContentLoaded', () => {
    // We wait briefly for script.js to initialize Firebase
    setTimeout(() => {
        try {
            const app = getApp();
            const db = getFirestore(app);
            initAdminPush(db);
        } catch(e) {
            console.error("Firebase not initialized yet for push:", e);
        }
    }, 1000);
});

function initAdminPush(db) {
    const credsInput = document.getElementById('push-credentials-input');
    const saveBtn = document.getElementById('save-push-creds-btn');
    const statusSpan = document.getElementById('push-creds-status');
    const sendBtn = document.getElementById('send-push-btn');

    // Load saved creds (don't display them fully for security, just show a placeholder)
    const savedCredsStr = localStorage.getItem('dodchUrlFCMCreds');
    if (savedCredsStr) {
        credsInput.value = "******** (Credentials Saved Securely)";
        statusSpan.textContent = "✅ Saved";
        statusSpan.style.color = "green";
    }

    saveBtn.addEventListener('click', () => {
        const val = credsInput.value.trim();
        if (val && !val.includes('********')) {
            try {
                // Verify it's valid JSON
                JSON.parse(val);
                localStorage.setItem('dodchUrlFCMCreds', val);
                credsInput.value = "******** (Credentials Saved Securely)";
                statusSpan.textContent = "✅ Saved";
                statusSpan.style.color = "green";
                if(window.showToast) window.showToast("Credentials saved to local browser.", "success");
            } catch(e) {
                statusSpan.textContent = "❌ Invalid JSON";
                statusSpan.style.color = "red";
                if(window.showToast) window.showToast("Please enter a valid JSON service account file.", "error");
            }
        }
    });

    sendBtn.addEventListener('click', async () => {
        const title = document.getElementById('push-title').value.trim();
        const body = document.getElementById('push-body').value.trim();
        const url = document.getElementById('push-url').value.trim();
        const image = document.getElementById('push-image').value.trim();
        const credsStr = localStorage.getItem('dodchUrlFCMCreds');

        if(!title || !body) {
            return window.showToast("Title and message body are required.", "error");
        }
        if(!credsStr) {
            return window.showToast("Please paste and save your Service Account JSON first.", "error");
        }

        const creds = JSON.parse(credsStr);
        const originalText = sendBtn.innerHTML;
        sendBtn.innerHTML = "Generating Token...";
        sendBtn.disabled = true;

        try {
            // 1. Generate JWT using jose
            const privateKey = await jose.importPKCS8(creds.private_key, "RS256");
            const jwt = await new jose.SignJWT({
                iss: creds.client_email,
                scope: "https://www.googleapis.com/auth/firebase.messaging",
                aud: "https://oauth2.googleapis.com/token"
            })
            .setProtectedHeader({ alg: "RS256", typ: "JWT" })
            .setIssuedAt()
            .setExpirationTime("1h")
            .sign(privateKey);

            // 2. Exchange JWT for Google OAuth Access Token
            sendBtn.innerHTML = "Fetching Access Token...";
            const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
                    assertion: jwt
                })
            });

            if (!tokenRes.ok) throw new Error("Failed to get Google Access Token. Check your JSON key.");
            const tokenData = await tokenRes.json();
            const accessToken = tokenData.access_token;

            // 3. Fetch all subscribers from Firestore
            sendBtn.innerHTML = "Fetching Subscribers...";
            const subSnapshot = await getDocs(collection(db, "subscribers"));
            const tokens = [];
            subSnapshot.forEach(doc => tokens.push(doc.data().token));

            if(tokens.length === 0) {
                sendBtn.innerHTML = originalText;
                sendBtn.disabled = false;
                return window.showToast("No active subscribers found.", "info");
            }

            // 4. Send FCM Message to each token
            sendBtn.innerHTML = `Sending to ${tokens.length}...`;
            let success = 0;
            let failed = 0;

            for (const token of tokens) {
                const messagePayload = {
                    message: {
                        token: token,
                        // webpush section controls what Chrome/browsers show
                        webpush: {
                            notification: {
                                title: title,
                                body: body,
                                icon: '/IMG_3352.webp',
                                ...(image && { image })
                            },
                            fcmOptions: {
                                link: url || '/'
                            }
                        },
                        // data payload so the service worker can also read it
                        data: {
                            title: title,
                            body: body,
                            url: url || '/',
                            ...(image && { image })
                        }
                    }
                };

                const pushRes = await fetch(`https://fcm.googleapis.com/v1/projects/${creds.project_id}/messages:send`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(messagePayload)
                });

                if(pushRes.ok) success++;
                else failed++;
            }

            window.showToast(`Push Finished: ${success} sent, ${failed} failed.`, "success");
            
            // Clear form
            document.getElementById('push-title').value = '';
            document.getElementById('push-body').value = '';
            document.getElementById('push-url').value = '';
            document.getElementById('push-image').value = '';

        } catch(err) {
            console.error("Push sending error:", err);
            window.showToast(err.message || "Failed to send notification.", "error");
        } finally {
            sendBtn.innerHTML = originalText;
            sendBtn.disabled = false;
        }
    });

}

// Export this to the global scope so script.js can call it during order updates
window.sendTargetedPushNotification = async function(db, targetUserId, title, body, url) {
    const credsStr = localStorage.getItem('dodchUrlFCMCreds');
    if (!credsStr) {
        console.warn('Cannot send automated push: Missing FCM credentials in localStorage.');
        if (window.showToast) window.showToast("Push Not Sent: Admin missing FCM Credentials.", "info");
        return false;
    }

    try {
        const creds = JSON.parse(credsStr);
        
        // 1. Generate JWT
        const privateKey = await jose.importPKCS8(creds.private_key, "RS256");
        const jwt = await new jose.SignJWT({
            iss: creds.client_email,
            scope: "https://www.googleapis.com/auth/firebase.messaging",
            aud: "https://oauth2.googleapis.com/token"
        })
        .setProtectedHeader({ alg: "RS256", typ: "JWT" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(privateKey);

        // 2. Exchange JWT for Google OAuth Access Token
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
                assertion: jwt
            })
        });

        if (!tokenRes.ok) throw new Error("Failed to get Google Access Token.");
        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;

        // 3. Find tokens for this specific user
        const q = query(collection(db, "subscribers"), where("userId", "==", targetUserId));
        const subSnapshot = await getDocs(q);
        
        const tokens = [];
        subSnapshot.forEach(doc => tokens.push(doc.data().token));

        if (tokens.length === 0) {
            console.log(`No subscriber tokens found for user ${targetUserId}`);
            if (window.showToast) window.showToast(`Push Not Sent: User has not allowed notifications.`, "info");
            return false;
        }

        // 4. Send FCM Message to each token
        for (const token of tokens) {
            const messagePayload = {
                message: {
                    token: token,
                    webpush: {
                        notification: {
                            title: title,
                            body: body,
                            icon: '/IMG_3352.webp'
                        },
                        fcmOptions: {
                            link: url || '/'
                        }
                    },
                    data: {
                        title: title,
                        body: body,
                        url: url || '/'
                    }
                }
            };

            await fetch(`https://fcm.googleapis.com/v1/projects/${creds.project_id}/messages:send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(messagePayload)
            });
        }
        
        console.log(`Successfully sent targeted push notification to user ${targetUserId}`);
        return true;
        
    } catch(err) {
        console.error("Targeted push sending error:", err);
        return false;
    }
};
