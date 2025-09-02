'use client'

import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/api'
import { Calendar, Trophy, TrendingUp, Loader2 } from 'lucide-react'

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.getDashboard,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin h-8 w-8 text-npb-blue" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">데이터를 불러오는 중 오류가 발생했습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-npb-blue mb-2">NPB Dashboard</h1>
        <p className="text-gray-600">
          마지막 업데이트: {data?.last_updated ? new Date(data.last_updated).toLocaleString('ko-KR') : '-'}
        </p>
      </div>

      {/* 오늘의 경기 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b flex items-center space-x-2">
          <Calendar className="text-npb-blue" />
          <h2 className="text-xl font-semibold">오늘의 경기</h2>
          <span className="text-sm text-gray-500">({data?.total_today_games || 0}경기)</span>
        </div>
        <div className="p-6">
          {data?.today_games?.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.today_games.map((game: any) => (
                <GameCard key={game.game_id} game={game} />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">오늘 예정된 경기가 없습니다.</p>
          )}
        </div>
      </div>

      {/* 간략한 순위표 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* 센트럴 리그 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b bg-central text-white flex items-center space-x-2">
            <Trophy />
            <h2 className="text-xl font-semibold">센트럴 리그</h2>
          </div>
          <div className="p-6">
            <StandingsTable teams={data?.standings_summary?.central || []} />
          </div>
        </div>

        {/* 퍼시픽 리그 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b bg-pacific text-white flex items-center space-x-2">
            <Trophy />
            <h2 className="text-xl font-semibold">퍼시픽 리그</h2>
          </div>
          <div className="p-6">
            <StandingsTable teams={data?.standings_summary?.pacific || []} />
          </div>
        </div>
      </div>
    </div>
  )
}

function GameCard({ game }: { game: any }) {
  const isCompleted = game.game_status === 'completed'
  const isDraw = game.is_draw
  const isExtraInnings = game.is_extra_innings

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-500">{game.stadium || '경기장 미정'}</span>
        {isExtraInnings && (
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
            연장 {game.total_innings}회
          </span>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="font-medium">{game.away_team}</span>
          <span className="text-2xl font-bold">{game.away_score}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-medium">{game.home_team}</span>
          <span className="text-2xl font-bold">{game.home_score}</span>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t">
        {isCompleted ? (
          isDraw ? (
            <span className="text-sm text-gray-500">무승부</span>
          ) : (
            <span className="text-sm text-green-600">경기 종료</span>
          )
        ) : (
          <span className="text-sm text-blue-600">진행 중</span>
        )}
      </div>
    </div>
  )
}

function StandingsTable({ teams }: { teams: any[] }) {
  return (
    <table className="w-full">
      <thead>
        <tr className="text-sm text-gray-600 border-b">
          <th className="text-left pb-2">순위</th>
          <th className="text-left pb-2">팀</th>
          <th className="text-center pb-2">승</th>
          <th className="text-center pb-2">패</th>
          <th className="text-center pb-2">무</th>
          <th className="text-right pb-2">승률</th>
          <th className="text-right pb-2">차</th>
        </tr>
      </thead>
      <tbody>
        {teams.map((team: any) => (
          <tr key={team.team_id} className="border-b last:border-0">
            <td className="py-2 text-sm">{team.position_rank}</td>
            <td className="py-2 font-medium">{team.team_abbreviation}</td>
            <td className="py-2 text-center text-sm">{team.wins}</td>
            <td className="py-2 text-center text-sm">{team.losses}</td>
            <td className="py-2 text-center text-sm">{team.draws}</td>
            <td className="py-2 text-right text-sm">
              {team.win_percentage?.toFixed(3)}
            </td>
            <td className="py-2 text-right text-sm">
              {team.games_behind > 0 ? team.games_behind.toFixed(1) : '-'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}