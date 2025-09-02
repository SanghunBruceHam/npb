'use client'

import { useQuery } from '@tanstack/react-query'
import { standingsApi } from '@/lib/api'
import { Trophy, Sparkles, AlertCircle, Loader2 } from 'lucide-react'
import { useState } from 'react'

export default function StandingsPage() {
  const [selectedLeague, setSelectedLeague] = useState<'all' | 'Central' | 'Pacific'>('all')

  const { data: standingsData, isLoading: standingsLoading } = useQuery({
    queryKey: ['standings', selectedLeague],
    queryFn: () => standingsApi.getStandings(selectedLeague === 'all' ? undefined : selectedLeague),
  })

  const { data: magicData, isLoading: magicLoading } = useQuery({
    queryKey: ['magic-numbers'],
    queryFn: () => standingsApi.getMagicNumbers(),
  })

  if (standingsLoading || magicLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin h-8 w-8 text-npb-blue" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-npb-blue mb-4">순위표 & 매직넘버</h1>
        
        {/* 리그 선택 탭 */}
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedLeague('all')}
            className={`px-4 py-2 rounded-md transition-colors ${
              selectedLeague === 'all'
                ? 'bg-npb-blue text-white'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setSelectedLeague('Central')}
            className={`px-4 py-2 rounded-md transition-colors ${
              selectedLeague === 'Central'
                ? 'bg-central text-white'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            센트럴 리그
          </button>
          <button
            onClick={() => setSelectedLeague('Pacific')}
            className={`px-4 py-2 rounded-md transition-colors ${
              selectedLeague === 'Pacific'
                ? 'bg-pacific text-white'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            퍼시픽 리그
          </button>
        </div>
      </div>

      {/* 매직넘버 카드 */}
      <div className="grid md:grid-cols-2 gap-6">
        {magicData && (
          <>
            <MagicNumberCard
              league="센트럴 리그"
              data={magicData.central_league}
              color="bg-central"
            />
            <MagicNumberCard
              league="퍼시픽 리그"
              data={magicData.pacific_league}
              color="bg-pacific"
            />
          </>
        )}
      </div>

      {/* 상세 순위표 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">상세 순위표</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-sm text-gray-600">
                <th className="px-4 py-3 text-left">순위</th>
                <th className="px-4 py-3 text-left">팀</th>
                <th className="px-4 py-3 text-center">경기</th>
                <th className="px-4 py-3 text-center">승</th>
                <th className="px-4 py-3 text-center">패</th>
                <th className="px-4 py-3 text-center">무</th>
                <th className="px-4 py-3 text-center">승률</th>
                <th className="px-4 py-3 text-center">게임차</th>
                <th className="px-4 py-3 text-center">득점</th>
                <th className="px-4 py-3 text-center">실점</th>
                <th className="px-4 py-3 text-center">득실차</th>
                <th className="px-4 py-3 text-center">매직</th>
              </tr>
            </thead>
            <tbody>
              {standingsData?.standings?.map((team: any, idx: number) => (
                <tr key={team.team_id} className={`border-b ${idx === 0 ? 'bg-yellow-50' : ''}`}>
                  <td className="px-4 py-3 font-semibold">{team.position_rank}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{team.team_abbreviation}</span>
                      {team.position_rank === 1 && <Trophy size={16} className="text-yellow-500" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">{team.games_played}</td>
                  <td className="px-4 py-3 text-center font-medium">{team.wins}</td>
                  <td className="px-4 py-3 text-center">{team.losses}</td>
                  <td className="px-4 py-3 text-center">{team.draws}</td>
                  <td className="px-4 py-3 text-center font-medium">
                    {team.win_percentage?.toFixed(3)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {team.games_behind > 0 ? team.games_behind.toFixed(1) : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">{team.runs_scored}</td>
                  <td className="px-4 py-3 text-center">{team.runs_allowed}</td>
                  <td className={`px-4 py-3 text-center font-medium ${
                    team.run_differential > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {team.run_differential > 0 ? '+' : ''}{team.run_differential}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {team.magic_number ? (
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-npb-red text-white rounded-full font-bold">
                        {team.magic_number}
                      </span>
                    ) : team.clinch_status === 'champion' ? (
                      <Sparkles className="text-yellow-500" />
                    ) : team.clinch_status === 'eliminated' ? (
                      <span className="text-gray-400">E</span>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function MagicNumberCard({ league, data, color }: {
  league: string
  data: any
  color: string
}) {
  const leader = data?.standings?.[0]
  const scenarios = data?.scenarios

  return (
    <div className="bg-white rounded-lg shadow">
      <div className={`px-6 py-4 ${color} text-white`}>
        <h3 className="text-lg font-semibold">{league}</h3>
      </div>
      <div className="p-6">
        {leader && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600">1위</p>
                <p className="text-2xl font-bold">{leader.team_abbreviation}</p>
              </div>
              {leader.magic_number && (
                <div className="text-center">
                  <p className="text-sm text-gray-600">매직넘버</p>
                  <p className="text-4xl font-bold text-npb-red">{leader.magic_number}</p>
                </div>
              )}
              {leader.clinch_status === 'champion' && (
                <div className="flex items-center space-x-2 text-yellow-500">
                  <Sparkles size={32} />
                  <span className="text-xl font-bold">우승!</span>
                </div>
              )}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">승률</span>
                <span className="font-medium">{leader.win_percentage?.toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">승-패-무</span>
                <span className="font-medium">
                  {leader.wins}-{leader.losses}-{leader.draws}
                </span>
              </div>
            </div>

            {scenarios?.contenders?.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600 mb-2">추격 팀</p>
                {scenarios.contenders.map((team: any) => (
                  <div key={team.team_name} className="flex justify-between text-sm mb-1">
                    <span>{team.team_name}</span>
                    <span className="text-gray-600">-{team.games_behind.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}