import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
const DARK_STYLE = 'mapbox://styles/mapbox/dark-v11'
const BASE_LNG = -71.0589
const BASE_LAT = 42.3601

const WEATHER_PALETTES = {
  clear:  { bg: '#111110', water: '#0e1218', land: '#111110', building: '#1c1b18', extrusion: '#252318', road: '#3a3020', roadMain: '#4d3f18' },
  cloudy: { bg: '#0f0f0e', water: '#0d1015', land: '#0f0f0e', building: '#191817', extrusion: '#222120', road: '#323230', roadMain: '#403e30' },
  fog:    { bg: '#14141a', water: '#10121a', land: '#14141a', building: '#1e1e24', extrusion: '#28282e', road: '#38383e', roadMain: '#44444a' },
  rain:   { bg: '#0c0e12', water: '#0a0e18', land: '#0c0e12', building: '#161820', extrusion: '#1e2028', road: '#282c38', roadMain: '#343844' },
  storm:  { bg: '#08080c', water: '#060810', land: '#08080c', building: '#121218', extrusion: '#181820', road: '#222230', roadMain: '#2a2a3a' },
  snow:   { bg: '#101214', water: '#0c1020', land: '#101214', building: '#1c1e24', extrusion: '#24262e', road: '#343640', roadMain: '#40424e' },
}

function addLayers(map) {
  if (map.getSource('selected-building-source')) return
  map.addSource('selected-building-source', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] }
  })
  map.addLayer({ id: 'selected-building-fill', type: 'fill', source: 'selected-building-source',
    paint: { 'fill-color': '#D4920A', 'fill-opacity': 0.65 }
  })
  map.addLayer({ id: 'selected-building-outline', type: 'line', source: 'selected-building-source',
    paint: { 'line-color': '#F5C842', 'line-width': 2, 'line-opacity': 1 }
  })
}

function applyDarkStyles(map, weather) {
  const pal = (weather && WEATHER_PALETTES[weather.condition]) || WEATHER_PALETTES.clear
  try { map.setPaintProperty('background', 'background-color', pal.bg) } catch(_) {}
  try { map.setPaintProperty('water', 'fill-color', pal.water) } catch(_) {}
  ;['road-secondary-tertiary', 'road-street', 'road-minor'].forEach(id => {
    try { map.setPaintProperty(id, 'line-color', pal.road) } catch(_) {}
  })
  ;['road-motorway-trunk', 'road-primary'].forEach(id => {
    try { map.setPaintProperty(id, 'line-color', pal.roadMain) } catch(_) {}
  })
  ;['land', 'landuse', 'landcover'].forEach(id => {
    try { map.setPaintProperty(id, 'fill-color', pal.land) } catch(_) {}
  })
  try { map.setPaintProperty('building', 'fill-color', pal.building) } catch(_) {}
  try { map.setPaintProperty('building', 'fill-opacity', 0.9) } catch(_) {}
  try { map.setPaintProperty('building-extrusion', 'fill-color', pal.extrusion) } catch(_) {}
  try { map.setPaintProperty('building-extrusion', 'fill-opacity', 0.85) } catch(_) {}
}

function hideAllLabels(map) {
  const style = map.getStyle()
  if (!style) return
  style.layers.forEach(layer => {
    if (layer.type === 'symbol') {
      try { map.setLayoutProperty(layer.id, 'visibility', 'none') } catch(_) {}
    }
  })
}

export default function MapBackground({ flyTo, weather, onBuildingFound }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const panFrameRef = useRef(null)
  const isPanningRef = useRef(true)
  const panTRef = useRef(0)

  function startPan(map) {
    const drift = () => {
      if (!isPanningRef.current) return
      panTRef.current += 0.00008
      const t = panTRef.current
      const lng = BASE_LNG + Math.sin(t) * 0.006
      const lat = BASE_LAT + Math.cos(t * 0.7) * 0.004
      map.setCenter([lng, lat])
      panFrameRef.current = requestAnimationFrame(drift)
    }
    panFrameRef.current = requestAnimationFrame(drift)
  }

  function stopPan() {
    isPanningRef.current = false
    cancelAnimationFrame(panFrameRef.current)
  }

  function resumePan(map) {
    isPanningRef.current = true
    startPan(map)
  }

  useEffect(() => {
    if (!TOKEN) return
    if (mapRef.current) return

    mapboxgl.accessToken = TOKEN

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: DARK_STYLE,
      center: [BASE_LNG, BASE_LAT],
      zoom: 14.5,
      pitch: 0,
      bearing: 0,
      antialias: true,
      interactive: false,
    })

    map.on('load', () => {
      map.resize()
      applyDarkStyles(map, weather)
      hideAllLabels(map)
      addLayers(map)
      containerRef.current.style.opacity = '1'
      startPan(map)
    })

    const onResize = () => map.resize()
    window.addEventListener('resize', onResize)
    map.on('idle', () => {
      applyDarkStyles(map, weather)
    })

    mapRef.current = map
    return () => {
      cancelAnimationFrame(panFrameRef.current)
      window.removeEventListener('resize', onResize)
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !flyTo) return
    stopPan()
    flyAndPin(map, flyTo)
  }, [flyTo])

  function flyAndPin(map, flyTo) {
    map.flyTo({
      center: [flyTo.lng, flyTo.lat],
      zoom: 19,
      pitch: 0,
      bearing: 0,
      duration: 2800,
      essential: true,
      padding: { top: 80, bottom: window.innerHeight * 0.55, left: 80, right: 80 },
    })

    map.once('idle', () => {
      const screenPoint = map.project([flyTo.lng, flyTo.lat])
      let building = map.queryRenderedFeatures([screenPoint.x, screenPoint.y])
        .find(f => f.sourceLayer === 'building')
      if (!building) {
        building = map.queryRenderedFeatures(
          [[screenPoint.x - 5, screenPoint.y - 5], [screenPoint.x + 5, screenPoint.y + 5]]
        ).find(f => f.sourceLayer === 'building')
      }
      const src = map.getSource('selected-building-source')
      if (src) {
        src.setData({
          type: 'FeatureCollection',
          features: building ? [building] : []
        })
      }
      onBuildingFound?.(building || null)

    })
  }

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', opacity: 0 }}
    />
  )
}
