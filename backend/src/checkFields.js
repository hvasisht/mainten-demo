const fetch = require('node-fetch')

async function run() {
  const BASE = 'https://data.boston.gov/api/3/action/datastore_search_sql'
  const ASSESSOR_RID = '062fc6fa-b5ff-4270-86cf-202225e40858'
  const sql = `SELECT * FROM "${ASSESSOR_RID}" WHERE "ST_NUM" LIKE '14%' AND UPPER("ST_NAME") LIKE '%WINTHROP%' LIMIT 1`
  const res = await fetch(`${BASE}?sql=${encodeURIComponent(sql)}`).then(r => r.json())
  const rec = res.result.records[0]
  console.log('All fields with values:')
  Object.entries(rec).forEach(([k, v]) => {
    if (v != null && v !== '' && v !== '0' && k !== '_id') console.log(`  ${k}: ${v}`)
  })
}
run()
