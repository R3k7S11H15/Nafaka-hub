import { useState, useEffect } from 'react'
import { Gift, Star, Award, Users, Percent, Ticket, TrendingUp, Copy, Loader2 } from 'lucide-react'
import api from '../services/api'

const LEVEL_STYLES = {
  Silver: 'bg-gray-100 border-gray-300 text-gray-600 bg-gray-200',
  Gold: 'bg-amber-50 border-amber-300 text-amber-600 bg-amber-100',
  Platinum: 'bg-purple-50 border-purple-300 text-purple-600 bg-purple-100',
  Bronze: 'bg-orange-50 border-orange-300 text-orange-600 bg-orange-100',
  Diamond: 'bg-cyan-50 border-cyan-300 text-cyan-600 bg-cyan-100',
}

const styleFor = (name) => LEVEL_STYLES[name] || 'bg-gray-100 border-gray-300 text-gray-600 bg-gray-200'

const ICON_MAP = { Gift, Star, Award, Users, Percent, Ticket, TrendingUp }

export default function LoyaltyReferral() {
  const [levels, setLevels] = useState([])
  const [rewards, setRewards] = useState([])
  const [loyalty, setLoyalty] = useState(null)
  const [cashbackHistory, setCashbackHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [levelsRes, rewardsRes, loyaltyRes] = await Promise.all([
          api.getLoyaltyLevels(),
          api.getLoyaltyRewards(),
          api.getMyLoyalty(),
        ])
        if (!mounted) return
        setLevels(levelsRes?.data || levelsRes?.levels || levelsRes || [])
        setRewards(rewardsRes?.data || rewardsRes?.rewards || rewardsRes || [])
        const loyaltyData = loyaltyRes?.data || loyaltyRes || {}
        setLoyalty(loyaltyData)
        setCashbackHistory(loyaltyData?.cashback_history || loyaltyData?.cashbackHistory || [])
      } catch {
        if (mounted) {
          setLevels([])
          setRewards([])
          setLoyalty(null)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const currentPoints = Number(loyalty?.points ?? loyalty?.current_points ?? 0)
  const currentLevel = loyalty?.level || loyalty?.current_level || loyalty?.tier || '—'
  const nextLevel = loyalty?.next_level || loyalty?.nextLevel
  const nextLevelPoints = Number(loyalty?.next_level_points ?? loyalty?.nextLevelPoints ?? (nextLevel?.min_points) ?? Math.max(currentPoints, 1))
  const pointsToNext = Math.max(nextLevelPoints - currentPoints, 0)
  const progressPercentage = nextLevelPoints > 0 ? Math.min((currentPoints / nextLevelPoints) * 100, 100) : 0
  const referralCode = loyalty?.referral_code || loyalty?.referralCode || ''
  const referralLink = referralCode ? `https://grainmart.co.tz/ref/${referralCode}` : ''
  const totalReferrals = loyalty?.total_referrals ?? loyalty?.totalReferrals ?? 0
  const totalEarnings = loyalty?.total_earnings ?? loyalty?.totalEarnings ?? 0

  const copyToClipboard = (text) => {
    if (text && navigator.clipboard) navigator.clipboard.writeText(text)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Gift className="w-8 h-8 text-amber-600" />
          <h1 className="text-3xl font-bold text-gray-900">Loyalty & Rewards</h1>
        </div>
        <p className="text-gray-600 ml-11">Earn points and exclusive benefits</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Points Balance</h2>
            <p className="text-4xl font-bold text-amber-600">{currentPoints.toLocaleString()} pts</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 mb-1">Current Level: {currentLevel}</p>
            <p className="text-sm text-gray-500">{pointsToNext.toLocaleString()} pts to {nextLevel?.name || 'next level'}</p>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
          <div className="bg-amber-500 h-4 rounded-full transition-all" style={{ width: `${progressPercentage}%` }} />
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>{currentLevel}</span>
          <span>{nextLevel?.name || '—'}</span>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Membership Levels</h2>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading levels...
          </div>
        ) : levels.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">No membership levels available.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {levels.map((level, index) => {
              const parts = (styleFor(level.name) || '').split(' ')
              const color = parts[0] || 'bg-gray-100'
              const border = parts[1] || 'border-gray-300'
              const text = parts[2] || 'text-gray-600'
              const iconBg = parts[3] || 'bg-gray-200'
              return (
                <div key={level.id || level.name || index} className={`border-2 rounded-xl p-6 ${color} ${border}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-3 rounded-full ${iconBg}`}>
                      <Award className={`w-6 h-6 ${text}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{level.name}</h3>
                      <p className="text-sm text-gray-600">{level.range || `${level.min_points ?? 0} - ${level.max_points ?? '∞'} pts`}</p>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {(Array.isArray(level.benefits) ? level.benefits : []).map((benefit, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <Star className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Recent Points Transactions</h2>
        <div className="text-center py-8 text-gray-500">No recent transactions to display.</div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-gray-900">Referral Program</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Your Referral Code</label>
            <div className="flex gap-2">
              <input type="text" value={referralCode || '—'} readOnly className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-gray-900" />
              <button onClick={() => copyToClipboard(referralCode)} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2">
                <Copy className="w-4 h-4" /> Copy
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Share Link</label>
            <div className="flex gap-2">
              <input type="text" value={referralLink || '—'} readOnly className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700" />
              <button onClick={() => copyToClipboard(referralLink)} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2">
                <Copy className="w-4 h-4" /> Copy
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Referrals</p>
                <p className="text-2xl font-bold text-gray-900">{totalReferrals}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900">TZS {Number(totalEarnings).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Available Rewards</h2>
        {rewards.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No rewards available.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {rewards.map((reward, index) => {
              const Icon = ICON_MAP[reward.icon] || Gift
              return (
                <div key={reward.id || index} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="p-3 rounded-full w-fit mb-4 bg-amber-50 text-amber-600">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{reward.name || reward.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{(reward.points ?? reward.points_required ?? 0).toLocaleString()} points required</p>
                  <button className="w-full px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium">
                    Redeem
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Cashback History</h2>
        {cashbackHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No cashback history yet.</div>
        ) : (
          <div className="space-y-4">
            {cashbackHistory.map((record, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <Percent className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{record.month || record.label} Cashback</p>
                    <p className="text-sm text-gray-500">{record.percentage || record.rate} cashback earned</p>
                  </div>
                </div>
                <span className="font-semibold text-green-600">{record.amount || record.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
