const n=require("fs"),o=require("path"),s="https://dodch.com",f=n.readdirSync(__dirname).filter(i=>i.endsWith(".html"));let a="";f.forEach(i=>{const c=n.readFileSync(o.join(__dirname,i),"utf-8").match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);c&&c.forEach(l=>{try{const r=l.replace(/<script type="application\/ld\+json">/,"").replace(/<\/script>/,""),e=JSON.parse(r);if(e["@type"]==="Product"){const p=e.sku||e.mpn||i.replace(".html",""),d=e.name,g=e.description||"",m=e.offers?.url||`${s}/${i}`;let t="";Array.isArray(e.image)?t=e.image[0]:typeof e.image=="string"&&(t=e.image);let h=e.offers?.price?`${e.offers.price} TND`:"";a+=`
    <item>
      <g:id>${p}</g:id>
      <g:title>${d.replace(/&/g,"&amp;")}</g:title>
      <g:description>${g.replace(/&/g,"&amp;")}</g:description>
      <g:link>${m}</g:link>
      <g:image_link>${t}</g:image_link>
      <g:brand>${e.brand?.name||"DODCH"}</g:brand>
      <g:condition>new</g:condition>
      <g:availability>in_stock</g:availability>
      <g:price>${h}</g:price>
    </item>`}}catch{}})});const y=`<?xml version="1.0"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>DODCH Products</title>
    <link>${s}</link>
    <description>DODCH Product Data Feed</description>
    ${a}
  </channel>
</rss>`;n.writeFileSync(o.join(__dirname,"products.xml"),y),console.log("\u2705 Generated products.xml feed for Google Merchant Center");
