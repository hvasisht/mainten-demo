const { geminiGenerate, HAS_API_KEY, stripJson } = require('./_helpers')

// Season from current UTC month
function getSeason(month) {
  if (month >= 3 && month <= 5)  return 'spring'
  if (month >= 6 && month <= 8)  return 'summer'
  if (month >= 9 && month <= 11) return 'fall'
  return 'winter'
}

function getSeasonLabel(month) {
  if (month >= 3 && month <= 5)  return 'Spring'
  if (month >= 6 && month <= 8)  return 'Summer'
  if (month >= 9 && month <= 11) return 'Fall'
  return 'Winter'
}

// ── Static fallbacks keyed by season ──────────────────────────
const STATIC_SUGGESTIONS = {
  spring: [
    { icon: '🌡', title: 'Set thermostat to 68–70°F daytime',    category: 'Heating', urgency: 'LOW',    detail: 'Spring in Boston swings between 40°F nights and 65°F days. Keep the thermostat at 68°F during the day and drop to 65°F at night — your boiler should cycle less as outdoor temps rise.' },
    { icon: '🔍', title: 'Inspect roof after winter ice damage',  category: 'Roof',    urgency: 'HIGH',   detail: 'Boston winters cause ice dams on flat and low-pitch roofs. Walk the perimeter and look for lifted flashing, cracked membrane, or soft spots. Early detection prevents summer water infiltration.' },
    { icon: '💧', title: 'Check for pipe joint weeps in basement', category: 'Plumbing', urgency: 'MEDIUM', detail: 'Freeze-thaw cycles stress galvanised joints in pre-war buildings. Spring is the best time to check for slow drips at elbows and unions in the basement before they become failures.' },
    { icon: '🪟', title: 'Seal window gaps before summer humidity', category: 'Insulation', urgency: 'LOW', detail: 'Pre-war double-hungs lose their rope caulk over decades. Apply a fresh bead around the frame exterior now to keep summer humidity out and reduce mould risk in wall cavities.' },
    { icon: '🔥', title: 'Schedule boiler service before shutdown',  category: 'Heating', urgency: 'MEDIUM', detail: 'Steam boilers should be flushed and inspected before the heating season ends. Skipping this allows sediment buildup that causes low-water cutoff failures when heat restarts in fall.' },
  ],
  summer: [
    { icon: '❄️', title: 'Keep indoor temp 72–76°F in summer heat', category: 'Cooling', urgency: 'MEDIUM', detail: 'Boston summers hit 90°F+ and triple-deckers trap heat on upper floors. Keep window ACs set to 74°F — going lower strains the circuits; old knob-and-tube wiring is not rated for continuous high AC loads.' },
    { icon: '⚡', title: 'Do not run AC + microwave on same circuit', category: 'Electrical', urgency: 'HIGH', detail: 'Pre-war buildings often have 15-amp circuits shared between kitchen and adjacent rooms. Running a window AC and microwave simultaneously risks tripping breakers — or overheating ungraded wiring inside walls.' },
    { icon: '🪲', title: 'Seal exterior gaps against summer pests',  category: 'Pests', urgency: 'MEDIUM', detail: 'Ants, cockroaches, and mice enter through gaps around utility penetrations in summer. Check where pipes enter through the foundation and stuff any gaps with copper mesh before caulking.' },
    { icon: '💧', title: 'Watch for ceiling stains after heavy rain', category: 'Roof', urgency: 'HIGH', detail: 'Summer thunderstorms expose roof membrane failures. After any heavy rain, check top-floor ceilings for new water stains within 24 hours — early detection keeps repair costs in the hundreds instead of thousands.' },
    { icon: '🌬', title: 'Ventilate bathroom to prevent mould growth', category: 'Ventilation', urgency: 'LOW', detail: 'High summer humidity accelerates mould growth in bathrooms without exhaust fans. Run the fan for 20 minutes after every shower — or crack the window. Pre-war bathrooms often lack adequate ventilation.' },
  ],
  fall: [
    { icon: '🌡', title: 'Set heat to 68°F by October 1 (MA law)',  category: 'Heating', urgency: 'HIGH', detail: 'Massachusetts Sanitary Code requires landlords to maintain 68°F from 7am–11pm and 64°F overnight from September 15 through June 15. If the building is not warm enough, that is a landlord violation.' },
    { icon: '🔧', title: 'Bleed radiators before heating season',    category: 'Heating', urgency: 'MEDIUM', detail: 'Air trapped in steam radiators causes loud water hammer and uneven heat. At the start of the heating season, the super should bleed each radiator. If yours are cold on top but hot at bottom, air is the culprit.' },
    { icon: '🍂', title: 'Clear roof drains and gutters of leaves',  category: 'Roof', urgency: 'MEDIUM', detail: 'Clogged roof drains on flat-roofed triple-deckers cause ponding water that accelerates membrane failure. Make sure the building super clears the roof drains before the first heavy fall rain.' },
    { icon: '🔍', title: 'Check smoke + CO detectors before winter', category: 'Safety', urgency: 'HIGH', detail: 'Massachusetts law requires working CO detectors within 10 feet of each bedroom. Test all units now — CO risk rises sharply when old boilers start up in fall after months of inactivity.' },
    { icon: '🪟', title: 'Winterise single-pane windows with film',  category: 'Insulation', urgency: 'LOW', detail: 'Pre-war triple-deckers lose 30–40% of heat through original single-pane windows. Indoor window insulator film kits cost under $20 per window and can cut heating bills noticeably through a Boston winter.' },
  ],
  winter: [
    { icon: '🌡', title: 'Keep heat at 68°F+ — it is your legal right', category: 'Heating', urgency: 'HIGH', detail: 'During a Boston winter, landlords must maintain 68°F from 7am–11pm. If your building drops below this, document it with a thermometer photo and timestamp, then notify your landlord in writing via email.' },
    { icon: '💧', title: 'Let cold-wall faucets drip on sub-20°F nights', category: 'Plumbing', urgency: 'HIGH', detail: 'Pipes running through exterior walls in pre-war balloon-frame buildings freeze at sub-20°F. Let kitchen and bathroom faucets on exterior walls drip slowly to prevent a burst pipe.' },
    { icon: '⚠', title: 'Never use gas stove to heat the apartment',  category: 'Safety', urgency: 'HIGH', detail: 'Gas stoves produce CO when used for heating and are a leading cause of CO poisoning in Boston apartments. If the heat fails, call your landlord immediately — then Boston ISD at (617) 635-5300.' },
    { icon: '🔥', title: 'Listen for boiler water hammer sounds',     category: 'Heating', urgency: 'MEDIUM', detail: 'Loud banging from radiators is water hammer — steam pushing water through pipes. It means air vents are failing or the boiler water level is low. Report it to your super; it worsens in cold snaps.' },
    { icon: '🧊', title: 'Report ice dams on roof immediately',       category: 'Roof', urgency: 'MEDIUM', detail: 'Ice dams form at roof edges and push meltwater under the membrane into the building. If you see icicles combined with wet spots on top-floor ceilings, notify your landlord in writing — it is their responsibility.' },
  ],
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { propertyData, userProfile } = req.body
  const month  = new Date().getMonth() + 1   // 1–12
  const season = getSeason(month)
  const seasonLabel = getSeasonLabel(month)
  const monthName = new Date().toLocaleString('en-US', { month: 'long' })

  if (!HAS_API_KEY) {
    return res.json({ suggestions: STATIC_SUGGESTIONS[season], season })
  }

  const a = propertyData?.assessor || {}
  const p = propertyData?.permits  || {}
  const yearBuilt = a.yearBuilt || 'unknown'
  const heatType  = a.heatType  || 'Unknown'
  const roofCover = a.roofCover || 'Unknown'
  const hasBoiler = p.summary?.hasBoiler
  const hasElectric = p.summary?.hasElectric

  const prompt = `You are Mainten AI. Generate exactly 5 seasonal home maintenance suggestions for a Boston renter.

PROPERTY:
- Address: ${propertyData?.address || 'Unknown Boston address'}
- Year built: ${yearBuilt}
- Heat type: ${heatType}
- Roof: ${roofCover}
- Units: ${propertyData?.units?.count || 'unknown'}
- Boiler permit on record: ${hasBoiler ? 'Yes' : 'No'}
- Electrical permit on record: ${hasElectric ? 'Yes' : 'No'}
- User role: ${userProfile?.role || 'tenant'}

CURRENT DATE: ${monthName} 2026 — it is ${seasonLabel} in Boston.

Generate suggestions that are:
1. Specific to this building's age (${yearBuilt}) and construction type (pre-war Boston triple-decker)
2. Seasonal — directly relevant to ${seasonLabel} in Boston (weather, maintenance schedule, comfort)
3. Actionable — the tenant can act on them or ask their landlord
4. Temperature-aware — include specific temperature recommendations where relevant (e.g. thermostat settings, outdoor temperature thresholds for action)

Include at least one suggestion about temperature/comfort for this season.

Return ONLY a valid JSON array — no markdown, no preamble:
[{"icon":"🌡","title":"Short title max 8 words","detail":"2-3 sentences. Specific to this property age and ${seasonLabel} in Boston. Include numbers (temperatures, costs, timelines) where useful.","urgency":"HIGH","category":"Heating"}]

urgency values: HIGH | MEDIUM | LOW
icon: use one relevant emoji per suggestion`

  try {
    const raw  = await geminiGenerate(prompt)
    const text = stripJson(raw)
    const suggestions = JSON.parse(text)
    res.json({ suggestions, season })
  } catch (err) {
    console.error('[suggestions] Gemini failed, using static fallback:', err.message)
    res.json({ suggestions: STATIC_SUGGESTIONS[season], season })
  }
}
