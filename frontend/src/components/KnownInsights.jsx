import { useState, useEffect } from 'react'
import { colors } from '../tokens'

const ASSESSMENT_RID = 'ee73430d-96c0-423e-ad21-c4cfb54c8961'
const VIOLATIONS_RID = '800a2663-1d6a-46e7-9356-bedb70f5332c'
const RENTAL_RID = '83621b97-9a00-4aa7-bf43-28cae04969d4'
const BASE = 'https://data.boston.gov/api/3/action/datastore_search_sql'
const SEARCH = 'https://data.boston.gov/api/3/action/datastore_search'

function parseStreetAddress(placeName) {
  const street = placeName.split(',')[0].trim()
  const parts = street.split(' ')
  const stNum = parts[0]
  const stName = parts.slice(1).join(' ').toUpperCase()
  return { stNum, stName }
}

function scoreColor(val) {
  if (!val) return colors.warmWhite
  const v = String(val).toUpperCase()
  if (v.includes('EXCL') || v.includes('GOOD')) return '#5A8060'
  if (v.includes('AVER') || v.includes('FAIR') || v.includes('NORM')) return colors.amber
  if (v.includes('POOR') || v.includes('UNSOUND')) return '#C47020'
  return colors.warmWhite
}

function isCondo(record) {
  return record && (record.LU === 'CD' || (record.LU_DESC || '').toUpperCase().includes('CONDO'))
}

function buildCondoRows(a) {
  return [
    { label: 'Unit', value: a.UNIT_NUM || '—' },
    { label: 'Living Area', value: a.LIVING_AREA ? `${Number(a.LIVING_AREA).toLocaleString()} sf` : '—' },
    { label: 'Year Built', value: a.YR_BUILT || '—' },
    { label: 'Yr Remodel', value: a.YR_REMODEL || '—' },
    { label: 'Floor', value: a.RES_FLOOR || '—' },
    { label: 'Bedrooms', value: a.BED_RMS || '—' },
    { label: 'Full Baths', value: a.FULL_BTH || '—' },
    { label: 'Half Baths', value: a.HLF_BTH || '—' },
    { label: 'Kitchens', value: a.KITCHENS || '—' },
    { label: 'Parking', value: a.NUM_PARKING || '—' },
    { label: 'Fireplaces', value: a.FIREPLACES || '—' },
    { label: 'Corner Unit', value: a.CORNER_UNIT === 'Y' ? 'Yes' : a.CORNER_UNIT === 'N' ? 'No' : '—' },
    { label: 'Heat Type', value: a.HEAT_TYPE || '—' },
    { label: 'AC', value: a.AC_TYPE || '—' },
    { label: 'Int. Cond.', value: a.INT_COND || '—', color: scoreColor(a.INT_COND) },
    { label: 'Overall', value: a.OVERALL_COND || '—', color: scoreColor(a.OVERALL_COND) },
    { label: 'Total Value', value: a.TOTAL_VALUE ? `$${Number(a.TOTAL_VALUE).toLocaleString()}` : '—' },
  ]
}

function buildBuildingRows(a, rental) {
  return [
    { label: 'Type', value: a.LU_DESC || '—' },
    { label: 'Res. Units', value: a.RES_UNITS || rental?.['units in building'] || '—' },
    { label: 'Gross Area', value: a.GROSS_AREA ? `${Number(a.GROSS_AREA).toLocaleString()} sf` : '—' },
    { label: 'Year Built', value: a.YR_BUILT || '—' },
    { label: 'Yr Remodel', value: a.YR_REMODEL || '—' },
    { label: 'Floors', value: a.RES_FLOOR || '—' },
    { label: 'Heat Type', value: a.HEAT_TYPE || '—' },
    { label: 'Heat System', value: a.HEAT_SYSTEM || '—' },
    { label: 'AC', value: a.AC_TYPE || '—' },
    { label: 'Roof Type', value: a.ROOF_STRUCTURE || '—' },
    { label: 'Roof Cover', value: a.ROOF_COVER || '—' },
    { label: 'Exterior', value: a.EXT_FNISHED || '—' },
    { label: 'Ext. Cond.', value: a.EXT_COND || '—', color: scoreColor(a.EXT_COND) },
    { label: 'Overall', value: a.OVERALL_COND || '—', color: scoreColor(a.OVERALL_COND) },
    { label: 'Open Violations', value: rental?.['open violation count'] ?? '—', color: rental?.['open violation count'] > 0 ? '#C47020' : '#5A8060' },
    { label: 'Violations 6mo', value: rental?.['violations in last 6 months'] ?? '—', color: rental?.['violations in last 6 months'] > 0 ? '#C47020' : '#5A8060' },
    { label: 'Owner Occupied', value: rental?.['building owner-occupied'] || '—' },
    { label: 'Income Restricted', value: rental?.['income restricted'] || '—' },
    { label: 'Total Value', value: a.TOTAL_VALUE ? `$${Number(a.TOTAL_VALUE).toLocaleString()}` : '—' },
  ]
}

function RowList({ rows }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {rows.map(({ label, value, color }) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <span style={{
            fontFamily: 'ui-monospace, Consolas, monospace',
            fontSize: 9, letterSpacing: '0.07em',
            color: colors.gunmetal, textTransform: 'uppercase', flexShrink: 0,
          }}>
            {label}
          </span>
          <span style={{
            fontFamily: 'Georgia, serif', fontSize: 12,
            color: color || (value === '—' ? colors.gunmetal : colors.warmWhite),
            textAlign: 'right',
          }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function KnownInsights({ address, visible }) {
  const [units, setUnits] = useState([])
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [rentalData, setRentalData] = useState(null)
  const [violations, setViolations] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!address) return
    setUnits([])
    setSelectedUnit(null)
    setRentalData(null)
    setViolations(null)
    setLoading(true)

    const { stNum, stName } = parseStreetAddress(address)
    const firstWord = stName.split(' ')[0]

    const assessSQL = `SELECT * FROM "${ASSESSMENT_RID}" WHERE "ST_NUM" = '${stNum}' AND UPPER("ST_NAME") LIKE '%${firstWord}%' LIMIT 50`
    const violSQL = `SELECT * FROM "${VIOLATIONS_RID}" WHERE "address" ILIKE '${stNum}%${firstWord}%' ORDER BY "violation_strt_dttm" DESC LIMIT 5`
    const rentalURL = `${SEARCH}?resource_id=${RENTAL_RID}&q=${encodeURIComponent(stNum + ' ' + firstWord)}&limit=3`

    Promise.all([
      fetch(`${BASE}?sql=${encodeURIComponent(assessSQL)}`).then(r => r.json()),
      fetch(`${BASE}?sql=${encodeURIComponent(violSQL)}`).then(r => r.json()),
      fetch(rentalURL).then(r => r.json()),
    ]).then(([aRes, vRes, rRes]) => {
      const records = aRes?.result?.records || []
      setUnits(records)
      if (records.length === 1) setSelectedUnit(records[0])
      setViolations(vRes?.result?.records || [])
      const rentalRecords = rRes?.result?.records || []
      setRentalData(rentalRecords[0] || null)
    }).catch(() => {
      setUnits([])
      setViolations([])
    }).finally(() => setLoading(false))
  }, [address])

  const condoMode = units.length > 0 && units.every(isCondo)
  const buildingMode = units.length > 0 && !condoMode
  const buildingRecord = units[0]

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      right: 32,
      transform: visible ? 'translate(0, -50%)' : 'translate(20px, -50%)',
      width: 240,
      maxHeight: '72vh',
      borderRadius: 16,
      overflow: 'hidden',
      background: 'rgba(20,18,14,0.88)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: `1.5px solid ${colors.gunmetal}`,
      boxShadow: `0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px ${colors.amber}22`,
      zIndex: 10,
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.5s ease, transform 0.5s ease',
      pointerEvents: visible ? 'all' : 'none',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ height: 3, background: `linear-gradient(to right, ${colors.amber}, ${colors.amberBright})`, flexShrink: 0 }} />

      {/* Header */}
      <div style={{ padding: '12px 16px 8px', borderBottom: `1px solid ${colors.gunmetal}44`, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
          <div style={{
            fontFamily: 'ui-monospace, Consolas, monospace',
            fontSize: 9, letterSpacing: '0.18em',
            color: colors.amber, textTransform: 'uppercase',
          }}>
            Known Insights
          </div>
          {condoMode && (
            <div style={{
              fontFamily: 'ui-monospace, Consolas, monospace',
              fontSize: 8, letterSpacing: '0.08em',
              color: '#5A8060', textTransform: 'uppercase',
              background: '#5A806022', borderRadius: 4, padding: '2px 6px',
            }}>
              CONDO
            </div>
          )}
          {buildingMode && (
            <div style={{
              fontFamily: 'ui-monospace, Consolas, monospace',
              fontSize: 8, letterSpacing: '0.08em',
              color: colors.amber, textTransform: 'uppercase',
              background: `${colors.amber}22`, borderRadius: 4, padding: '2px 6px',
            }}>
              RENTAL
            </div>
          )}
        </div>
        <div style={{
          fontFamily: 'Georgia, serif', fontSize: 11,
          color: 'rgba(245,240,232,0.5)', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {address?.split(', ')[0]}
        </div>
      </div>

      {/* Body */}
      <div style={{ overflowY: 'auto', padding: '10px 16px 14px' }}>

        {loading && (
          <div style={{
            fontFamily: 'ui-monospace, Consolas, monospace',
            fontSize: 10, color: colors.gunmetal,
            letterSpacing: '0.08em', textAlign: 'center', padding: '16px 0',
          }}>
            LOADING...
          </div>
        )}

        {!loading && units.length === 0 && (
          <div style={{
            fontFamily: 'ui-monospace, Consolas, monospace',
            fontSize: 10, color: colors.gunmetal,
            letterSpacing: '0.06em', textAlign: 'center', padding: '16px 0', lineHeight: 1.8,
          }}>
            NO DATA FOUND<br />FOR THIS ADDRESS
          </div>
        )}

        {/* CONDO MODE — unit picker */}
        {!loading && condoMode && !selectedUnit && (
          <>
            <div style={{
              fontFamily: 'ui-monospace, Consolas, monospace',
              fontSize: 9, letterSpacing: '0.12em',
              color: colors.amber, textTransform: 'uppercase', marginBottom: 10,
            }}>
              {units.length} units — select one
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {units.map((u, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedUnit(u)}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${colors.gunmetal}`,
                    borderRadius: 8, padding: '8px 12px',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'border-color 0.15s, background 0.15s',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = colors.amber; e.currentTarget.style.background = `${colors.amber}14` }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = colors.gunmetal; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                >
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: colors.warmWhite }}>
                    {u.UNIT_NUM ? `Unit ${u.UNIT_NUM}` : `Record ${i + 1}`}
                  </span>
                  <span style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 9, color: colors.gunmetal }}>
                    {u.BED_RMS ? `${u.BED_RMS}bd` : ''}{u.FULL_BTH ? ` ${u.FULL_BTH}ba` : ''}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* CONDO — back button */}
        {!loading && condoMode && selectedUnit && (
          <button
            onClick={() => setSelectedUnit(null)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'ui-monospace, Consolas, monospace',
              fontSize: 9, letterSpacing: '0.1em',
              color: colors.amber, textTransform: 'uppercase',
              marginBottom: 10, padding: 0, display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            ← All Units
          </button>
        )}

        {/* CONDO — unit detail */}
        {!loading && condoMode && selectedUnit && (
          <RowList rows={buildCondoRows(selectedUnit)} />
        )}

        {/* RENTAL MODE — building summary */}
        {!loading && buildingMode && buildingRecord && (
          <>
            <div style={{
              fontFamily: 'ui-monospace, Consolas, monospace',
              fontSize: 8, letterSpacing: '0.08em', color: colors.gunmetal,
              textTransform: 'uppercase', marginBottom: 8,
            }}>
              Building-level data · unit breakdown unavailable
            </div>
            <RowList rows={buildBuildingRows(buildingRecord, rentalData)} />
          </>
        )}

        {/* Violations */}
        {!loading && violations && violations.length > 0 && (
          <>
            <div style={{
              margin: '12px 0 8px', paddingTop: 10,
              borderTop: `1px solid ${colors.gunmetal}44`,
              fontFamily: 'ui-monospace, Consolas, monospace',
              fontSize: 9, letterSpacing: '0.12em',
              color: '#C47020', textTransform: 'uppercase',
            }}>
              ISD Violations ({violations.length})
            </div>
            {violations.map((v, i) => (
              <div key={i} style={{
                marginBottom: 6, fontFamily: 'Georgia, serif',
                fontSize: 11, color: 'rgba(245,240,232,0.6)',
                lineHeight: 1.4, borderLeft: `2px solid #C4702055`, paddingLeft: 8,
              }}>
                {v.description || v.violation_desc || v.code_description || 'Violation on record'}
              </div>
            ))}
          </>
        )}

        {!loading && violations?.length === 0 && units.length > 0 && (
          <div style={{
            marginTop: 10, paddingTop: 10,
            borderTop: `1px solid ${colors.gunmetal}44`,
            fontFamily: 'ui-monospace, Consolas, monospace',
            fontSize: 9, color: '#5A8060',
            letterSpacing: '0.08em', textAlign: 'center',
          }}>
            ✓ NO ACTIVE VIOLATIONS
          </div>
        )}
      </div>
    </div>
  )
}
