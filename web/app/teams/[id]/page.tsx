'use client'

import { useQuery } from '@tanstack/react-query'
import { teamsApi } from '@/lib/api'
import { ArrowLeft, Trophy, TrendingUp, Home, Plane, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function TeamDetailPage() {
  const params = useParams()
  const teamId = Number(params.id)

  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ['team-detail', teamId],
    queryFn: () => teamsApi.getTeamDetail(teamId),
  })

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['team-stats', teamId],
    queryFn: () => teamsApi.getTeamStats(teamId),
  })

  const { data: games, isLoading: gamesLoading } = useQuery({
    queryKey: ['team-games', teamId],
    queryFn: () => teamsApi.getTeamGames(teamId, { limit: 20 }),
  })

  if (teamLoading || statsLoading || gamesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin h-8 w-8 text-npb-blue" />
      </div>
    )
  }

  if (!team) {
    return <div>팀을 찾을 수 없습니다.</div>
  }

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="bg-white rounded-lg shadow p-6">
        <Link href="/teams" className="inline-flex items-center text-npb-blue hover:underline mb-4">
          <ArrowLeft size={20} className="mr-2" />
          팀 목록으로
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-npb-blue mb-2">
              {team.team_name}
            </h1>
            <p className="text-gray-600">
              {team.team_abbreviation} • {team.league} 리그
            </p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center space-x-2 mb-2">
              <Trophy size={32} className="text-yellow-500" />
              <span className="text-4xl font-bold">{team.position_rank}위</span>
            </div>
            <p className="text-sm text-gray-600">현재 순위</p>
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid md:grid-cols-4 gap-4">
        <StatCard
          label="승률"
          value={team.win_percentage?.toFixed(3)}
          subtext={`${team.wins}승 ${team.losses}패 ${team.draws}무`}
        />
        <StatCard
          label="게임차"
          value={team.games_behind > 0 ? `-${team.games_behind.toFixed(1)}` : 'Leader'}
          subtext={`${team.games_played}경기`}
        />
        <StatCard
          label="득실차"
          value={team.run_differential > 0 ? `+${team.run_differential}` : team.run_differential}
          subtext={`득점 ${team.runs_scored} / 실점 ${team.runs_allowed}`}
          valueClass={team.run_differential > 0 ? 'text-green-600' : 'text-red-600'}
        />
        <StatCard
          label="홈/원정"
          value={`${team.home_wins}-${team.home_losses}`}
          subtext={`원정: ${team.away_wins}-${team.away_losses}`}
        />
      </div>

      {/* 최근 폼 */}
      {stats?.recent_form && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">최근 10경기</h2>
          <div className="flex space-x-2 mb-4">
            {stats.recent_form.map((result: string, idx: number) => (
              <div
                key={idx}
                className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                  result === 'W'
                    ? 'bg-green-500 text-white'
                    : result === 'L'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-400 text-white'
                }`}
              >
                {result}
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600">
            {stats.recent_form.filter((r: string) => r === 'W').length}승{' '}
            {stats.recent_form.filter((r: string) => r === 'L').length}패{' '}
            {stats.recent_form.filter((r: string) => r === 'D').length}무
          </p>
        </div>
      )}

      {/* 월별 성적 */}
      {stats?.monthly_performance && stats.monthly_performance.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">월별 성적</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-sm text-gray-600">
                  <th className="px-4 py-2 text-left">월</th>
                  <th className="px-4 py-2 text-center">경기</th>
                  <th className="px-4 py-2 text-center">승</th>
                  <th className="px-4 py-2 text-center">패</th>
                  <th className="px-4 py-2 text-center">무</th>
                  <th className="px-4 py-2 text-center">승률</th>
                  <th className="px-4 py-2 text-center">평균 득점</th>
                  <th className="px-4 py-2 text-center">평균 실점</th>
                </tr>
              </thead>
              <tbody>
                {stats.monthly_performance.map((month: any) => (
                  <tr key={month.month} className="border-b">
                    <td className="px-4 py-2">{month.month}월</td>
                    <td className="px-4 py-2 text-center">{month.games_played}</td>
                    <td className="px-4 py-2 text-center font-medium">{month.wins}</td>
                    <td className="px-4 py-2 text-center">{month.losses}</td>
                    <td className="px-4 py-2 text-center">{month.draws}</td>
                    <td className="px-4 py-2 text-center font-medium">
                      {month.wins && month.losses 
                        ? (month.wins / (month.wins + month.losses)).toFixed(3)
                        : '.000'}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {month.avg_runs_scored?.toFixed(1)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {month.avg_runs_allowed?.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 최근 경기 */}
      {games?.games && games.games.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold">최근 경기</h2>
          </div>
          <div className="divide-y">
            {games.games.map((game: any) => (
              <div key={game.game_id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-500 w-24">
                      {new Date(game.game_date).toLocaleDateString('ko-KR')}
                    </div>
                    <div className="flex items-center space-x-2">
                      {game.venue === 'home' ? (
                        <Home size={16} className="text-blue-500" />
                      ) : (
                        <Plane size={16} className="text-green-500" />
                      )}
                      <span className="text-sm text-gray-600">
                        vs {game.venue === 'home' ? game.away_team : game.home_team}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <span className="text-lg font-medium">
                        {game.venue === 'home' ? game.home_score : game.away_score} - 
                        {game.venue === 'home' ? game.away_score : game.home_score}
                      </span>
                    </div>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                        game.result === 'W'
                          ? 'bg-green-500'
                          : game.result === 'L'
                          ? 'bg-red-500'
                          : 'bg-gray-400'
                      }`}
                    >
                      {game.result}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ 
  label, 
  value, 
  subtext, 
  valueClass = '' 
}: { 
  label: string
  value: any
  subtext?: string
  valueClass?: string
}) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
      {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
    </div>
  )
}