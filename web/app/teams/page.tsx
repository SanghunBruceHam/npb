'use client'

import { useQuery } from '@tanstack/react-query'
import { teamsApi } from '@/lib/api'
import { Users, Trophy, Home, Plane, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function TeamsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: teamsApi.getAllTeams,
  })

  if (isLoading) {
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
        <h1 className="text-3xl font-bold text-npb-blue mb-2">NPB 팀</h1>
        <p className="text-gray-600">
          센트럴 리그 {data?.central_league?.length || 0}팀, 
          퍼시픽 리그 {data?.pacific_league?.length || 0}팀
        </p>
      </div>

      {/* 센트럴 리그 */}
      <div>
        <h2 className="text-2xl font-bold text-central mb-4">센트럴 리그</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.central_league?.map((team: any) => (
            <TeamCard key={team.team_id} team={team} />
          ))}
        </div>
      </div>

      {/* 퍼시픽 리그 */}
      <div>
        <h2 className="text-2xl font-bold text-pacific mb-4">퍼시픽 리그</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.pacific_league?.map((team: any) => (
            <TeamCard key={team.team_id} team={team} />
          ))}
        </div>
      </div>
    </div>
  )
}

function TeamCard({ team }: { team: any }) {
  const { data: teamDetail } = useQuery({
    queryKey: ['team-detail', team.team_id],
    queryFn: () => teamsApi.getTeamDetail(team.team_id),
  })

  const { data: teamStats } = useQuery({
    queryKey: ['team-stats', team.team_id],
    queryFn: () => teamsApi.getTeamStats(team.team_id),
  })

  return (
    <Link href={`/teams/${team.team_id}`}>
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer">
        <div 
          className="h-2 rounded-t-lg"
          style={{ backgroundColor: team.team_color || '#gray' }}
        />
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold">{team.team_abbreviation}</h3>
              <p className="text-sm text-gray-600">{team.team_name}</p>
            </div>
            {teamDetail?.position_rank && (
              <div className="flex items-center space-x-1">
                <Trophy size={20} className="text-yellow-500" />
                <span className="text-2xl font-bold">{teamDetail.position_rank}위</span>
              </div>
            )}
          </div>

          {teamDetail && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">승률</span>
                <span className="font-medium">
                  {teamDetail.win_percentage?.toFixed(3)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">성적</span>
                <span className="font-medium">
                  {teamDetail.wins}승 {teamDetail.losses}패 {teamDetail.draws}무
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t">
                <div className="text-center">
                  <div className="flex items-center justify-center text-gray-600 mb-1">
                    <Home size={16} className="mr-1" />
                    <span className="text-xs">홈</span>
                  </div>
                  <span className="text-sm font-medium">
                    {teamDetail.home_wins}-{teamDetail.home_losses}
                  </span>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center text-gray-600 mb-1">
                    <Plane size={16} className="mr-1" />
                    <span className="text-xs">원정</span>
                  </div>
                  <span className="text-sm font-medium">
                    {teamDetail.away_wins}-{teamDetail.away_losses}
                  </span>
                </div>
              </div>
            </div>
          )}

          {teamStats?.recent_form && (
            <div className="mt-4 pt-3 border-t">
              <p className="text-xs text-gray-600 mb-2">최근 10경기</p>
              <div className="flex space-x-1">
                {teamStats.recent_form.slice(0, 10).map((result: string, idx: number) => (
                  <span
                    key={idx}
                    className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-medium ${
                      result === 'W'
                        ? 'bg-green-100 text-green-800'
                        : result === 'L'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {result}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 pt-3 border-t">
            <p className="text-sm text-gray-600">
              {team.stadium_name || '홈 구장 정보 없음'}
            </p>
          </div>
        </div>
      </div>
    </Link>
  )
}