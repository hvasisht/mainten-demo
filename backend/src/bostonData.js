const fetch = require('node-fetch')

const BASE = 'https://data.boston.gov/api/3/action/datastore_search_sql'
const ASSESSOR_RID = '062fc6fa-b5ff-4270-86cf-202225e40858'
const PERMITS_RID  = '6ddcd912-32a0-43df-9908-63574f8c7e77'

const LU_UNITS = {
  R1: 1, 'R1-A': 1,
  R2: 2, 'R2-A': 2,
  R3: 3, 'R3-A': 3,
  R4: '4–6',
  A:  '7+',
}

const LU_FLOORS = {
  R1: 1, 'R1-A': 1,
  R2: 2, 'R2-A': 2,
  R3: 3, 'R3-A': 3,
}

function decodeUnits(lu, luDesc, records) {
  if (lu === 'CD' || (luDesc || '').toUpperCase().includes('CONDO')) {
    return { count: records.length, method: 'confirmed', label: 'Condo' }
  }
  if (LU_UNITS[lu] != null) {
    return { count: LU_UNITS[lu], method: 'confirmed', label: luDesc || lu }
  }
  return { count: null, method: 'unknown', label: luDesc || lu }
}

function parseAddress(address) {
  const clean = address.replace(/,/g, ' ').replace(/\s+/g, ' ').trim()
  const parts = clean.split(' ')
  const stNum = parts[0]
  // Take the word right after the number as street name
  const stName = parts[1] ? parts[1].toUpperCase() : ''
  return { stNum, stName }
}

function summarizePermits(permits) {
  const types = {}
  permits.forEach(p => {
    const t = p.permittypedescr || 'Other'
    types[t] = (types[t] || 0) + 1
  })
  const hasBoiler   = permits.some(p => /(boiler|heat|furnace)/i.test(p.description || ''))
  const hasElectric = permits.some(p => /(electric|wiring|panel)/i.test(p.description || ''))
  const hasPlumbing = permits.some(p => /(plumb|pipe|drain)/i.test(p.description || ''))
  const hasRoof     = permits.some(p => /(roof|shingle|flat)/i.test(p.description || ''))
  return {
    byType: types,
    latestPermit: permits[0]?.issued_date,
    hasBoiler, hasElectric, hasPlumbing, hasRoof,
  }
}

async function getPropertyData(address) {
  const { stNum, stName } = parseAddress(address)

  // This dataset stores ST_NUM with suffixes like "104 A 104", so use LIKE
  const assessSQL = `SELECT * FROM "${ASSESSOR_RID}" WHERE "ST_NUM" LIKE '${stNum}%' AND UPPER("ST_NAME") LIKE '%${stName}%' LIMIT 50`
  const permitsSQL = `SELECT * FROM "${PERMITS_RID}" WHERE "address" ILIKE '${stNum} %${stName}%' ORDER BY "issued_date" DESC LIMIT 50`

  const [assessRes, permitsRes] = await Promise.all([
    fetch(`${BASE}?sql=${encodeURIComponent(assessSQL)}`).then(r => r.json()),
    fetch(`${BASE}?sql=${encodeURIComponent(permitsSQL)}`).then(r => r.json()),
  ])

  const assessRecords = assessRes?.result?.records || []
  const permits = permitsRes?.result?.records || []

  if (assessRecords.length === 0) {
    return { found: false, address, stNum, stName }
  }

  // Primary: prefer non-condo record with most data
  const primary = assessRecords.find(r => r.LU !== 'CD') || assessRecords[0]
  const units = decodeUnits(primary.LU, primary.LU_DESC, assessRecords)

  return {
    found: true,
    address,
    stNum,
    stName,
    assessor: {
      pid:            primary.PID,
      owner:          primary.OWNER,
      yearBuilt:      primary.YR_BUILT,
      yrRemodel:      primary.YR_REMODEL,
      luCode:         primary.LU,
      luDesc:         primary.LU_DESC || primary.PTYPE,
      bldgType:       primary.BLDG_TYPE || primary.R_BLDG_STYL,
      structureClass: primary.STRUCTURE_CLASS,
      grossArea:      primary.GROSS_AREA,
      livingArea:     primary.LIVING_AREA,
      landSf:         primary.LAND_SF,
      numFloors:      LU_FLOORS[primary.LU] || primary.NUM_FLOORS,
      roofStructure:  primary.ROOF_STRUCTURE || primary.R_ROOF_TYP,
      roofCover:      primary.ROOF_COVER || primary.R_ROOF_MAT,
      extFinish:      primary.EXT_WALL || primary.R_EXT_FIN,
      intWall:        primary.INT_WALL,
      heatType:       primary.HEAT_TYPE || primary.R_HEAT_TYP,
      heatSystem:     primary.HEAT_SYSTEM || primary.R_HEAT_SYS,
      acType:         primary.AC_TYPE || primary.R_AC,
      intCond:        primary.INT_COND || primary.R_INT_CND,
      extCond:        primary.EXT_COND || primary.R_EXT_CND,
      overallCond:    primary.OVERALL_COND || primary.R_OVRALL_CND,
      bedrooms:       primary.BED_RMS || primary.R_BDRMS,
      fullBaths:      primary.FULL_BTH || primary.R_FULL_BTH,
      halfBaths:      primary.HLF_BTH || primary.R_HALF_BTH,
      totalRooms:     primary.TT_RMS || primary.R_TOTAL_RMS,
      kitchens:       primary.KITCHENS || primary.R_KITCH,
      landValue:      primary.LAND_VALUE || primary.AV_LAND,
      bldgValue:      primary.BLDG_VALUE || primary.AV_BLDG,
      totalValue:     primary.TOTAL_VALUE || primary.AV_TOTAL,
      city:           primary.CITY || primary.MAIL_CS,
      zipCode:        primary.ZIP_CODE || primary.ZIPCODE,
      neighbourhood:  primary.CITY || (primary['MAIL CS'] || '').split(' ')[0],
    },
    units,
    condoUnits: units.label === 'Condo'
      ? assessRecords.map(r => ({
          unitNum:    r.UNIT_NUM,
          beds:       r.U_BED_RMS || r.BED_RMS,
          baths:      r.U_FULL_BTH || r.FULL_BTH,
          livingArea: r.LIVING_AREA,
          floor:      r.U_FLOOR_LOC,
          totalValue: r.TOTAL_VALUE,
          intCond:    r.INT_COND,
          overallCond: r.OVERALL_COND,
        }))
      : null,
    permits: {
      total: permits.length,
      records: permits.map(p => ({
        permitNumber:  p.permitnumber,
        type:          p.permittypedescr,
        description:   p.description,
        status:        p.worktype,
        issuedDate:    p.issued_date,
        expirationDate: p.expiration_date,
        contractor:    p.applicant,
        value:         p.declared_valuation,
      })),
      summary: summarizePermits(permits),
    },
  }
}

module.exports = { getPropertyData }
