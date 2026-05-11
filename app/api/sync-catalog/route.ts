import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * LOCAL SYNC API
 * This updates script.js with the latest Firestore data so you can 
 * commit/publish your reordering changes immediately.
 */
export async function POST(request: Request) {
    try {
        const catalogData = await request.json();
        const filePath = path.join(process.cwd(), 'script.js');
        
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'script.js not found.' }, { status: 404 });
        }

        let content = fs.readFileSync(filePath, 'utf8');
        const regex = /const\s+defaultProductCatalog\s*=\s*\{[\s\S]*?\n\s{4}\};/;
        
        const newCatalogCode = `const defaultProductCatalog = ${JSON.stringify(catalogData, null, 8)};`;
        
        if (!regex.test(content)) {
            return NextResponse.json({ error: 'Could not find catalog in script.js' }, { status: 500 });
        }

        fs.writeFileSync(filePath, content.replace(regex, newCatalogCode), 'utf8');
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
