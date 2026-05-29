const { execSync } = require('child_process');

async function test() {
    try {
        console.log("Fetching products from REST API...");
        const response1 = await fetch("https://firestore.googleapis.com/v1/projects/dodch-96b15/databases/(default)/documents/products");
        const products = await response1.json();
        console.log("\n--- PRODUCTS COLLECTION ---");
        if (products.documents) {
            products.documents.forEach(doc => {
                const docId = doc.name.split('/').pop();
                console.log(`Doc ID: ${docId}`);
                console.log(JSON.stringify(doc.fields, null, 2));
            });
        } else {
            console.log("No documents or error:", products);
        }

        console.log("\nFetching prices from REST API...");
        const response2 = await fetch("https://firestore.googleapis.com/v1/projects/dodch-96b15/databases/(default)/documents/prices");
        const prices = await response2.json();
        console.log("\n--- PRICES COLLECTION ---");
        if (prices.documents) {
            prices.documents.forEach(doc => {
                const docId = doc.name.split('/').pop();
                console.log(`Doc ID: ${docId}`);
                console.log(JSON.stringify(doc.fields, null, 2));
            });
        } else {
            console.log("No documents or error:", prices);
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
