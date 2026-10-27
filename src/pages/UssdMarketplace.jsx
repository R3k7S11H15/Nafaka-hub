import React, { useState, useEffect, useRef } from 'react'
import { Phone, Send, Smartphone, MessageSquare, Wifi, Battery, Signal, RefreshCw, Loader2 } from 'lucide-react'
import api from '../services/api'

function now() {
  const d = new Date()
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export default function UssdMarketplace() {
  const [phone, setPhone] = useState('+255 710 379 317')
  const [phoneDraft, setPhoneDraft] = useState('+255 710 379 317')
  const [messages, setMessages] = useState([
    { from: 'system', text: 'Dial *150*99# to access NafakaHub', time: now() },
  ])
  const [input, setInput] = useState('')
  const [prices, setPrices] = useState({})
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [smsLog, setSmsLog] = useState([
    { id: 1, dir: 'in', text: 'NAFAKA: Welcome to Nafaka Hub. Dial *150*99# to start.', time: 'Today 08:00' },
  ])
  const [smsDraft, setSmsDraft] = useState('')
  const [smsPhone, setSmsPhone] = useState('15099')
  const [smsDraftPhone, setSmsDraftPhone] = useState('15099')
  const [state, setState] = useState({ step: 0 })
  const scrollRef = useRef(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [p, prod] = await Promise.all([
          api.getMarketPrices().catch(() => null),
          api.getProducts({ limit: 20 }).catch(() => null),
        ])
        if (!mounted) return
        const priceList = p?.data || p?.prices || p || []
        const prodList = prod?.data?.products || prod?.data || prod?.products || prod || []
        const priceMap = {}
        if (Array.isArray(priceList)) {
          for (const item of priceList) {
            const key = (item.commodity || item.name || '').toLowerCase()
            if (key) priceMap[key] = item
          }
        }
        setPrices(priceMap)
        setProducts(Array.isArray(prodList) ? prodList : [])
      } catch {
        if (mounted) { setPrices({}); setProducts([]) }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const formatPrice = (p) => p ? `TZS ${Number(p.price || 0).toLocaleString()}/kg` : '—'

  const handleSend = () => {
    if (!input.trim()) return
    const ussd = input.trim()
    const userMsg = { from: 'user', text: `*150*99#${ussd !== '0' ? '*' + ussd : ''}`, time: now() }
    let reply = ''
    if (ussd === '0') {
      setState({ step: 0 })
      reply = 'NAFAKA HUB - Main Menu\n1. Sell\n2. Buy\n3. Prices\n4. Account\n5. Weather\n6. Help'
    } else if (state.step === 0) {
      if (ussd === '3') {
        setState({ step: 3 })
        const list = Object.keys(prices).slice(0, 5).map((k, i) => `${i + 1}. ${k}`).join('\n') || 'No prices available'
        reply = `MARKET PRICES\n${list}\n0. Back`
      } else if (ussd === '2') {
        setState({ step: 2 })
        const list = products.slice(0, 5).map((p, i) => `${i + 1}. ${p.name || p.commodity}`).join('\n') || 'No products'
        reply = `BROWSE PRODUCE\n${list}\n0. Back`
      } else {
        reply = 'NAFAKA HUB\n1. Sell\n2. Buy\n3. Prices\n4. Account\n5. Weather\n6. Help\n0. Back'
      }
    } else if (state.step === 3) {
      const keys = Object.keys(prices)
      const idx = parseInt(ussd) - 1
      const key = keys[idx]
      if (key) {
        const p = prices[key]
        reply = `${key.toUpperCase()}\n${formatPrice(p)}\n${p.region || ''}\n0. Back`
      } else {
        reply = 'Invalid option\n0. Back'
      }
    } else if (state.step === 2) {
      const p = products[parseInt(ussd) - 1]
      if (p) {
        reply = `${(p.name || p.commodity).toUpperCase()}\nTZS ${Number(p.price || 0).toLocaleString()}\nStock: ${p.stock || '—'}\n0. Back`
      } else {
        reply = 'Invalid option\n0. Back'
      }
    } else {
      reply = '0. Back to main menu'
    }
    setMessages(m => [...m, userMsg, { from: 'ussd', text: reply, time: now() }])
    setInput('')
  }

  const reset = () => {
    setMessages(m => [...m, { from: 'system', text: 'Session ended. Dial *150*99# to start again.', time: now() }])
    setState({ step: 0 })
  }

  const sendSms = () => {
    if (!smsDraft.trim()) return
    const newMsg = { id: Date.now(), dir: 'out', text: smsDraft, time: now() }
    setSmsLog(l => [...l, newMsg])
    setSmsDraft('')
    setTimeout(() => {
      setSmsLog(l => [...l, {
        id: Date.now() + 1,
        dir: 'in',
        text: 'NAFAKA: Received. Your request is being processed.',
        time: now(),
      }])
    }, 1200)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <Smartphone className="w-7 h-7 text-green-700" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">USSD / SMS Marketplace</h1>
            <p className="text-gray-600">Reach every farmer in Tanzania — no smartphone required</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Phone className="w-5 h-5 text-green-700" /> Dial *150*99#
          </h3>
          <p className="text-sm text-gray-700">Works on any phone. Available on Vodacom, Airtel, Tigo, Halotel.</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-700" /> SMS to 15099
          </h3>
          <p className="text-sm text-gray-700">Send commands via SMS. Reply within 30 seconds.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Phone className="w-5 h-5 text-green-700" /> USSD Simulator
            </h3>
            <button onClick={reset} className="text-xs flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              <RefreshCw className="w-3 h-3" /> Reset Session
            </button>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <label className="text-xs text-gray-500">Phone:</label>
            <input
              value={phoneDraft}
              onChange={(e) => setPhoneDraft(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
            />
            <button onClick={() => setPhone(phoneDraft)} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">Set</button>
          </div>

          <div className="bg-gray-900 rounded-[2rem] p-3 max-w-sm mx-auto shadow-2xl">
            <div className="bg-white rounded-[1.5rem] overflow-hidden">
              <div className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Signal className="w-3 h-3" /><span>Vodacom TZ</span>
                </div>
                <span className="font-medium">{phone}</span>
                <div className="flex items-center gap-2">
                  <Wifi className="w-3 h-3" /><Battery className="w-3 h-3" />
                </div>
              </div>

              <div ref={scrollRef} className="h-72 overflow-y-auto bg-gray-50 p-3 space-y-2 text-sm">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-3 py-2 rounded-lg whitespace-pre-line text-xs leading-relaxed ${
                      m.from === 'user' ? 'bg-green-600 text-white' :
                      m.from === 'system' ? 'bg-gray-200 text-gray-700 italic' :
                      'bg-white border border-gray-200 text-gray-900 font-mono'
                    }`}>
                      {m.text}
                      <div className={`text-[10px] mt-1 ${m.from === 'user' ? 'text-green-100' : 'text-gray-400'}`}>{m.time}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 p-3 bg-white">
                <div className="flex items-center gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Enter USSD option..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                    maxLength={4}
                  />
                  <button onClick={handleSend} className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {['1', '2', '3', '0', '*'].map((k) => (
                    <button key={k} onClick={() => setInput(k)} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs font-mono">{k}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-700" /> SMS Simulator
            </h3>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <label className="text-xs text-gray-500">To:</label>
            <input
              value={smsDraftPhone}
              onChange={(e) => setSmsDraftPhone(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button onClick={() => setSmsPhone(smsDraftPhone)} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Set</button>
          </div>

          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 h-72 overflow-y-auto space-y-3">
            {smsLog.map((m) => (
              <div key={m.id} className={`flex ${m.dir === 'out' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.dir === 'out' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'}`}>
                  <p className="text-xs font-mono mb-1 opacity-70">{m.dir === 'out' ? `To ${smsPhone}` : `From ${smsPhone}`}</p>
                  <p>{m.text}</p>
                  <p className={`text-[10px] mt-1 ${m.dir === 'out' ? 'text-blue-100' : 'text-gray-400'}`}>{m.time}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input
              value={smsDraft}
              onChange={(e) => setSmsDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendSms()}
              placeholder="Type SMS command..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button onClick={sendSms} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
