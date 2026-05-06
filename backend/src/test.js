const { getPropertyData } = require('./bostonData')

async function test() {
  console.log('Testing: 6 Moreland St 02119...\n')
  try {
    const result = await getPropertyData('6 Moreland St 02119')
    if (!result.found) {
      console.log('Not found. stNum:', result.stNum, 'stName:', result.stName)
      return
    }
    console.log('=== ASSESSOR ===')
    console.log('Address:    ', result.stNum, result.stName)
    console.log('City:       ', result.assessor.city, result.assessor.zipCode)
    console.log('Year Built: ', result.assessor.yearBuilt)
    console.log('LU Code:    ', result.assessor.luCode, '—', result.assessor.luDesc)
    console.log('Units:      ', result.units.count, '(', result.units.method, ')', result.units.label)
    console.log('Bldg Type:  ', result.assessor.bldgType)
    console.log('Gross Area: ', result.assessor.grossArea, 'sf')
    console.log('Floors:     ', result.assessor.numFloors)
    console.log('Heat:       ', result.assessor.heatType, result.assessor.heatSystem)
    console.log('Roof:       ', result.assessor.roofStructure, '/', result.assessor.roofCover)
    console.log('Condition:  ', result.assessor.overallCond)
    console.log('Value:      $', result.assessor.totalValue)
    console.log('\n=== PERMITS ===')
    console.log('Total:      ', result.permits.total)
    console.log('Has Boiler: ', result.permits.summary.hasBoiler)
    console.log('Has Elec:   ', result.permits.summary.hasElectric)
    console.log('Has Plumb:  ', result.permits.summary.hasPlumbing)
    console.log('Has Roof:   ', result.permits.summary.hasRoof)
    console.log('Latest:     ', result.permits.summary.latestPermit)
    console.log('By Type:    ', result.permits.summary.byType)
    if (result.permits.records.length > 0) {
      console.log('\nRecent permits:')
      result.permits.records.slice(0, 5).forEach(p => {
        console.log(' -', p.issuedDate, p.type, '|', p.description?.slice(0, 60))
      })
    }
    if (result.condoUnits) {
      console.log('\n=== CONDO UNITS ===')
      result.condoUnits.forEach(u => console.log(' - Unit', u.unitNum, u.beds, 'bd', u.baths, 'ba', u.livingArea, 'sf'))
    }
  } catch (e) {
    console.error('Error:', e.message)
  }
}

test()
