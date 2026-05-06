import { colors } from '../tokens'

const TYPE_COLORS = {
  'Long Form': colors.riskOrange,
  'Short Form': colors.amber,
  'Electrical Permit': '#7B9ED9',
  'Plumbing & Gas': '#5A8B8B',
  'Stretch Energy Code': '#5A8060',
  'Use of Premises': colors.gunmetal,
}

const TYPE_ICONS = {
  'Long Form': '🔨',
  'Short Form': '🔧',
  'Electrical Permit': '⚡',
  'Plumbing & Gas': '🔧',
  'Stretch Energy Code': '🌡',
  'Use of Premises': '📋',
}

function getTypeColor(type) {
  return Object.entries(TYPE_COLORS).find(([k]) => type?.includes(k))?.[1] || colors.gunmetal
}
function getTypeIcon(type) {
  return Object.entries(TYPE_ICONS).find(([k]) => type?.includes(k))?.[1] || '📄'
}

export default function PermitTimeline({ permits, yearBuilt }) {
  const records = (permits?.records || [])
    .filter(p => p.issuedDate)
    .sort((a, b) => (b.issuedDate || '').localeCompare(a.issuedDate || ''))
    .slice(0, 8)

  const built = parseInt(yearBuilt) || null

  return (
    <div style={{ padding: '12px 16px 4px' }}>
      <div style={{
        fontFamily: 'ui-monospace, Consolas, monospace',
        fontSize: 9, letterSpacing: '0.14em',
        color: colors.amber, textTransform: 'uppercase', marginBottom: 10,
      }}>
        Permit History
      </div>

      {records.length === 0 ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px',
          background: `${colors.riskOrange}12`,
          border: `1px solid ${colors.riskOrange}44`,
          borderRadius: 8, marginBottom: 10,
        }}>
          <span style={{ fontSize: 13 }}>⚠</span>
          <div>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: colors.riskOrange }}>
              No permits on record
            </div>
            <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 8, color: colors.gunmetal, marginTop: 2 }}>
              No renovations documented since 2009
            </div>
          </div>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* Vertical line */}
          <div style={{
            position: 'absolute', left: 15, top: 8, bottom: 8,
            width: 1, background: `${colors.gunmetal}44`,
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {records.map((p, i) => {
              const year = p.issuedDate?.slice(0, 4)
              const color = getTypeColor(p.type)
              const icon  = getTypeIcon(p.type)
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  paddingBottom: 10,
                }}>
                  {/* Dot */}
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: color, border: `2px solid ${color}66`,
                    flexShrink: 0, marginTop: 3, zIndex: 1,
                    boxShadow: `0 0 6px ${color}44`,
                  }} />
                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                      <span style={{
                        fontFamily: 'Georgia, serif', fontSize: 11,
                        color: colors.warmWhite, lineHeight: 1.3,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        flex: 1,
                      }}>
                        {icon} {p.description || p.type || 'Permit'}
                      </span>
                      <span style={{
                        fontFamily: 'ui-monospace, monospace',
                        fontSize: 9, color, flexShrink: 0, letterSpacing: '0.04em',
                      }}>{year}</span>
                    </div>
                    <div style={{
                      fontFamily: 'ui-monospace, monospace', fontSize: 8,
                      color: colors.gunmetal, marginTop: 2, letterSpacing: '0.05em',
                    }}>
                      {p.type}
                      {p.value && parseInt(p.value) > 0 ? ` · $${Number(p.value).toLocaleString()}` : ''}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Year built marker */}
            {built && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 4 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: 2,
                  background: `${colors.gunmetal}66`,
                  flexShrink: 0, zIndex: 1,
                }} />
                <span style={{
                  fontFamily: 'ui-monospace, monospace', fontSize: 8,
                  color: `${colors.gunmetal}88`, letterSpacing: '0.06em',
                }}>
                  Built {built}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
