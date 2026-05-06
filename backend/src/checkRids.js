const fetch = require('node-fetch')

async function check(rid, name) {
  const r = await fetch(`https://data.boston.gov/api/3/action/datastore_search?resource_id=${rid}&limit=1`)
  const d = await r.json()
  if (d.success) {
    const fields = d.result.fields.map(f => f.id).slice(0, 8)
    const rec = d.result.records[0]
    console.log(`✓ ${name} (${rid})`)
    console.log('  Fields:', fields.join(', '))
    // show address-like fields
    const addrFields = Object.keys(rec || {}).filter(k => /num|name|addr|street/i.test(k))
    addrFields.forEach(k => console.log(`  ${k}: ${rec[k]}`))
  } else {
    console.log(`✗ ${name} (${rid}) — NOT FOUND`)
  }
}

async function run() {
  await check('062fc6fa-b5ff-4270-86cf-202225e40858', 'Assessor (from spec)')
  await check('ee73430d-96c0-423e-ad21-c4cfb54c8961', 'Assessor FY2026 (known good)')
  await check('6ddcd912-32a0-43df-9908-63574f8c7e77', 'Permits (from spec)')
}

run()
