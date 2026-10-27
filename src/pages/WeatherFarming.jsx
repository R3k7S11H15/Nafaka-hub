import { useEffect, useState } from 'react';
import { CloudRain, Sun, Cloud, Thermometer, Calendar, AlertTriangle, Lightbulb, Newspaper, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';

const SEASON_COLORS = {
  rice: 'bg-green-100 text-green-800',
  maize: 'bg-yellow-100 text-yellow-800',
  wheat: 'bg-orange-100 text-orange-800',
  sorghum: 'bg-red-100 text-red-800',
  millet: 'bg-purple-100 text-purple-800',
}

const ICON_BY_CONDITION = (cond) => {
  if (!cond) return Sun
  const c = cond.toLowerCase()
  if (c.includes('rain')) return CloudRain
  if (c.includes('cloud')) return Cloud
  if (c.includes('hot') || c.includes('dry')) return Thermometer
  return Sun
}

export default function WeatherFarming() {
  const [weather, setWeather] = useState({ current: [], alerts: [] })
  const [calendar, setCalendar] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [w, c] = await Promise.all([
          api.getWeather(),
          api.getPlantingCalendar(),
        ])
        if (w.success) setWeather({ current: w.current || [], alerts: w.alerts || [] })
        if (c.success) setCalendar(c.calendar || [])
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Weather & Farming Info</h1>
          <p className="text-gray-600 mt-2">Stay informed for better decisions</p>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-4">Regional Weather</h2>
        {weather.current.length === 0 ? (
          <p className="text-gray-500 py-8 text-center">No weather data available.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {weather.current.slice(0, 10).map((w) => {
              const Icon = ICON_BY_CONDITION(w.conditions)
              return (
                <div key={w.id} className="bg-white rounded-lg shadow p-4 text-center">
                  <Icon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900">{w.region}</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{parseFloat(w.temperature).toFixed(0)}°C</p>
                  <p className="text-sm text-gray-600">{w.conditions}</p>
                  {w.rainfall_mm > 0 && <p className="text-xs text-blue-600 mt-1">{w.rainfall_mm}mm rain</p>}
                </div>
              )
            })}
          </div>
        )}

        {weather.alerts.length > 0 && (
          <>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Weather Alerts</h2>
            <div className="space-y-4 mb-8">
              {weather.alerts.map(a => (
                <div key={a.id} className={`bg-white rounded-lg shadow p-4 flex items-start border-l-4 ${a.severity === 'high' || a.severity === 'critical' ? 'border-red-500' : a.severity === 'medium' ? 'border-yellow-500' : 'border-blue-500'}`}>
                  <AlertTriangle className="w-6 h-6 text-orange-500 mr-3 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{a.alert_type} - {a.region}</h3>
                    <p className="text-sm text-gray-600">{a.message}</p>
                    <span className="inline-block mt-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded">{a.severity} severity</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <h2 className="text-xl font-semibold text-gray-900 mb-4">Planting Calendar</h2>
        {calendar.length === 0 ? (
          <p className="text-gray-500 py-8 text-center">No planting data available.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {calendar.map((item, idx) => (
              <div key={`${item.crop}-${item.region}-${idx}`} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center mb-2">
                  <Calendar className="w-5 h-5 text-gray-600 mr-2" />
                  <h3 className="font-semibold text-gray-900">{item.crop}</h3>
                </div>
                <p className="text-xs text-gray-500 mb-1">{item.region}</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${SEASON_COLORS[item.crop] || 'bg-gray-100 text-gray-800'}`}>
                  Plant: {item.planting_month} · Harvest: {item.harvest_month}
                </span>
                {item.notes && <p className="text-xs text-gray-500 mt-2">{item.notes}</p>}
              </div>
            ))}
          </div>
        )}

        <h2 className="text-xl font-semibold text-gray-900 mb-4">Agricultural News</h2>
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <p className="text-sm text-gray-500 text-center py-4">No recent agricultural news. Subscribe to market reports for updates.</p>
        </div>
      </div>
    </div>
  );
}
