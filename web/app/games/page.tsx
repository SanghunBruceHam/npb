'use client'

import { useQuery } from '@tanstack/react-query'
import { gamesApi } from '@/lib/api'
import { Calendar, Filter, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

export default function GamesPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [teamFilter, setTeamFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['games', selectedDate, teamFilter],
    queryFn: () => gamesApi.getGames({
      date_from: selectedDate,
      date_to: selectedDate,
      team: teamFilter || undefined,
      limit: 50,
    }),
  })

  const changeDate = (days: number) => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() + days)
    setSelectedDate(date.toISOString().split('T')[0])
  }

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
        <h1 className="text-3xl font-bold text-npb-blue mb-4">경기 결과</h1>
        
        {/* 날짜 선택 */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => changeDate(-1)}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex items-center space-x-2">
            <Calendar size={20} className="text-gray-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-npb-blue"
            />
          </div>
          
          <button
            onClick={() => changeDate(1)}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ChevronRight size={20} />
          </button>
          
          <div className="flex items-center space-x-2 ml-auto">
            <Filter size={20} className="text-gray-600" />
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-npb-blue"
            >
              <option value="">전체 팀</option>
              <option value="YOG">요미우리</option>
              <option value="HAN">한신</option>
              <option value="YDB">DeNA</option>
              <option value="HIR">히로시마</option>
              <option value="CHU">주니치</option>
              <option value="YAK">야쿠르트</option>
              <option value="SOF">소프트뱅크</option>
              <option value="LOT">롯데</option>
              <option value="RAK">라쿠텐</option>
              <option value="ORI">오릭스</option>
              <option value="SEI">세이부</option>
              <option value="NIP">니혼햄</option>
            </select>
          </div>
        </div>
      </div>

      {/* 경기 목록 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">
            {selectedDate} 경기 ({data?.total_games || 0}경기)
          </h2>
        </div>
        
        {data?.games?.length > 0 ? (
          <div className="divide-y">
            {data.games.map((game: any) => (
              <GameRow key={game.game_id} game={game} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            해당 날짜에 경기가 없습니다.
          </div>
        )}
      </div>
    </div>
  )
}

function GameRow({ game }: { game: any }) {
  const [showDetails, setShowDetails] = useState(false)
  const { data: inningData } = useQuery({
    queryKey: ['inning-scores', game.game_id],
    queryFn: () => gamesApi.getInningScores(game.game_id),
    enabled: showDetails,
  })

  const homeWin = game.home_score > game.away_score
  const awayWin = game.away_score > game.home_score
  const isDraw = game.is_draw

  return (
    <div>
      <div
        className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="grid grid-cols-3 gap-4 items-center">
              {/* 어웨이 팀 */}
              <div className={`text-right ${awayWin ? 'font-bold' : ''}`}>
                <span className="text-lg">{game.away_team_full || game.away_team}</span>
              </div>
              
              {/* 스코어 */}
              <div className="text-center">
                <div className="flex items-center justify-center space-x-4">
                  <span className={`text-3xl ${awayWin ? 'font-bold text-npb-blue' : 'text-gray-600'}`}>
                    {game.away_score}
                  </span>
                  <span className="text-gray-400">-</span>
                  <span className={`text-3xl ${homeWin ? 'font-bold text-npb-blue' : 'text-gray-600'}`}>
                    {game.home_score}
                  </span>
                </div>
                {game.is_extra_innings && (
                  <span className="text-xs text-yellow-600">연장 {game.total_innings}회</span>
                )}
                {isDraw && (
                  <span className="text-xs text-gray-600">무승부</span>
                )}
              </div>
              
              {/* 홈 팀 */}
              <div className={`text-left ${homeWin ? 'font-bold' : ''}`}>
                <span className="text-lg">{game.home_team_full || game.home_team}</span>
              </div>
            </div>
          </div>
          
          <div className="ml-4 text-sm text-gray-500">
            <div>{game.stadium}</div>
            <div>{game.game_start_time}</div>
          </div>
        </div>
      </div>
      
      {/* 이닝별 스코어 */}
      {showDetails && inningData && (
        <div className="px-6 pb-6 bg-gray-50">
          <div className="bg-white rounded-lg p-4">
            <h4 className="text-sm font-semibold mb-3">이닝별 득점</h4>
            <div className="overflow-x-auto">
              <table className="text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-3 py-1 text-left">팀</th>
                    {inningData.scoreboard.innings.map((inning: any) => (
                      <th key={inning.inning_number} className="px-3 py-1 text-center">
                        {inning.inning_number}
                      </th>
                    ))}
                    <th className="px-3 py-1 text-center font-bold">R</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-3 py-1 font-medium">{game.away_team}</td>
                    {inningData.scoreboard.innings.map((inning: any) => (
                      <td key={inning.inning_number} className="px-3 py-1 text-center">
                        {inning.away_score}
                      </td>
                    ))}
                    <td className="px-3 py-1 text-center font-bold">
                      {inningData.scoreboard.away_total}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1 font-medium">{game.home_team}</td>
                    {inningData.scoreboard.innings.map((inning: any) => (
                      <td key={inning.inning_number} className="px-3 py-1 text-center">
                        {inning.home_score}
                      </td>
                    ))}
                    <td className="px-3 py-1 text-center font-bold">
                      {inningData.scoreboard.home_total}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}