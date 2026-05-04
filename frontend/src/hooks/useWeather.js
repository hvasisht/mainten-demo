import { useState, useEffect } from 'react'

// Open-Meteo — free, no API key
const URL = 'https://api.open-meteo.com/v1/forecast?latitude=42.3601&longitude=-71.0589&current=temperature_2m,weather_code,is_day,precipitation,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph'

export function getCondition(code) {
  if (code === 0)                          return 'clear'
  if (code <= 3)                           return 'cloudy'
  if (code <= 48)                          return 'fog'
  if (code <= 67 || (code >= 80 && code <= 82)) return 'rain'
  if (code <= 77 || (code >= 85 && code <= 86)) return 'snow'
  if (code >= 95)                          return 'storm'
  return 'cloudy'
}

export default function useWeather() {
  const [weather, setWeather] = useState(null)

  useEffect(() => {
    fetch(URL)
      .then(r => r.json())
      .then(d => {
        const c = d.current
        setWeather({
          code: c.weather_code,
          condition: getCondition(c.weather_code),
          tempF: Math.round(c.temperature_2m),
          isDay: c.is_day === 1,
          precipitation: c.precipitation,
          wind: c.wind_speed_10m,
        })
      })
      .catch(() => setWeather({ condition: 'clear', tempF: 55, isDay: true, code: 0 }))
  }, [])

  return weather
}
