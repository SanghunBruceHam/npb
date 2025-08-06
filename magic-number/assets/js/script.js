// KBO 매직넘버 계산기 - JavaScript

// KBO 팀 데이터 (2025 시즌 기준)
const kboTeams = {
    "한화": { fullName: "한화 이글스", color: "#FF6600", logo: '<img src="images/hanwha.png" class="team-logo" alt="한화">' },
    "LG": { fullName: "LG 트윈스", color: "#C50E2E", logo: '<img src="images/lg.png" class="team-logo" alt="LG">' },
    "두산": { fullName: "두산 베어스", color: "#131230", logo: '<img src="images/doosan.png" class="team-logo" alt="두산">' },
    "삼성": { fullName: "삼성 라이온즈", color: "#1F4E8C", logo: '<img src="images/samsung.png" class="team-logo" alt="삼성">' },
    "KIA": { fullName: "KIA 타이거즈", color: "#EA0029", logo: '<img src="images/kia.png" class="team-logo" alt="KIA">' },
    "SSG": { fullName: "SSG 랜더스", color: "#CE0E2D", logo: '<img src="images/ssg.png" class="team-logo" alt="SSG">' },
    "롯데": { fullName: "롯데 자이언츠", color: "#041E42", logo: '<img src="images/lotte.png" class="team-logo" alt="롯데">' },
    "NC": { fullName: "NC 다이노스", color: "#315288", logo: '<img src="images/nc.png" class="team-logo" alt="NC">' },
    "키움": { fullName: "키움 히어로즈", color: "#570514", logo: '<img src="images/kiwoom.png" class="team-logo" alt="키움">' },
    "KT": { fullName: "KT 위즈", color: "#000000", logo: '<img src="images/kt.png" class="team-logo" alt="KT">' }
};

        // KBO 순위 데이터 (동적 로딩)
        let currentStandings = [];
        let currentKBOData = null;
        
        // 메모리 관리를 위한 이벤트 리스너 관리자
        class EventManager {
            constructor() {
                this.listeners = new Map();
                this.boundCleanup = this.cleanup.bind(this);
                
                // 페이지 언로드 시 정리
                window.addEventListener('beforeunload', this.boundCleanup);
                window.addEventListener('pagehide', this.boundCleanup);
            }
            
            add(element, event, handler, options = {}) {
                const key = `${element.constructor.name}_${event}_${Date.now()}`;
                element.addEventListener(event, handler, options);
                
                this.listeners.set(key, {
                    element,
                    event,
                    handler,
                    options
                });
                
                return key; // 나중에 개별 제거할 때 사용
            }
            
            remove(key) {
                if (this.listeners.has(key)) {
                    const { element, event, handler } = this.listeners.get(key);
                    element.removeEventListener(event, handler);
                    this.listeners.delete(key);
                }
            }
            
            cleanup() {
                console.log(`🧹 메모리 정리: ${this.listeners.size}개 이벤트 리스너 제거`);
                this.listeners.forEach(({ element, event, handler }) => {
                    try {
                        element.removeEventListener(event, handler);
                    } catch (e) {
                        console.warn('이벤트 리스너 제거 실패:', e);
                    }
                });
                this.listeners.clear();
                
            }
        }
        
        // 전역 이벤트 관리자 인스턴스
        const eventManager = new EventManager();
        
        // 공통 유틸리티 함수들
        const Utils = {
            // 팀명과 로고를 조합한 HTML 생성
            getTeamNameWithLogo(team, includeRank = false) {
                const teamData = kboTeams[team.team || team];
                if (!teamData) return team.team || team;
                
                const teamName = team.team || team;
                const logoAndName = `
                    <div style="display: flex; align-items: center; gap: 3px;">
                        ${teamData.logo}
                        <span style="color: ${teamData.color}; font-weight: 600;">${teamName}</span>
                    </div>
                `;
                
                if (includeRank && team.rank) {
                    return `${logoAndName} <span style="color: #666; font-size: 0.9rem;">(${team.rank}위)</span>`;
                }
                
                return logoAndName;
            },
            
            // 홈/어웨이 기록 표시 HTML 생성
            getHomeAwayDisplay(teamName) {
                const homeAwayRecords = {
                    "LG": { home: "33-19-0", away: "29-21-2" },
                    "한화": { home: "31-17-2", away: "28-22-1" },
                    "롯데": { home: "28-21-2", away: "26-22-1" },
                    "KT": { home: "26-23-1", away: "24-24-2" },
                    "SSG": { home: "24-22-2", away: "23-24-2" },
                    "삼성": { home: "27-22-0", away: "21-26-1" },
                    "KIA": { home: "26-20-3", away: "20-27-1" },
                    "NC": { home: "24-21-2", away: "20-24-3" },
                    "두산": { home: "21-25-3", away: "20-27-2" },
                    "키움": { home: "16-32-2", away: "12-36-2" }
                };
                
                const teamHomeAway = homeAwayRecords[teamName] || { home: "0-0-0", away: "0-0-0" };
                
                // 홈/방문 승률 계산
                const parseRecord = (record) => {
                    const [wins, losses, draws] = record.split('-').map(Number);
                    const totalGames = wins + losses;
                    const winRate = totalGames > 0 ? (wins / totalGames) : 0;
                    return { wins, losses, draws, winRate };
                };
                
                const homeStats = parseRecord(teamHomeAway.home);
                const awayStats = parseRecord(teamHomeAway.away);
                
                return `
                    <div style="
                        font-size: 0.9rem; 
                        line-height: 1.4;
                        text-align: center;
                        color: #555;
                    ">
                        <div style="margin-bottom: 3px; font-weight: 600;">
                            ${teamHomeAway.home} / ${teamHomeAway.away}
                        </div>
                        <div style="font-size: 0.85rem; color: #666;">
                            🏠 ${homeStats.winRate.toFixed(3)} / ✈️ ${awayStats.winRate.toFixed(3)}
                        </div>
                    </div>
                `;
            },
            
            // 매직넘버 표시 HTML 생성
            getMagicNumberDisplay(team) {
                const magicNumbers = currentKBOData?.magicNumbers || {};
                
                let magicNumber = 0;
                if (team.rank === 1) {
                    // 1위팀: 우승 매직넘버
                    const firstPlaceMagic = magicNumbers[team.team];
                    magicNumber = firstPlaceMagic ? firstPlaceMagic.championship : 0;
                } else {
                    // 나머지 팀: PO 진출 매직넘버 (72승 기준)
                    magicNumber = Math.max(0, 72 - team.wins);
                }
                
                if (magicNumber === 0) {
                    return team.rank === 1 ? 
                        '<span style="color: #FFD700; font-weight: 700;">우승확정</span>' :
                        '<span style="color: #4CAF50; font-weight: 700;">PO확정</span>';
                }
                
                // 매직넘버 색상 결정
                let color = '#666';
                if (magicNumber <= 3) color = '#4CAF50';      // 초록
                else if (magicNumber <= 10) color = '#FF9800'; // 주황
                else if (magicNumber <= 20) color = '#FF5722'; // 빨강
                else color = '#9E9E9E';                        // 회색
                
                return `<span style="color: ${color}; font-weight: 600;">${magicNumber}</span>`;
            },
            
            // 테이블 행 HTML 생성 (공통 스타일 적용)
            createTableRow(cells, teamColor = null, additionalClasses = '') {
                const row = document.createElement('tr');
                if (teamColor) {
                    row.style.borderLeft = `4px solid ${teamColor}`;
                }
                if (additionalClasses) {
                    row.className = additionalClasses;
                }
                
                row.innerHTML = cells.map(cell => `<td>${cell}</td>`).join('');
                return row;
            }
        };
        
        // 에러 처리 및 사용자 알림 함수들
        function showNotification(message, type = 'error', duration = 5000) {
            // 기존 알림 제거
            const existingNotification = document.querySelector('.error-notification');
            if (existingNotification) {
                existingNotification.remove();
            }
            
            const notification = document.createElement('div');
            notification.className = `error-notification ${type}`;
            notification.innerHTML = `
                <button class="close-btn" onclick="this.parentElement.remove()">&times;</button>
                <strong>${type === 'error' ? '⚠️ 오류' : '✅ 알림'}</strong><br>
                ${message}
            `;
            
            document.body.appendChild(notification);
            
            // 자동 제거
            if (duration > 0) {
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, duration);
            }
        }
        
        function handleError(error, context = '알 수 없는 오류') {
            console.error(`❌ ${context}:`, error);
            
            let userMessage = '';
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                userMessage = '네트워크 연결을 확인해주세요. 잠시 후 다시 시도합니다.';
            } else if (error.name === 'SyntaxError') {
                userMessage = '데이터 형식에 문제가 있습니다. 백업 데이터를 사용합니다.';
            } else {
                userMessage = `${context} 발생. 백업 데이터를 사용하여 서비스를 계속 제공합니다.`;
            }
            
            showNotification(userMessage, 'error', 8000);
        }
        
        // 데이터 정보 업데이트 함수
        function updateLoadingTime(data) {
            try {
                // 현재 시간 (데이터 로딩 시간)
                const now = new Date();
                const loadDate = now.toLocaleDateString('ko-KR');
                const loadTime = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                
                // 표시 텍스트 구성
                const displayText = `${loadDate} ${loadTime} KBO 공식`;
                
                // 모든 데이터 정보 표시 업데이트
                const loadTimeElements = document.querySelectorAll('.data-load-time');
                loadTimeElements.forEach(element => {
                    if (element) {
                        element.textContent = displayText;
                    }
                });
                
                console.log('📊 데이터 로딩 시간 업데이트:', displayText);
            } catch (error) {
                console.error('❌ 데이터 로딩 시간 업데이트 실패:', error);
            }
        }

        // 데이터 로딩 함수
        async function loadKBOData() {
            try {
                console.log('🔍 KBO 데이터 로딩 시작...');
                const response = await fetch(`assets/data/service-data.json?v=${Date.now()}`);
                console.log('📡 응답 상태:', response.status, response.statusText);
                if (response.ok) {
                    const data = await response.json();
                    console.log('📊 로드된 데이터:', data);
                    // JSON 데이터 구조를 JavaScript 코드가 기대하는 형태로 변환
                    currentStandings = (data.standings || []).map(team => ({
                        ...team,
                        winPct: team.winRate || team.winPct || 0, // winRate를 winPct로 변환
                        recent10: team.recent10 || "5승 0무 5패",
                        streak: team.streak || "1승",
                        homeAway: { 
                            home: team.homeRecord || "0-0-0", 
                            away: team.awayRecord || "0-0-0" 
                        } // 실제 홈/원정 기록 사용
                    }));
                    
                    // currentKBOData에 전체 데이터 저장 (playoffData 포함)
                    currentKBOData = data;
                    console.log('✅ KBO 데이터 로딩 완료:', currentStandings.length + '팀');
                    
                    // 데이터 로딩 시간 업데이트
                    updateLoadingTime(data);
                    
                    showNotification(`최신 KBO 데이터 로딩 완료 (${currentStandings.length}개 팀)`, 'success', 3000);
                    return data;
                } else {
                    console.error('❌ 응답 실패:', response.status, response.statusText);
                    throw new Error(`데이터 로딩 실패: ${response.status} ${response.statusText}`);
                }
            } catch (error) {
                console.error('❌ loadKBOData 에러 상세:', error);
                handleError(error, 'KBO 데이터 로딩 실패');
                // 백업 데이터 사용
                currentStandings = [
                    { rank: 1, team: "LG", games: 104, wins: 62, losses: 40, draws: 2, winPct: 0.608, gamesBehind: 0, recent10: "9승0무1패", streak: "7승", homeAway: { home: "33-19-0", away: "29-21-2" } },
                    { rank: 2, team: "한화", games: 101, wins: 59, losses: 39, draws: 3, winPct: 0.602, gamesBehind: 1, recent10: "3승1무6패", streak: "2패", homeAway: { home: "31-17-2", away: "28-22-1" } },
                    { rank: 3, team: "롯데", games: 102, wins: 55, losses: 44, draws: 3, winPct: 0.556, gamesBehind: 5, recent10: "7승0무3패", streak: "1패", homeAway: { home: "29-21-2", away: "26-23-1" } },
                    { rank: 4, team: "SSG", games: 99, wins: 49, losses: 46, draws: 4, winPct: 0.516, gamesBehind: 9, recent10: "6승1무3패", streak: "2승", homeAway: { home: "24-21-4", away: "25-25-0" } },
                    { rank: 5, team: "KIA", games: 99, wins: 48, losses: 47, draws: 4, winPct: 0.505, gamesBehind: 10, recent10: "2승1무7패", streak: "2승", homeAway: { home: "29-20-2", away: "19-27-2" } },
                    { rank: 6, team: "KT", games: 102, wins: 50, losses: 49, draws: 3, winPct: 0.505, gamesBehind: 10, recent10: "5승0무5패", streak: "4패", homeAway: { home: "26-25-1", away: "24-24-2" } },
                    { rank: 7, team: "NC", games: 96, wins: 45, losses: 46, draws: 5, winPct: 0.495, gamesBehind: 11, recent10: "5승0무5패", streak: "1승", homeAway: { home: "19-19-0", away: "26-27-5" } },
                    { rank: 8, team: "삼성", games: 99, wins: 48, losses: 50, draws: 1, winPct: 0.49, gamesBehind: 11.5, recent10: "4승0무6패", streak: "3패", homeAway: { home: "30-21-0", away: "18-29-1" } },
                    { rank: 9, team: "두산", games: 100, wins: 41, losses: 54, draws: 5, winPct: 0.432, gamesBehind: 17, recent10: "3승2무5패", streak: "2패", homeAway: { home: "20-28-4", away: "21-26-1" } },
                    { rank: 10, team: "키움", games: 102, wins: 29, losses: 69, draws: 4, winPct: 0.296, gamesBehind: 30.5, recent10: "2승1무7패", streak: "1승", homeAway: { home: "18-35-2", away: "11-34-2" } }
                ];
                console.log('📊 백업 데이터 사용:', currentStandings.length + '팀');
                // 백업 데이터도 JSON 형식으로 반환
                const backupData = {
                    rankings: currentStandings,
                    magicNumbers: {},
                    lastUpdated: new Date().toISOString(),
                    updateDate: new Date().toLocaleDateString('ko-KR')
                };
                
                // 백업 데이터 사용시에도 로딩 시간 업데이트
                updateLoadingTime(backupData);
                
                return backupData;
            }
        }

        // 팀간 상대전적 데이터 (동적 로딩)
        let headToHeadData = {};

        // 상대전적 데이터 로딩 함수
        async function loadHeadToHeadData() {
            try {
                console.log('🔍 상대전적 데이터 로딩 시작...');
                const response = await fetch(`assets/data/kbo-records.json?v=${Date.now()}`);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('📡 상대전적 응답 상태:', response.status);
                    
                    if (data && data.totalData) {
                        // kbo-records.json 형식을 headToHeadData 형식으로 변환
                        headToHeadData = {};
                        
                        for (const [team1, opponents] of Object.entries(data.totalData)) {
                            headToHeadData[team1] = {};
                            
                            for (const [team2, record] of Object.entries(opponents)) {
                                const wins = record.wins || 0;
                                const losses = record.losses || 0;
                                const draws = record.draws || 0;
                                
                                // 전체 데이터를 보존하여 실제 홈/원정 기록 사용 가능
                                headToHeadData[team1][team2] = record;
                            }
                        }
                        
                        console.log('✅ 상대전적 데이터 로딩 완료:', Object.keys(headToHeadData).length + '개 팀');
                        return headToHeadData;
                    } else {
                        throw new Error('상대전적 데이터 형식 오류');
                    }
                } else {
                    throw new Error(`상대전적 데이터 로딩 실패: ${response.status}`);
                }
            } catch (error) {
                console.error('❌ 상대전적 데이터 로딩 실패:', error);
                
                // 백업 데이터 사용
                console.log('📊 상대전적 백업 데이터 사용');
                headToHeadData = {
                    "LG": { "한화": "5-4-1", "롯데": "6-4-1", "KT": "4-6-0", "KIA": "6-7-0", "삼성": "7-3-0", "SSG": "7-4-0", "NC": "6-5-0", "두산": "7-5-0", "키움": "9-3-1" },
                    "한화": { "LG": "4-5-1", "롯데": "6-6-0", "KT": "8-4-0", "KIA": "8-4-0", "삼성": "6-5-0", "SSG": "6-6-0", "NC": "7-4-1", "두산": "5-7-0", "키움": "8-4-0" },
                    "롯데": { "한화": "6-4-0", "LG": "4-6-1", "KT": "6-4-2", "KIA": "6-6-0", "삼성": "7-3-0", "SSG": "5-6-0", "NC": "4-4-0", "두산": "6-6-0", "키움": "10-4-0" },
                    "KT": { "한화": "3-8-0", "LG": "4-5-0", "롯데": "4-6-2", "KIA": "5-7-0", "삼성": "7-3-0", "SSG": "5-6-0", "NC": "6-5-0", "두산": "7-5-1", "키움": "9-3-0" },
                    "KIA": { "한화": "3-8-0", "LG": "4-7-0", "롯데": "6-6-0", "KT": "7-5-0", "삼성": "3-7-0", "SSG": "5-4-1", "NC": "5-3-0", "두산": "7-2-0", "키움": "6-5-3" },
                    "삼성": { "한화": "4-6-0", "LG": "6-6-0", "롯데": "3-7-0", "KT": "3-7-0", "KIA": "7-3-0", "SSG": "6-5-1", "NC": "6-6-0", "두산": "7-6-0", "키움": "6-3-0" },
                    "SSG": { "한화": "6-6-0", "LG": "4-8-0", "롯데": "6-5-0", "KT": "6-5-0", "KIA": "4-5-1", "삼성": "5-6-1", "NC": "7-2-2", "두산": "5-4-1", "키움": "4-5-0" },
                    "NC": { "한화": "4-7-1", "LG": "5-6-0", "롯데": "4-4-0", "KT": "5-6-0", "KIA": "3-5-0", "삼성": "6-6-0", "SSG": "2-7-2", "두산": "5-3-2", "키움": "10-2-1" },
                    "두산": { "한화": "5-6-1", "LG": "5-6-0", "롯데": "6-6-0", "KT": "5-7-1", "KIA": "2-7-0", "삼성": "6-7-0", "SSG": "4-5-1", "NC": "3-5-2", "키움": "5-3-3" },
                    "키움": { "한화": "1-10-0", "LG": "4-9-0", "롯데": "4-10-0", "KT": "3-9-0", "KIA": "5-6-3", "삼성": "3-6-0", "SSG": "5-4-0", "NC": "2-10-1", "두산": "3-5-3" }
                };
                
                return headToHeadData;
            }
        }


        // 요약 대시보드 업데이트
        function updateSummaryDashboard() {
            const firstPlace = currentStandings[0];
            const secondPlace = currentStandings[1];
            
            // 1위 팀 정보
            const firstTeamData = kboTeams[firstPlace.team];
            document.getElementById('first-place-team').innerHTML = `
                <div style="display: flex; align-items: center; gap: 4px; justify-content: center;">
                    ${firstTeamData.logo}
                    <span style="color: ${firstTeamData.color}; font-weight: 600;">${firstPlace.team}</span>
                </div>
            `;
            const magicNumber = calculateMagicNumber(firstPlace, secondPlace);
            document.getElementById('first-place-magic').textContent = `매직넘버: ${magicNumber > 0 ? magicNumber : '확정'}`;

            // 플레이오프 확정 팀 수 (72승 이상)
            const confirmedTeams = currentStandings.filter(team => team.wins >= 72).length;
            document.getElementById('playoff-confirmed-teams').textContent = `${confirmedTeams}개 팀`;
            
            // 플레이오프 확정 팀이 있으면 첫 번째 확정 팀 정보 표시
            if (confirmedTeams > 0) {
                const firstConfirmedTeam = currentStandings.find(team => team.wins >= 72);
                if (firstConfirmedTeam) {
                    const teamData = kboTeams[firstConfirmedTeam.team];
                    document.getElementById('playoff-confirmed-desc').innerHTML = `<span style="color: ${teamData.color}; font-weight: 600;">${firstConfirmedTeam.team}</span> 외 ${confirmedTeams - 1}팀`;
                }
            } else {
                document.getElementById('playoff-confirmed-desc').textContent = '72승 이상 달성';
            }

            // 최고 연승팀
            let bestStreak = { team: '', count: 0, type: '' };
            currentStandings.forEach(team => {
                if (team.streak.includes('승')) {
                    const count = parseInt(team.streak);
                    if (count > bestStreak.count) {
                        bestStreak = { team: team.team, count: count, type: '승' };
                    }
                }
            });
            if (bestStreak.team) {
                const bestTeamData = kboTeams[bestStreak.team];
                document.getElementById('best-streak-team').innerHTML = `
                    <div style="display: flex; align-items: center; gap: 4px; justify-content: center;">
                        ${bestTeamData.logo}
                        <span style="color: ${bestTeamData.color}; font-weight: 600;">${bestStreak.team}</span>
                    </div>
                `;
                document.getElementById('best-streak-count').textContent = `${bestStreak.count}연승 중`;
            } else {
                document.getElementById('best-streak-team').textContent = '없음';
                document.getElementById('best-streak-count').textContent = '-';
            }

            // 최근 10경기 성적이 가장 좋은 팀 찾기
            let bestRecentTeam = null;
            let bestRecentWins = -1;
            
            currentStandings.forEach(team => {
                if (team.recent10) {
                    // "8승 0무 2패" 형태에서 승수 추출
                    const winsMatch = team.recent10.match(/(\d+)승/);
                    if (winsMatch) {
                        const wins = parseInt(winsMatch[1]);
                        if (wins > bestRecentWins) {
                            bestRecentWins = wins;
                            bestRecentTeam = team;
                        }
                    }
                }
            });
            
            if (bestRecentTeam && bestRecentWins >= 0) {
                const teamData = kboTeams[bestRecentTeam.team];
                document.getElementById('recent-best-team').innerHTML = `
                    <div style="display: flex; align-items: center; gap: 4px; justify-content: center;">
                        ${teamData.logo}
                        <span style="color: ${teamData.color}; font-weight: 600;">${bestRecentTeam.team}</span>
                    </div>
                `;
                document.getElementById('recent-best-record').textContent = bestRecentTeam.recent10;
            } else {
                document.getElementById('recent-best-team').textContent = '-';
                document.getElementById('recent-best-record').textContent = '-';
            }
        }

        // 테이블 정렬 상태
        let sortState = {
            standings: { column: '', direction: '' },
            playoff: { column: '', direction: '' }
        };

        // 테이블 정렬 함수
        function sortTable(tableType, column) {
            const currentSort = sortState[tableType];
            
            // 정렬 방향 결정
            let direction = 'asc';
            if (currentSort.column === column) {
                direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            }
            
            // 이전 헤더의 정렬 표시 제거
            document.querySelectorAll(`#${tableType}-table .sortable-header`).forEach(header => {
                header.classList.remove('sort-asc', 'sort-desc');
                const arrow = header.querySelector('.sort-arrow');
                if (arrow) arrow.textContent = '↕';
            });
            
            // 현재 헤더에 정렬 표시 추가
            const currentHeader = document.querySelector(`#${tableType}-table .sortable-header[data-sort="${column}"]`);
            if (currentHeader) {
                currentHeader.classList.add(direction === 'asc' ? 'sort-asc' : 'sort-desc');
                const arrow = currentHeader.querySelector('.sort-arrow');
                if (arrow) arrow.textContent = direction === 'asc' ? '↑' : '↓';
            }
            
            // 정렬 상태 업데이트
            sortState[tableType] = { column, direction };
            
            // 테이블 정렬 실행
            if (tableType === 'standings') {
                sortStandingsTable(column, direction);
            } else if (tableType === 'playoff') {
                sortPlayoffTable(column, direction);
            }
        }

        // 순위표 정렬
        function sortStandingsTable(column, direction) {
            const table = document.getElementById('standings-table');
            const tbody = table.querySelector('tbody');
            const rows = Array.from(tbody.querySelectorAll('tr'));
            
            // 테이블에 정렬 중 표시
            table.classList.add('sorting');
            
            rows.sort((a, b) => {
                let aValue, bValue;
                
                switch(column) {
                    case 'rank':
                        aValue = parseInt(a.cells[0].textContent);
                        bValue = parseInt(b.cells[0].textContent);
                        break;
                    case 'games':
                        aValue = parseInt(a.cells[2].textContent);
                        bValue = parseInt(b.cells[2].textContent);
                        break;
                    case 'wins':
                        aValue = parseInt(a.cells[3].textContent);
                        bValue = parseInt(b.cells[3].textContent);
                        break;
                    case 'losses':
                        aValue = parseInt(a.cells[4].textContent);
                        bValue = parseInt(b.cells[4].textContent);
                        break;
                    case 'draws':
                        aValue = parseInt(a.cells[5].textContent);
                        bValue = parseInt(b.cells[5].textContent);
                        break;
                    case 'winLossMargin':
                        aValue = parseInt(a.cells[6].textContent.replace('+', ''));
                        bValue = parseInt(b.cells[6].textContent.replace('+', ''));
                        break;
                    case 'winPct':
                        aValue = parseFloat(a.cells[7].textContent);
                        bValue = parseFloat(b.cells[7].textContent);
                        break;
                    case 'gamesBehind':
                        aValue = a.cells[9].textContent === '-' ? 0 : parseFloat(a.cells[9].textContent);
                        bValue = b.cells[9].textContent === '-' ? 0 : parseFloat(b.cells[9].textContent);
                        break;
                    case 'recent10':
                        aValue = parseInt(a.cells[11].textContent.split('승')[0]);
                        bValue = parseInt(b.cells[11].textContent.split('승')[0]);
                        break;
                    case 'streak':
                        const aStreak = a.cells[12].textContent;
                        const bStreak = b.cells[12].textContent;
                        aValue = aStreak.includes('승') ? parseInt(aStreak) : -parseInt(aStreak);
                        bValue = bStreak.includes('승') ? parseInt(bStreak) : -parseInt(bStreak);
                        break;
                    case 'magic':
                        const aMagic = a.cells[12].textContent;
                        const bMagic = b.cells[12].textContent;
                        aValue = getMagicNumberSortValue(aMagic);
                        bValue = getMagicNumberSortValue(bMagic);
                        break;
                    default:
                        return 0;
                }
                
                if (direction === 'asc') {
                    return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
                } else {
                    return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
                }
            });
            
            // 정렬된 행들을 다시 추가
            tbody.innerHTML = '';
            rows.forEach((row, index) => {
                row.style.animationDelay = `${index * 0.05}s`;
                tbody.appendChild(row);
            });
            
            // 정렬 완료 후 표시 제거
            setTimeout(() => {
                table.classList.remove('sorting');
            }, 300);
        }

        // 플레이오프 테이블 정렬
        function sortPlayoffTable(column, direction) {
            const table = document.getElementById('playoff-table');
            const tbody = table.querySelector('tbody');
            const rows = Array.from(tbody.querySelectorAll('tr'));
            
            table.classList.add('sorting');
            
            rows.sort((a, b) => {
                let aValue, bValue;
                
                switch(column) {
                    case 'rank':
                        aValue = parseInt(a.cells[0].textContent);
                        bValue = parseInt(b.cells[0].textContent);
                        break;
                    case 'wins':
                        aValue = parseInt(a.cells[2].textContent);
                        bValue = parseInt(b.cells[2].textContent);
                        break;
                    case 'remaining':
                        aValue = parseInt(a.cells[3].textContent);
                        bValue = parseInt(b.cells[3].textContent);
                        break;
                    case 'maxWins':
                        aValue = parseInt(a.cells[4].textContent);
                        bValue = parseInt(b.cells[4].textContent);
                        break;
                    case 'magic':
                        const aMagic = a.cells[5].textContent;
                        const bMagic = b.cells[5].textContent;
                        aValue = getMagicNumberSortValue(aMagic);
                        bValue = getMagicNumberSortValue(bMagic);
                        break;
                    case 'requiredWinPct':
                        const aReq = a.cells[6].textContent;
                        const bReq = b.cells[6].textContent;
                        aValue = aReq === '-' || aReq === '달성' ? -1 : parseFloat(aReq);
                        bValue = bReq === '-' || bReq === '달성' ? -1 : parseFloat(bReq);
                        break;
                    default:
                        return 0;
                }
                
                if (direction === 'asc') {
                    return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
                } else {
                    return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
                }
            });
            
            tbody.innerHTML = '';
            rows.forEach((row, index) => {
                row.style.animationDelay = `${index * 0.05}s`;
                tbody.appendChild(row);
            });
            
            setTimeout(() => {
                table.classList.remove('sorting');
            }, 300);
        }

        // 매직넘버 정렬 값 변환
        function getMagicNumberSortValue(magic) {
            if (magic === '확정' || magic === 'PO확정') return -1;
            if (magic === '불가능') return 9999;
            return parseInt(magic) || 0;
        }

        function renderStandingsTable() {
            try {
                console.log('📊 renderStandingsTable 시작');
                console.log('currentStandings:', currentStandings);
                
                const tbody = document.querySelector('#standings-table tbody');
                console.log('tbody 요소:', tbody);
                
                if (!tbody) {
                    throw new Error('순위표 테이블을 찾을 수 없습니다');
                }
                tbody.innerHTML = '';

                if (!currentStandings || currentStandings.length === 0) {
                    throw new Error('순위 데이터가 없습니다');
                }

                // 모든 추격팀의 최대가능승수 중 최고값 찾기
                const maxPossibleWinsByChaser = Math.max(...currentStandings.slice(1).map(team => 
                    team.wins + (144 - team.games)
                ));

                currentStandings.forEach(team => {
                const row = document.createElement('tr');
                const totalGames = 144;
                const remainingGames = totalGames - team.games;
                const teamData = kboTeams[team.team];
                
                // 데이터 검증
                if (!teamData) {
                    console.error('❌ 팀 데이터 없음:', team.team);
                    showNotification(`${team.team} 팀 데이터를 찾을 수 없습니다.`, 'error', 3000);
                    return;
                }
                
                let rankClass = '';
                if (team.rank === 1) rankClass = 'rank-1';
                else if (team.rank === 2) rankClass = 'rank-2';
                else if (team.rank === 3) rankClass = 'rank-3';
                else if (team.rank >= 4 && team.rank <= 5) rankClass = 'playoff';
                
                row.className = rankClass;
                row.style.borderLeft = `4px solid ${teamData.color}`;

                // 매직넘버 계산
                let magicNumberDisplay = '-';
                if (team.rank === 1) {
                    // service-data.json의 매직넘버 사용
                    const magicNumbers = currentKBOData?.magicNumbers || {};
                    const teamMagicData = magicNumbers[team.team];
                    const magicNumber = teamMagicData ? teamMagicData.championship : 0;
                    magicNumberDisplay = magicNumber > 0 ? magicNumber : '확정';
                } else {
                    const playoffBaseline = 72;
                    const playoffMagicNumber = Math.max(0, playoffBaseline - team.wins);
                    if (playoffMagicNumber === 0) {
                        magicNumberDisplay = 'PO확정';
                    } else if (team.wins + (144 - team.games) >= playoffBaseline) {
                        magicNumberDisplay = playoffMagicNumber;
                    } else {
                        magicNumberDisplay = '불가능';
                    }
                }

                // 연속 기록 강조
                const streakFormatted = formatStreak(team.streak);
                
                // 최근 10경기 강조
                const recent10Formatted = formatRecent10(team.recent10);
                
                // 팀명 로고 추가
                const teamNameWithLogo = Utils.getTeamNameWithLogo(team);

                // 홈/방문 성적 - JSON 데이터에서 실제 값 사용
                const teamHomeAway = team.homeAway || { home: "0-0-0", away: "0-0-0" };
                const homeAwayDisplay = `<div style="line-height: 1.4; font-size: 0.95rem;"><span style="color: #2563eb; font-weight: 500;">🏠 ${teamHomeAway.home}</span><br><span style="color: #dc2626; font-weight: 500;">✈️ ${teamHomeAway.away}</span></div>`;

                const winLossMargin = team.wins - team.losses;
                const marginColor = winLossMargin > 0 ? '#27ae60' : winLossMargin < 0 ? '#e74c3c' : '#666';
                const marginDisplay = winLossMargin > 0 ? `+${winLossMargin}` : winLossMargin.toString();
                
                row.innerHTML = `
                    <td style="color: ${teamData.color}; font-weight: 700;">${team.rank}</td>
                    <td>${teamNameWithLogo}</td>
                    <td>${team.games}</td>
                    <td>${team.wins}</td>
                    <td>${team.losses}</td>
                    <td>${team.draws}</td>
                    <td style="color: ${marginColor}; font-weight: 600;">${marginDisplay}</td>
                    <td>${team.winPct.toFixed(3)}</td>
                    <td>${homeAwayDisplay}</td>
                    <td>${team.gamesBehind === 0 ? '-' : team.gamesBehind}</td>
                    <td>${remainingGames}</td>
                    <td>${recent10Formatted}</td>
                    <td>${streakFormatted}</td>
                    <td>${magicNumberDisplay}</td>
                `;

                tbody.appendChild(row);
            });
            } catch (error) {
                handleError(error, '순위표 렌더링 실패');
                // 에러가 발생하면 기본 메시지 표시
                const tbody = document.querySelector('#standings-table tbody');
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="13" style="text-align: center; color: #999; padding: 20px;">데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.</td></tr>';
                }
            }
        }

        function formatStreak(streak) {
            if (streak.includes('승')) {
                const winCount = parseInt(streak);
                if (winCount >= 3) {
                    return `<span style="color: var(--success-color); font-weight: 700;">${streak}</span>`;
                }
                return `<span style="color: var(--success-color); font-weight: 600;">${streak}</span>`;
            } else if (streak.includes('패')) {
                const lossCount = parseInt(streak);
                if (lossCount >= 3) {
                    return `<span style="color: var(--danger-color); font-weight: 700;">${streak}</span>`;
                }
                return `<span style="color: var(--danger-color); font-weight: 600;">${streak}</span>`;
            }
            return streak;
        }

        function formatRecent10(recent10) {
            // "6승1무3패" 형태 파싱
            const winMatch = recent10.match(/(\d+)승/);
            const lossMatch = recent10.match(/(\d+)패/);
            
            const wins = winMatch ? parseInt(winMatch[1]) : 0;
            const losses = lossMatch ? parseInt(lossMatch[1]) : 0;
            
            // 색상 기준: 7승 이상(녹색), 5-6승(노란색), 4승 이하(빨간색)
            if (wins >= 7) {
                // 7승 이상 - 뜨거운 상승세
                return `<span style="color: var(--success-color); font-weight: 700;">${recent10}</span>`;
            } else if (wins >= 5) {
                // 5-6승 - 양호한 흐름
                return `<span style="color: var(--warning-color); font-weight: 600;">${recent10}</span>`;
            } else {
                // 4승 이하 - 부진한 흐름
                return `<span style="color: var(--danger-color); font-weight: 600;">${recent10}</span>`;
            }
        }

        function getStatusIndicator(team) {
            if (team.rank === 1 && team.magicNumber <= 10) {
                return '<span class="status-indicator clinched">우승권</span>';
            } else if (team.rank <= 5) {
                return '<span class="status-indicator contending">PO권</span>';
            }
            return '';
        }

        function calculateMagicNumber(firstPlace, secondPlace) {
            // service-data.json의 매직넘버 사용
            const magicNumbers = currentKBOData?.magicNumbers || {};
            const teamMagicData = magicNumbers[firstPlace.team];
            return teamMagicData ? teamMagicData.championship : 0;
        }


        function renderChampionshipCondition() {
            console.log('🏆 우승 조건 렌더링 시작');
            console.log('현재 순위 데이터:', currentStandings);
            
            if (!currentStandings || currentStandings.length === 0) {
                console.error('❌ currentStandings 데이터가 없습니다');
                return;
            }
            
            const firstPlace = currentStandings[0];
            const secondPlace = currentStandings[1];
            const teamData = kboTeams[firstPlace.team];
            
            console.log('1위 팀 데이터:', firstPlace);
            
            const totalGames = 144;
            const remainingGames = totalGames - firstPlace.games;
            const maxPossibleWins = firstPlace.wins + remainingGames;
            const magicNumber = calculateMagicNumber(firstPlace, secondPlace);
            
            // 우승 가능 최소 승수 계산 (service-data.json의 정확한 계산 사용)
            const magicNumbers = currentKBOData?.magicNumbers || {};
            const teamMagicData = magicNumbers[firstPlace.team];
            const minWinsNeeded = firstPlace.wins + (teamMagicData ? teamMagicData.championship : 0);
            
            // 우승 가능 최소 승수를 달성하기 위한 필요 승률 계산
            const neededWinsForMinWins = teamMagicData ? teamMagicData.championship : 0;
            const requiredWinPct = remainingGames > 0 ? (neededWinsForMinWins / remainingGames) : 0;
            
            // 144경기 체제 역대 1위 평균 기준 필요 승률 계산 (2015-2024: 86.9승)
            const historicalFirstPlaceWins = 87; // 2015-2024년 1위팀 평균 승수
            const neededWinsForHistorical = Math.max(0, historicalFirstPlaceWins - firstPlace.wins);
            const historicalRequiredWinPct = remainingGames > 0 ? (neededWinsForHistorical / remainingGames) : 0;
            
            // 예상 우승확정일 계산
            let clinchDateText = '';
            
            if (magicNumber > 0) {
                const targetGameNumber = firstPlace.games + magicNumber;
                
                if (targetGameNumber <= totalGames) {
                    clinchDateText = `${targetGameNumber}번째 경기에서 확정 가능 (일정 업데이트 예정)`;
                } else {
                    clinchDateText = `시즌 종료 후 (${targetGameNumber}번째 경기 필요)`;
                }
            } else {
                clinchDateText = '이미 우승 확정';
            }
            
            // 팀 로고와 이름 업데이트
            document.getElementById('first-place-logo').innerHTML = teamData.logo;
            document.getElementById('first-place-team-name').textContent = `${firstPlace.team} 1위`;
            document.getElementById('first-place-team-name').style.color = teamData.color;
            
            // 매직넘버 라인 옆 정보 업데이트
            document.getElementById('remaining-games-top-display').textContent = `${remainingGames}경기`;
            document.getElementById('min-wins-top-display').textContent = `${minWinsNeeded}승`;
            
            // 각 카드 정보 업데이트
            document.getElementById('first-place-record').textContent = `${firstPlace.wins}승 ${firstPlace.losses}패 ${firstPlace.draws}무`;
            document.getElementById('first-place-winpct').textContent = `${(firstPlace.winPct || firstPlace.winRate).toFixed(3)}`;
            document.getElementById('first-place-max-wins').textContent = `${maxPossibleWins}승`;
            const championshipMagicElement = document.getElementById('championship-magic');
            championshipMagicElement.textContent = `매직넘버: ${magicNumber > 0 ? magicNumber : '우승확정'}`;
            
            // 1위 팀의 색상으로 매직넘버 스타일 설정
            const teamColor = teamData?.color || '#FF6B35';
            championshipMagicElement.style.color = teamColor;
            championshipMagicElement.style.textShadow = `0 2px 8px ${teamColor}40`;
            document.getElementById('required-winpct').textContent = neededWinsForMinWins > 0 ? `${requiredWinPct.toFixed(3)}` : '달성';
            document.getElementById('historical-required-winpct').textContent = neededWinsForHistorical > 0 ? `${historicalRequiredWinPct.toFixed(3)}` : '달성';
            document.getElementById('clinch-date').textContent = clinchDateText;
        }

        function renderChaseAnalysis() {
            try {
                const tbody = document.querySelector('#chase-table tbody');
                if (!tbody) {
                    throw new Error('1위 탈환 가능성 테이블을 찾을 수 없습니다');
                }
                tbody.innerHTML = '';

                if (!currentStandings || currentStandings.length === 0) {
                    throw new Error('순위 데이터가 없습니다');
                }

                const firstPlace = currentStandings[0];
                
                // 144경기 체제 역대 1위 평균 승수 (2015-2024: 86.9승)
                const historicalFirstPlaceWins = 87; // 2015-2024년 1위팀 평균 승수

                currentStandings.slice(1).forEach(team => {
                const teamData = kboTeams[team.team];
                const remainingGames = 144 - team.games;
                const maxPossibleWins = team.wins + remainingGames;
                const firstPlaceRemaining = 144 - firstPlace.games;
                const requiredFirstPlaceWins = maxPossibleWins - 1;
                const canCatch = maxPossibleWins > firstPlace.wins;
                
                // 역대 1위 평균 기준으로 필요 승률 계산
                const neededWinsForHistoricalAverage = Math.max(0, historicalFirstPlaceWins - team.wins);
                const requiredWinPctForAverage = remainingGames > 0 ? 
                    Math.min(1, neededWinsForHistoricalAverage / remainingGames) : 0;
                
                // 144경기 체제 역대 1위 성적 달성 가능성 (87승 달성 가능한지)
                const canReachHistoricalAverage = maxPossibleWins >= historicalFirstPlaceWins;
                
                // KBO 승률 분포 기준 색상 계산 (전체 팀 고려)
                let winPctColor = '';
                let winPctDisplay = '';
                
                if (requiredWinPctForAverage > 1) {
                    winPctColor = '#2c3e50'; // 검은색 (수학적 불가능)
                    winPctDisplay = '불가능';
                } else if (requiredWinPctForAverage > 0.700) {
                    winPctColor = '#2c3e50'; // 검은색 (역사상 최고 수준)
                    winPctDisplay = requiredWinPctForAverage.toFixed(3);
                } else if (requiredWinPctForAverage > 0.650) {
                    winPctColor = '#e74c3c'; // 빨간색 (상위권 우승팀 수준)
                    winPctDisplay = requiredWinPctForAverage.toFixed(3);
                } else if (requiredWinPctForAverage > 0.550) {
                    winPctColor = '#e67e22'; // 주황색 (플레이오프권 수준)
                    winPctDisplay = requiredWinPctForAverage.toFixed(3);
                } else if (requiredWinPctForAverage > 0.450) {
                    winPctColor = '#f1c40f'; // 노란색 (중위권 수준)
                    winPctDisplay = requiredWinPctForAverage.toFixed(3);
                } else {
                    winPctColor = '#27ae60'; // 녹색 (달성 가능한 수준)
                    winPctDisplay = requiredWinPctForAverage.toFixed(3);
                }
                
                const row = document.createElement('tr');
                row.style.borderLeft = `4px solid ${teamData.color}`;
                
                // 순위별 클래스 적용
                let rankClass = '';
                if (team.rank === 2) rankClass = 'rank-2';
                else if (team.rank === 3) rankClass = 'rank-3';
                else if (team.rank >= 4 && team.rank <= 5) rankClass = 'playoff';
                row.className = rankClass;
                
                // 팀명에 로고 추가
                const teamNameWithLogo = Utils.getTeamNameWithLogo(team);
                
                row.innerHTML = `
                    <td style="color: ${teamData.color}; font-weight: 700;">${team.rank}</td>
                    <td>${teamNameWithLogo}</td>
                    <td style="font-weight: 600;">${team.wins}</td>
                    <td>${team.gamesBehind}</td>
                    <td>${remainingGames}</td>
                    <td>${maxPossibleWins}</td>
                    <td>${requiredFirstPlaceWins}승 이하</td>
                    <td style="color: ${canCatch ? '#27ae60' : '#e74c3c'}; font-weight: 600;">
                        ${canCatch ? '가능' : '불가능'}
                    </td>
                    <td style="color: ${winPctColor}; font-weight: 600;">${winPctDisplay}</td>
                    <td style="color: ${canReachHistoricalAverage ? '#27ae60' : '#e74c3c'}; font-weight: 600;">
                        ${canReachHistoricalAverage ? '가능' : '불가능'}
                    </td>
                `;
                tbody.appendChild(row);
            });
            } catch (error) {
                handleError(error, '1위 탈환 가능성 렌더링 실패');
                const tbody = document.querySelector('#chase-table tbody');
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: #999; padding: 20px;">데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.</td></tr>';
                }
            }
        }

        // currentStandings 데이터로 플레이오프 조건 렌더링하는 백업 함수
        function renderPlayoffConditionsFromStandings() {
            try {
                const tbody = document.querySelector('#playoff-table tbody');
                if (!tbody) return;
                
                tbody.innerHTML = '';
                
                if (!currentStandings || currentStandings.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="9">데이터 로딩 중...</td></tr>';
                    return;
                }
                
                currentStandings.forEach(team => {
                    const row = document.createElement('tr');
                    const teamData = kboTeams[team.team];
                    const remainingGames = 144 - team.games;
                    const maxPossibleWins = team.wins + remainingGames;
                    
                    // 플레이오프 진출 가능성 계산 (5위 기준)
                    const playoffThreshold = 72; // 대략적인 플레이오프 진출 기준선
                    const playoffMagic = Math.max(0, playoffThreshold - team.wins);
                    const eliminationMagic = maxPossibleWins < playoffThreshold ? 0 : maxPossibleWins - playoffThreshold + 1;
                    
                    let status = '경합';
                    let statusClass = 'status-competing';
                    
                    if (playoffMagic === 0) {
                        status = '확정';
                        statusClass = 'status-clinched';
                    } else if (maxPossibleWins < playoffThreshold) {
                        status = '탈락';
                        statusClass = 'status-eliminated';
                    } else if (playoffMagic <= 10) {
                        status = '매우 유력';
                        statusClass = 'status-very-likely';
                    } else if (playoffMagic <= 20) {
                        status = '유력';
                        statusClass = 'status-likely';
                    }
                    
                    const requiredWinRate = remainingGames > 0 ? playoffMagic / remainingGames : 0;
                    
                    row.innerHTML = `
                        <td>${team.rank}</td>
                        <td>${Utils.getTeamNameWithLogo(team.team)}</td>
                        <td>${team.wins}</td>
                        <td>${remainingGames}</td>
                        <td>${maxPossibleWins}</td>
                        <td>${playoffMagic > 0 ? playoffMagic : '확정'}</td>
                        <td>${eliminationMagic > 0 ? '-' + eliminationMagic : '-'}</td>
                        <td>${requiredWinRate > 0 ? (requiredWinRate * 100).toFixed(1) + '%' : '-'}</td>
                        <td class="${statusClass}">${status}</td>
                    `;
                    
                    tbody.appendChild(row);
                });
                
                console.log('✅ currentStandings로 플레이오프 조건 렌더링 완료');
            } catch (error) {
                console.error('백업 렌더링 실패:', error);
            }
        }
        
        function renderPlayoffCondition() {
            try {
                const tbody = document.querySelector('#playoff-table tbody');
                if (!tbody) {
                    throw new Error('플레이오프 진출 조건 테이블을 찾을 수 없습니다');
                }
                tbody.innerHTML = '';

                // 데이터 유효성 검사 강화
                if (!currentKBOData || !currentKBOData.playoffData) {
                    console.warn('⚠️ playoffData가 없음, currentStandings로 직접 계산');
                    // currentStandings로 직접 계산
                    renderPlayoffConditionsFromStandings();
                    return;
                }
                
                if (!currentKBOData.playoffData) {
                    console.error('❌ playoffData가 없습니다. 사용 가능한 키:', Object.keys(currentKBOData));
                    throw new Error('플레이오프 데이터가 없습니다');
                }
                
                if (currentKBOData.playoffData.length === 0) {
                    console.error('❌ playoffData 배열이 비어있습니다');
                    throw new Error('플레이오프 데이터가 비어있습니다');
                }
                
                console.log('✅ 플레이오프 데이터 확인:', currentKBOData.playoffData.length + '팀');

                currentKBOData.playoffData.forEach((team) => {
                const teamData = kboTeams[team.team];
                
                // JSON 데이터에서 직접 가져오기
                const playoffMagicNumber = team.playoffMagic;
                const eliminationMagicNumber = team.eliminationMagic;
                const statusText = team.status;
                const requiredWinPct = team.requiredWinRate > 0 ? team.requiredWinRate.toFixed(3) : '-';
                const remainingGames = team.remainingGames;
                const maxPossibleWins = team.maxPossibleWins;
                
                // 매직넘버 표시
                let magicDisplay = '';
                let magicColor = '';
                
                if (playoffMagicNumber === '-' || playoffMagicNumber === 0) {
                    magicDisplay = '확정';
                    magicColor = '#27ae60'; // 녹색
                } else if (playoffMagicNumber <= 10) {
                    magicDisplay = playoffMagicNumber;
                    magicColor = '#f1c40f'; // 노란색
                } else if (playoffMagicNumber <= 20) {
                    magicDisplay = playoffMagicNumber;
                    magicColor = '#e67e22'; // 주황색
                } else {
                    magicDisplay = playoffMagicNumber;
                    magicColor = '#e74c3c'; // 빨간색
                }
                
                // 트래직넘버 표시
                let tragicDisplay = '';
                let tragicColor = '';
                
                if (eliminationMagicNumber === 0) {
                    tragicDisplay = '탈락';
                    tragicColor = '#e74c3c'; // 빨간색 - 이미 탈락
                } else if (eliminationMagicNumber === '-' || eliminationMagicNumber === 999) {
                    tragicDisplay = '-';
                    tragicColor = '#2ecc71'; // 녹색 - 72승 달성 또는 확정
                } else {
                    // 숫자 앞에 - 부호를 붙여서 표시 (그라데이션 색상)
                    tragicDisplay = `-${eliminationMagicNumber}`;
                    
                    // 트래직 넘버별 세밀한 그라데이션
                    if (eliminationMagicNumber <= 5) {
                        tragicColor = '#c0392b'; // 진한 빨간색 (매우 위험)
                    } else if (eliminationMagicNumber <= 10) {
                        tragicColor = '#e74c3c'; // 빨간색 (위험)
                    } else if (eliminationMagicNumber <= 15) {
                        tragicColor = '#e67e22'; // 주황색 (경고)
                    } else if (eliminationMagicNumber <= 20) {
                        tragicColor = '#f39c12'; // 연한 주황색 (주의)
                    } else if (eliminationMagicNumber <= 25) {
                        tragicColor = '#f1c40f'; // 노란색 (보통)
                    } else if (eliminationMagicNumber <= 30) {
                        tragicColor = '#f4d03f'; // 연한 노란색 (안정)
                    } else {
                        tragicColor = '#27ae60'; // 녹색 (안전)
                    }
                }
                
                // 상태별 색상 (그라데이션 기반)
                let statusColor = '';
                switch(statusText) {
                    case '확정':
                        statusColor = '#2ecc71'; // 밝은 녹색
                        break;
                    case '매우 유력':
                        statusColor = '#27ae60'; // 녹색
                        break;
                    case '유력':
                        statusColor = '#f39c12'; // 주황색
                        break;
                    case '경합':
                        statusColor = '#e67e22'; // 진한 주황색
                        break;
                    case '어려움':
                        statusColor = '#e74c3c'; // 빨간색
                        break;
                    case '매우 어려움':
                        statusColor = '#c0392b'; // 진한 빨간색
                        break;
                    case '불가능':
                        statusColor = '#95a5a6'; // 회색
                        break;
                    default:
                        statusColor = '#95a5a6'; // 회색
                }
                
                // 필요 승률 색상 (그라데이션 구분)
                let requiredWinPctColor = '#666';
                if (team.requiredWinRate > 0) {
                    if (team.requiredWinRate <= 0.3) {
                        requiredWinPctColor = '#2ecc71'; // 밝은 녹색 (매우 쉬움)
                    } else if (team.requiredWinRate <= 0.5) {
                        requiredWinPctColor = '#f39c12'; // 주황색 (보통)
                    } else if (team.requiredWinRate <= 0.7) {
                        requiredWinPctColor = '#e67e22'; // 진한 주황색 (어려움)
                    } else if (team.requiredWinRate <= 0.85) {
                        requiredWinPctColor = '#e74c3c'; // 빨간색 (매우 어려움)
                    } else {
                        requiredWinPctColor = '#c0392b'; // 진한 빨간색 (거의 불가능)
                    }
                }

                const row = document.createElement('tr');
                row.style.borderLeft = `4px solid ${teamData.color}`;
                
                // TOP 5 팀만 색상 구분
                let rankClass = '';
                if (team.rank <= 5) {
                    if (team.rank === 1) rankClass = 'rank-1';
                    else if (team.rank === 2) rankClass = 'rank-2';
                    else if (team.rank === 3) rankClass = 'rank-3';
                    else if (team.rank >= 4 && team.rank <= 5) rankClass = 'playoff';
                }
                row.className = rankClass;
                
                // 팀명에 로고 추가
                const teamNameWithLogo = Utils.getTeamNameWithLogo(team);
                
                row.innerHTML = `
                    <td style="color: ${teamData.color}; font-weight: 700;">${team.rank}</td>
                    <td>${teamNameWithLogo}</td>
                    <td>${team.wins}</td>
                    <td>${remainingGames}</td>
                    <td>${maxPossibleWins}</td>
                    <td style="color: ${magicColor}; font-weight: 700; font-size: 1.05rem;">${magicDisplay}</td>
                    <td style="color: ${tragicColor}; font-weight: 700; font-size: 1.05rem;">${tragicDisplay}</td>
                    <td style="color: ${requiredWinPctColor}; font-weight: 600;">${requiredWinPct}</td>
                    <td style="color: ${statusColor}; font-weight: 600;">${statusText}</td>
                `;
                tbody.appendChild(row);
            });
            } catch (error) {
                console.error('❌ 플레이오프 진출 조건 렌더링 실패:', error);
                handleError(error, '플레이오프 진출 조건 렌더링 실패. 백업 데이터를 사용하여 서비스를 계속 제공합니다.');
                
                // 백업 데이터로 기본 플레이오프 조건 렌더링
                const tbody = document.querySelector('#playoff-table tbody');
                if (tbody && currentStandings.length > 0) {
                    console.log('🔄 백업 데이터로 플레이오프 조건 렌더링 시작, 팀 수:', currentStandings.length);
                    tbody.innerHTML = '';
                    
                    currentStandings.forEach((team, index) => {
                        const teamData = kboTeams[team.team];
                        console.log(`팀 ${team.team} 데이터:`, team);
                        
                        // 데이터 안전성 검사
                        const wins = parseInt(team.wins) || 0;
                        const remainingGames = parseInt(team.remainingGames) || 0;
                        const maxWins = wins + remainingGames;
                        
                        // 플레이오프 진출 기준: 역대 5위 평균 72승
                        const playoffThreshold = 72;
                        let playoffMagic;
                        
                        // 이미 플레이오프 확정된 경우 (72승 달성)
                        if (wins >= playoffThreshold) {
                            playoffMagic = 0;
                        } else {
                            playoffMagic = playoffThreshold - wins;
                        }
                        
                        // 트래직넘버 계산 (플레이오프 탈락까지 남은 패배 수)
                        const tragicNumber = maxWins < playoffThreshold ? playoffThreshold - maxWins : 0;
                        
                        // 진출 상황 판단
                        let status = '';
                        let statusColor = '#666';
                        if (wins >= playoffThreshold) {
                            status = '확정';
                            statusColor = '#4CAF50';
                        } else if (maxWins >= playoffThreshold) {
                            status = '가능';
                            statusColor = '#FF9800';
                        } else {
                            status = '불가능';
                            statusColor = '#f44336';
                        }
                        
                        // 잔여경기 필요 승률
                        const requiredWinRate = remainingGames > 0 && playoffMagic > 0 ? 
                            (playoffMagic / remainingGames).toFixed(3) : '0.000';
                        
                        // 매직넘버 표시 형식 (플레이오프 기준)
                        let magicDisplay = '';
                        if (wins >= playoffThreshold) {
                            // 이미 72승 달성 = 플레이오프 확정
                            magicDisplay = '<span style="color: #4CAF50; font-weight: 600;">확정</span>';
                        } else if (playoffMagic <= 5) {
                            // 5승 이하 = 매직넘버 (초록색)
                            magicDisplay = `<span style="color: #4CAF50; font-weight: 600;">${playoffMagic}</span>`;
                        } else if (playoffMagic <= 15) {
                            // 6-15승 = 경합상황 (주황색)
                            magicDisplay = `<span style="color: #FF9800; font-weight: 600;">${playoffMagic}</span>`;
                        } else {
                            // 16승 이상 = 어려운 상황 (빨간색)
                            magicDisplay = `<span style="color: #f44336; font-weight: 600;">${playoffMagic}</span>`;
                        }
                        
                        // 트래직넘버 표시
                        let tragicDisplay = '';
                        if (tragicNumber === 0) {
                            tragicDisplay = '<span style="color: #4CAF50;">안전</span>';
                        } else if (tragicNumber <= 5) {
                            tragicDisplay = `<span style="color: #f44336; font-weight: 600;">-${tragicNumber}</span>`;
                        } else {
                            tragicDisplay = `<span style="color: #FF9800;">-${tragicNumber}</span>`;
                        }
                        
                        const row = document.createElement('tr');
                        if (teamData) {
                            row.style.borderLeft = `4px solid ${teamData.color}`;
                        }
                        
                        row.innerHTML = `
                            <td style="text-align: center; font-weight: 700;">${team.rank}위</td>
                            <td>${Utils.getTeamNameWithLogo(team)}</td>
                            <td style="text-align: center; font-weight: 600;">${wins}</td>
                            <td style="text-align: center;">${remainingGames}</td>
                            <td style="text-align: center; font-weight: 600;">${maxWins}</td>
                            <td style="text-align: center;">${magicDisplay}</td>
                            <td style="text-align: center;">${tragicDisplay}</td>
                            <td style="text-align: center; font-weight: 600;">${requiredWinRate}</td>
                            <td style="text-align: center; color: ${statusColor}; font-weight: 600;">${status}</td>
                        `;
                        
                        tbody.appendChild(row);
                    });
                    
                    console.log('✅ 백업 데이터로 플레이오프 조건 렌더링 완료');
                } else if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #999; padding: 20px;">데이터를 불러오는 중입니다...</td></tr>';
                }
            }
        }


        function determineCellData(team, rankPosition, championshipMagic, playoffMagic, tragicNumber, teamIndex) {
            // 나무위키 스타일 매직넘버 차트 색상 결정 로직
            const currentRank = teamIndex + 1; // 1-based rank
            
            // 1위 열: 우승 매직넘버
            if (rankPosition === 1) {
                if (championshipMagic > 0 && championshipMagic <= 50) {
                    // 확정 상황 체크
                    if (championshipMagic === 0 || (currentRank === 1 && championshipMagic <= 3)) {
                        return { display: '우승확정', cssClass: 'namu-clinched-blue' };
                    }
                    
                    // 나무위키 스타일 색상 결정
                    const cssClass = getColorByNamuWikiLogic(currentRank, rankPosition, championshipMagic);
                    return { display: championshipMagic.toString(), cssClass: cssClass };
                }
                return { display: '', cssClass: '' };
            }
            
            // 2-5위 열: 해당 순위 달성 매직넘버
            if (rankPosition >= 2 && rankPosition <= 5) {
                const targetMagic = calculateRankMagic(team, currentStandings, rankPosition - 1);
                if (targetMagic > 0 && targetMagic <= 50) {
                    // 확정 상황 체크
                    if (targetMagic === 0 || (currentRank <= rankPosition && targetMagic <= 3)) {
                        const confirmText = rankPosition === 2 ? '2위확정' : 
                                          rankPosition === 3 ? '3위확정' : 
                                          rankPosition === 4 ? '4위확정' : '5위확정';
                        return { display: confirmText, cssClass: 'namu-clinched-blue' };
                    }
                    
                    // 나무위키 스타일 색상 결정
                    const cssClass = getColorByNamuWikiLogic(currentRank, rankPosition, targetMagic);
                    return { display: targetMagic.toString(), cssClass: cssClass };
                }
            }
            
            // 6-9위 열: 해당 순위까지 떨어질 트래직넘버
            if (rankPosition >= 6 && rankPosition <= 9) {
                const dropMagic = calculateDropRankMagic(team, currentStandings, rankPosition - 1);
                if (dropMagic > 0 && dropMagic <= 50) {
                    // 탈락 확정 상황 체크
                    if (dropMagic === 0 || (currentRank >= rankPosition && dropMagic <= 3)) {
                        return { display: '탈락확정', cssClass: 'namu-eliminated' };
                    }
                    
                    // 나무위키 스타일 색상 결정
                    const cssClass = getColorByNamuWikiLogic(currentRank, rankPosition, dropMagic);
                    return { display: dropMagic.toString(), cssClass: cssClass };
                }
            }

            // 빈 셀 (최소화)
            return { display: '', cssClass: '' };
        }

        // 나무위키 스타일 색상 결정 로직
        function getColorByNamuWikiLogic(currentRank, targetRank, magicNumber) {
            // 40 이상이면 대부분 경합(노란색)
            if (magicNumber >= 40) {
                return 'namu-competitive';
            }
            
            // 현재 순위와 목표 순위 비교
            if (currentRank >= targetRank) {
                // 현재 순위 >= 목표 순위: 매직넘버 가능성 (초록색)
                // 단, 매직넘버가 너무 크면 경합(노란색)
                if (magicNumber >= 25) {
                    return 'namu-competitive';
                } else {
                    return 'namu-magic';
                }
            } else {
                // 현재 순위 < 목표 순위: 트래직넘버 가능성 (빨간색)
                // 단, 매직넘버가 크면 경합(노란색)으로 완화
                if (magicNumber >= 30) {
                    return 'namu-competitive';
                } else {
                    return 'namu-tragic';
                }
            }
        }

        // 특정 순위 도달을 위한 매직넘버 계산
        function calculateRankMagic(team, standings, targetRank) {
            const totalGames = 144;
            const remainingGames = totalGames - team.games;
            
            if (targetRank >= 0 && targetRank < standings.length) {
                const targetTeam = standings[targetRank];
                const targetMaxWins = targetTeam.wins + (totalGames - targetTeam.games);
                const magicNumber = Math.max(0, targetMaxWins - team.wins + 1);
                
                // 이미 목표 달성했거나 불가능한 경우 처리
                if (team.wins > targetMaxWins) return 0;
                if (team.wins + remainingGames < targetTeam.wins) return 999;
                
                return Math.min(magicNumber, remainingGames);
            }
            return 0;
        }

        // 현재 순위 유지를 위한 매직넘버 계산  
        function calculateMaintainRankMagic(team, standings, currentIndex) {
            const totalGames = 144;
            
            if (currentIndex + 1 < standings.length) {
                const nextTeam = standings[currentIndex + 1];
                const nextMaxWins = nextTeam.wins + (totalGames - nextTeam.games);
                return Math.max(0, nextMaxWins - team.wins + 1);
            }
            return 0;
        }

        // 특정 순위로 떨어질 위험을 나타내는 트래직넘버 계산
        function calculateDropRankMagic(team, standings, dropToRank) {
            const totalGames = 144;
            const remainingGames = totalGames - team.games;
            
            if (dropToRank >= 0 && dropToRank < standings.length) {
                const dropToTeam = standings[dropToRank];
                const dropToMaxWins = dropToTeam.wins + (totalGames - dropToTeam.games);
                
                // 우리가 모든 경기를 져도 해당 순위로 떨어지지 않으면
                if (team.wins > dropToMaxWins) return 999;
                
                // 해당 순위까지 떨어지려면 몇 경기를 더 져야 하는가
                const magicNumber = Math.max(0, dropToMaxWins - team.wins + 1);
                return Math.min(magicNumber, remainingGames);
            }
            return 0;
        }

        function calculateChampionshipMagic(team, rankings, index) {
            const totalGames = 144;
            const remainingGames = totalGames - team.games;
            
            if (index === 0) {
                // 현재 1위 - 우승 확정까지
                const secondPlace = rankings[1];
                if (!secondPlace) return 0;
                const secondMaxWins = secondPlace.wins + (totalGames - secondPlace.games);
                return Math.max(0, secondMaxWins - team.wins + 1);
            } else {
                // 1위가 아님 - 1위 추월까지
                const firstPlace = rankings[0];
                const maxPossibleWins = team.wins + remainingGames;
                if (maxPossibleWins <= firstPlace.wins) return 999;
                return Math.max(0, firstPlace.wins - team.wins + 1);
            }
        }

        function calculatePlayoffMagic(team, rankings, index) {
            const totalGames = 144;
            const playoffSpots = 5;
            const remainingGames = totalGames - team.games;
            
            if (index < playoffSpots) {
                // 현재 플레이오프 권 내
                const sixthPlace = rankings[playoffSpots];
                if (!sixthPlace) return 0;
                const sixthMaxWins = sixthPlace.wins + (totalGames - sixthPlace.games);
                return Math.max(0, sixthMaxWins - team.wins + 1);
            } else {
                // 플레이오프 권 밖
                const fifthPlace = rankings[playoffSpots - 1];
                const maxPossibleWins = team.wins + remainingGames;
                if (maxPossibleWins <= fifthPlace.wins) return 999;
                return Math.max(0, fifthPlace.wins - team.wins + 1);
            }
        }

        function calculateTragicNumber(team, rankings, index) {
            const totalGames = 144;
            const remainingGames = totalGames - team.games;
            const playoffSpots = 5;
            
            if (index < playoffSpots) {
                // 플레이오프 권 내 - 탈락까지
                const sixthPlace = rankings[playoffSpots];
                if (!sixthPlace) return 999;
                const minPossibleWins = team.wins;
                const sixthMinWins = sixthPlace.wins;
                if (minPossibleWins > sixthMinWins) return 999;
                return Math.max(0, remainingGames - (team.wins - sixthPlace.wins) + 1);
            } else {
                // 플레이오프 권 밖
                const baselineWins = 72; // 플레이오프 진출 기준선
                const maxPossibleWins = team.wins + remainingGames;
                if (maxPossibleWins >= baselineWins) {
                    return Math.max(0, maxPossibleWins - baselineWins + 1);
                }
                return 0; // 이미 탈락
            }
        }

        function determineTeamStatus(team, championshipMagic, playoffMagic, tragicNumber, index) {
            // 우승 확정
            if (championshipMagic === 0 || (index === 0 && championshipMagic <= 3)) {
                return {
                    label: '우승확정',
                    backgroundColor: '#2563eb',
                    textColor: '#ffffff'
                };
            }
            
            // 플레이오프 확정
            if (playoffMagic === 0 || playoffMagic <= 3) {
                return {
                    label: 'PO확정',
                    backgroundColor: '#2563eb',
                    textColor: '#ffffff'
                };
            }
            
            // 매직넘버 (유력)
            if (playoffMagic <= 10) {
                return {
                    label: 'PO유력',
                    backgroundColor: '#16a34a',
                    textColor: '#ffffff'
                };
            }
            
            // 경합
            if (playoffMagic <= 20 && tragicNumber > 10) {
                return {
                    label: '경합',
                    backgroundColor: '#eab308',
                    textColor: '#000000'
                };
            }
            
            // 탈락 위험
            if (tragicNumber <= 5) {
                return {
                    label: '탈락위험',
                    backgroundColor: '#dc2626',
                    textColor: '#ffffff'
                };
            }
            
            // 탈락
            if (tragicNumber === 0) {
                return {
                    label: '탈락',
                    backgroundColor: '#991b1b',
                    textColor: '#ffffff'
                };
            }
            
            // 기본 (경합)
            return {
                label: '경합',
                backgroundColor: '#eab308',
                textColor: '#000000'
            };
        }

        function renderHeadToHead() {
            const grid = document.getElementById('h2h-grid');
            grid.innerHTML = '';

            // 현재 순위대로 팀 배열 (동적)
            const teamOrder = currentStandings
                .sort((a, b) => a.rank - b.rank)
                .map(team => team.team);

            // Header row
            grid.appendChild(createGridCell('vs', 'vs-header'));
            teamOrder.forEach(team => {
                const teamData = kboTeams[team];
                const cell = createGridCell('', 'vs-header');
                cell.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 3px; justify-content: center;">
                        ${teamData.logo}
                        <span style="color: ${teamData.color}; font-weight: 600;">${team}</span>
                    </div>
                `;
                cell.style.fontWeight = '600';
                grid.appendChild(cell);
            });

            // Data rows
            teamOrder.forEach(homeTeam => {
                const teamData = kboTeams[homeTeam];
                const teamCell = createGridCell('', 'vs-team');
                teamCell.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 3px;">
                        ${teamData.logo}
                        <span style="color: ${teamData.color}; font-weight: 600;">${homeTeam}</span>
                    </div>
                `;
                teamCell.style.color = teamData.color;
                teamCell.style.fontWeight = '600';
                grid.appendChild(teamCell);
                
                teamOrder.forEach(awayTeam => {
                    if (homeTeam === awayTeam) {
                        const cell = createGridCell('', 'vs-record');
                        cell.innerHTML = '<div style="font-size: 1.2rem; color: #666;">■</div>';
                        cell.style.background = 'white';
                        grid.appendChild(cell);
                    } else {
                        const record = headToHeadData[homeTeam][awayTeam];
                        
                        // 새로운 JSON 형식 지원 (전체 객체) 및 기존 문자열 형식 호환
                        let wins, losses, draws, homeWins, homeLosses, homeDraws, awayWins, awayLosses, awayDraws;
                        
                        if (typeof record === 'string') {
                            // 기존 문자열 형식 지원 (백업용)
                            [wins, losses, draws] = record.split('-').map(Number);
                            // 추정치 사용 (기존 로직)
                            homeWins = Math.ceil(wins * 0.55);
                            homeLosses = Math.floor(losses * 0.45);
                            homeDraws = Math.floor(draws * 0.5);
                            awayWins = wins - homeWins;
                            awayLosses = losses - homeLosses;
                            awayDraws = draws - homeDraws;
                        } else {
                            // 새로운 객체 형식 - 실제 데이터 사용
                            wins = record.wins || 0;
                            losses = record.losses || 0;
                            draws = record.draws || 0;
                            homeWins = record.homeWins || 0;
                            homeLosses = record.homeLosses || 0;
                            homeDraws = record.homeDraws || 0;
                            awayWins = record.awayWins || 0;
                            awayLosses = record.awayLosses || 0;
                            awayDraws = record.awayDraws || 0;
                        }
                        
                        const totalGames = wins + losses + draws;
                        const winPct = totalGames > 0 ? (wins / (wins + losses)) : 0.5; // 무승부 제외한 승률
                        const winPctDisplay = totalGames > 0 ? winPct.toFixed(3) : '-';
                        
                        // 승률 강도에 따른 그라데이션 색상
                        let backgroundColor;
                        let textColor = '#333'; // 모든 셀 통일된 텍스트 색상
                        
                        if (winPct === 0.5) {
                            // 정확히 50% 동률 - 하얀색 배경
                            backgroundColor = 'white';
                        } else if (winPct > 0.5) {
                            // 50% 이상 - 승률이 높을수록 진한 초록색
                            const intensity = (winPct - 0.5) / 0.5; // 0.5-1.0을 0-1로 변환
                            const opacity = 0.15 + (intensity * 0.75); // 0.15-0.9 범위로 확장
                            backgroundColor = `rgba(22, 163, 74, ${opacity})`; // 더 진한 초록색 사용
                        } else {
                            // 50% 미만 - 패율이 높을수록 진한 빨간색
                            const intensity = (0.5 - winPct) / 0.5; // 0-0.5를 1-0으로 변환
                            const opacity = 0.15 + (intensity * 0.75); // 0.15-0.9 범위로 확장
                            backgroundColor = `rgba(220, 38, 38, ${opacity})`; // 더 진한 빨간색 사용
                        }
                        
                        // 실제 홈/원정 전적 사용
                        const homeRecord = `${homeWins}-${homeLosses}-${homeDraws}`;
                        const awayRecord = `${awayWins}-${awayLosses}-${awayDraws}`;
                        
                        const homeWinRate = homeWins + homeLosses > 0 ? (homeWins / (homeWins + homeLosses)).toFixed(3) : '-';
                        const awayWinRate = awayWins + awayLosses > 0 ? (awayWins / (awayWins + awayLosses)).toFixed(3) : '-';

                        // 전체 전적 문자열 생성
                        const totalRecord = `${wins}-${losses}-${draws}`;

                        const cell = createGridCell('', 'vs-record');
                        cell.innerHTML = `
                            <div style="font-size: 0.85rem; line-height: 1.3; text-align: center;">
                                <div style="font-weight: 600; margin-bottom: 2px;">${totalRecord} (${winPctDisplay})</div>
                                <div style="font-size: 0.8rem; color: #555; margin-bottom: 1px;">🏠 ${homeRecord} (${homeWinRate})</div>
                                <div style="font-size: 0.8rem; color: #555;">✈️ ${awayRecord} (${awayWinRate})</div>
                            </div>
                        `;
                        cell.style.background = backgroundColor;
                        cell.style.color = textColor;
                        grid.appendChild(cell);
                    }
                });
            });
        }

        function renderRemainingGames() {
            const grid = document.getElementById('remaining-grid');
            grid.innerHTML = '';

            // 현재 순위대로 팀 배열 (동적)
            const teamOrder = currentStandings
                .sort((a, b) => a.rank - b.rank)
                .map(team => team.team);

            // 팀간 남은 경기수 계산 함수
            function calculateRemainingGamesBetweenTeams(team1, team2) {
                if (team1 === team2) return '-';
                
                // 현재 상대전적에서 이미 치른 경기수 계산
                const record = headToHeadData[team1][team2];
                let wins, losses, draws;
                
                if (typeof record === 'string') {
                    [wins, losses, draws] = record.split('-').map(Number);
                } else {
                    wins = record.wins || 0;
                    losses = record.losses || 0;
                    draws = record.draws || 0;
                }
                
                const playedGames = wins + losses + draws;
                
                // KBO 정규시즌에서 각 팀은 다른 팀과 총 16경기씩 치름
                const totalGamesPerOpponent = 16;
                const remainingGames = Math.max(0, totalGamesPerOpponent - playedGames);
                
                return remainingGames;
            }

            // Header row
            grid.appendChild(createGridCell('vs', 'vs-header'));
            teamOrder.forEach(team => {
                const teamData = kboTeams[team];
                const cell = createGridCell('', 'vs-header');
                cell.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 3px; justify-content: center;">
                        ${teamData.logo}
                        <span style="color: ${teamData.color}; font-weight: 600;">${team}</span>
                    </div>
                `;
                cell.style.fontWeight = '600';
                grid.appendChild(cell);
            });

            // Data rows
            teamOrder.forEach(homeTeam => {
                const teamData = kboTeams[homeTeam];
                const teamCell = createGridCell('', 'vs-team');
                teamCell.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 3px;">
                        ${teamData.logo}
                        <span style="color: ${teamData.color}; font-weight: 600;">${homeTeam}</span>
                    </div>
                `;
                teamCell.style.color = teamData.color;
                teamCell.style.fontWeight = '600';
                grid.appendChild(teamCell);
                
                teamOrder.forEach(awayTeam => {
                    const remainingGames = calculateRemainingGamesBetweenTeams(homeTeam, awayTeam);
                    
                    let backgroundColor;
                    let textColor = '#333'; // 모든 셀 통일된 텍스트 색상
                    
                    if (remainingGames === '-') {
                        backgroundColor = 'white';
                        textColor = '#666';
                    } else if (remainingGames === 0) {
                        backgroundColor = 'rgba(156, 163, 175, 0.6)'; // 회색 - 경기 종료
                        textColor = '#666';
                    } else if (remainingGames <= 3) {
                        backgroundColor = 'rgba(249, 115, 22, 0.6)'; // 주황색 - 적은 경기 남음
                    } else if (remainingGames <= 6) {
                        backgroundColor = 'rgba(234, 179, 8, 0.6)'; // 노란색 - 보통
                    } else {
                        backgroundColor = 'rgba(34, 197, 94, 0.6)'; // 초록색 - 많은 경기 남음
                    }
                    
                    const cell = createGridCell(remainingGames === '-' ? '■' : remainingGames.toString(), 'vs-record');
                    cell.style.background = backgroundColor;
                    cell.style.color = textColor;
                    cell.style.fontWeight = '600';
                    cell.style.textAlign = 'center';
                    grid.appendChild(cell);
                });
            });
        }

        function createGridCell(text, className) {
            const cell = document.createElement('div');
            cell.textContent = text;
            cell.className = className;
            return cell;
        }

        function adjustTooltipPositions() {
            const tooltips = document.querySelectorAll('.tooltip');
            tooltips.forEach(tooltip => {
                const tooltiptext = tooltip.querySelector('.tooltiptext');
                if (tooltiptext) {
                    const rect = tooltip.getBoundingClientRect();
                    const windowWidth = window.innerWidth;
                    
                    // 테이블 셀이나 카드 내부인지 확인
                    const parentCard = tooltip.closest('.card, .table-container');
                    let containerRight = windowWidth;
                    
                    if (parentCard) {
                        const cardRect = parentCard.getBoundingClientRect();
                        containerRight = cardRect.right;
                    }
                    
                    // 툴팁이 컨테이너 경계를 넘을 경우 왼쪽 정렬
                    if (rect.left + 150 > containerRight - 20) {
                        tooltiptext.classList.add('tooltip-left');
                    } else {
                        tooltiptext.classList.remove('tooltip-left');
                    }
                }
            });
        }

        async function initializeApp() {
            try {
                console.log('🚀 initializeApp 시작');
                // 1. 모든 데이터를 병렬로 로딩 (성능 최적화)
                console.log('🚀 모든 데이터 병렬 로딩 시작...');
                const [kboData, headToHeadData] = await Promise.all([
                    loadKBOData(),
                    loadHeadToHeadData()
                ]);
                console.log('✅ 모든 데이터 로딩 완료');
                
                // 2. UI 업데이트
                try {
                    updateSummaryDashboard();
                } catch (error) {
                    console.error('❌ 대시보드 업데이트 오류:', error);
                }
                
                try {
                    renderStandingsTable();
                } catch (error) {
                    console.error('❌ 순위표 렌더링 오류:', error);
                }
                
                try {
                    renderChampionshipCondition();
                } catch (error) {
                    console.error('❌ 우승 조건 렌더링 오류:', error);
                }
                
                try {
                    renderChaseAnalysis();
                } catch (error) {
                    console.error('❌ 1위 탈환 가능성 렌더링 오류:', error);
                }
                
                
                try {
                    renderPlayoffCondition();
                } catch (error) {
                    console.error('❌ 플레이오프 조건 렌더링 오류:', error);
                }
                
                
                try {
                    renderHeadToHead();
                    console.log('✅ 팀간 상대전적 현재 순위대로 재배치 완료');
                } catch (error) {
                    console.error('❌ 팀간 상대전적 렌더링 오류:', error);
                }
                
                try {
                    renderRemainingGames();
                    console.log('✅ 팀간 잔여 경기수 현재 순위대로 재배치 완료');
                } catch (error) {
                    console.error('❌ 잔여 경기수 렌더링 오류:', error);
                }
                
                // 3. UI 구성요소 초기화
                try {
                    initializeTooltips();
                } catch (error) {
                    console.error('❌ 툴팁 초기화 오류:', error);
                }
                
                try {
                    initDesktopToggle();
                } catch (error) {
                    console.error('❌ 데스크톱 토글 초기화 오류:', error);
                }
                
                // 4. 툴팁 위치 조정
                setTimeout(adjustTooltipPositions, 100);
                
                // 5. 창 크기 변경 시 툴팁 위치 재조정
                eventManager.add(window, 'resize', () => {
                    setTimeout(adjustTooltipPositions, 100);
                });
                
                // 5. 탑으로 가기 버튼 기능 초기화
                const scrollToTopButton = document.getElementById('scrollToTop');
                
                if (scrollToTopButton) {
                    const handleScroll = () => {
                        const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
                        
                        if (scrollPosition > 300) {
                            scrollToTopButton.classList.add('show');
                        } else {
                            scrollToTopButton.classList.remove('show');
                        }
                    };
                    
                    eventManager.add(window, 'scroll', handleScroll);
                    handleScroll();

                    scrollToTopButton.addEventListener('click', () => {
                        window.scrollTo({
                            top: 0,
                            behavior: 'smooth'
                        });
                    });
                }
                
                console.log('✅ 앱 초기화 완료');
                
            } catch (error) {
                handleError(error, '앱 초기화 실패');
            }
        }

        // 초기화 (비동기)
        // 초기화 플래그
        let isInitialized = false;
        
        async function runInitialization() {
            if (isInitialized) {
                console.log('⚠️ 이미 초기화됨');
                return;
            }
            isInitialized = true;
            console.log('🚀 앱 초기화 시작...');
            await initializeApp();
        }
        
        // DOMContentLoaded 이벤트
        if (document.readyState === 'loading') {
            eventManager.add(document, 'DOMContentLoaded', runInitialization);
        } else {
            // 이미 DOM이 로드된 경우
            runInitialization();
        }

        // 탑으로 가기 버튼 별도 초기화 (더 안전한 방법)
        setTimeout(() => {
            console.log('탑으로 가기 버튼 별도 초기화');
            const btn = document.getElementById('scrollToTop');
            console.log('버튼 요소:', btn);
            
            if (btn) {
                // 스크롤 이벤트
                const btnScrollHandler = function() {
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    if (scrollTop > 300) {
                        btn.style.opacity = '1';
                        btn.style.visibility = 'visible';
                        btn.style.transform = 'translateY(0)';
                    } else {
                        btn.style.opacity = '0';
                        btn.style.visibility = 'hidden';
                        btn.style.transform = 'translateY(20px)';
                    }
                };
                eventManager.add(window, 'scroll', btnScrollHandler);
                
                // 클릭 이벤트
                const btnClickHandler = function() {
                    console.log('버튼 클릭!');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                };
                eventManager.add(btn, 'click', btnClickHandler);
                
                console.log('탑으로 가기 버튼 이벤트 등록 완료');
            } else {
                console.error('버튼을 찾을 수 없습니다!');
            }
        }, 200);

        // KBO 데이터 업데이트 체크 (하루 3번: 18시, 22시, 24시)
        function checkForDataUpdate() {
            const now = new Date();
            const currentTime = now.getHours() * 100 + now.getMinutes();
            
            // 업데이트 시간: 18:00, 22:00, 00:00 (± 5분 오차 허용)
            const updateTimes = [1800, 2200, 0]; // 18:00, 22:00, 00:00
            const tolerance = 5; // 5분 오차 허용
            
            for (let updateTime of updateTimes) {
                if (Math.abs(currentTime - updateTime) <= tolerance) {
                    console.log(`📊 KBO 데이터 업데이트 시간입니다. (${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')})`);
                    // 실제 데이터 업데이트는 서버에서 JSON 파일을 업데이트하면 자동으로 반영됨
                    showNotification('KBO 데이터가 업데이트되었습니다.', 'info', 3000);
                    return true;
                }
            }
            return false;
        }
        
        // 1시간마다 업데이트 시간 체크
        setInterval(checkForDataUpdate, 3600000); // 1시간마다 체크

        // 툴팁 클릭 이벤트 초기화 함수
        function initializeTooltips() {
            const tooltips = document.querySelectorAll('.tooltip');
            
            tooltips.forEach(tooltip => {
                // 중복 이벤트 방지
                if (!tooltip.hasAttribute('data-tooltip-initialized')) {
                    tooltip.setAttribute('data-tooltip-initialized', 'true');
                    eventManager.add(tooltip, 'click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // 다른 모든 툴팁 비활성화
                        tooltips.forEach(t => t.classList.remove('active'));
                        
                        // 현재 툴팁 활성화
                        this.classList.add('active');
                    });
                }
            });
            
            // 다른 곳 클릭시 툴팁 닫기 (한 번만 등록)
            if (!document.documentElement.hasAttribute('data-tooltip-global-initialized')) {
                document.documentElement.setAttribute('data-tooltip-global-initialized', 'true');
                eventManager.add(document, 'click', function() {
                    tooltips.forEach(tooltip => tooltip.classList.remove('active'));
                });
            }
        }

        // PC 버전 보기 기능
        function initDesktopToggle() {
            try {
                const toggleBtn = document.getElementById('toggle-desktop-view');
                const mobileControls = document.getElementById('mobile-controls');
                
                // 요소가 없으면 함수 종료
                if (!toggleBtn && !mobileControls) {
                    console.log('📱 모바일 컨트롤 요소들이 없습니다. 건너뜁니다.');
                    return;
                }
                
                // 화면 크기 확인 함수
                function isMobileDevice() {
                    return window.innerWidth <= 768;
                }
                
                // 모바일 컨트롤 표시/숨김
                function updateMobileControlsVisibility() {
                    if (mobileControls) {
                        mobileControls.style.display = isMobileDevice() ? 'block' : 'none';
                    }
                }
            
            // 초기 설정
            updateMobileControlsVisibility();
            
            // 화면 크기 변경 시 업데이트
            eventManager.add(window, 'resize', updateMobileControlsVisibility);
            
            // 버튼 클릭 이벤트
            if (toggleBtn) {
                toggleBtn.addEventListener('click', function() {
                    const viewportMeta = document.querySelector('meta[name="viewport"]');
                    const isDesktopMode = toggleBtn.textContent.includes('모바일');
                    
                    if (isDesktopMode) {
                        // 모바일 버전으로 되돌리기
                        viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0');
                        toggleBtn.innerHTML = '🖥️ PC 버전으로 보기';
                        toggleBtn.nextElementSibling.textContent = '더 원활한 사용이 가능합니다';
                    } else {
                        // PC 버전으로 전환
                        viewportMeta.setAttribute('content', 'width=1200, initial-scale=0.5, user-scalable=yes');
                        toggleBtn.innerHTML = '📱 모바일 버전으로 돌아가기';
                        toggleBtn.nextElementSibling.textContent = '원래 크기로 돌아갑니다';
                    }
                });
                
                // 버튼 hover 효과
                toggleBtn.addEventListener('mouseenter', function() {
                    this.style.background = 'rgba(255,255,255,0.2)';
                    this.style.borderColor = 'rgba(255,255,255,0.4)';
                });
                
                toggleBtn.addEventListener('mouseleave', function() {
                    this.style.background = 'rgba(255,255,255,0.1)';
                    this.style.borderColor = 'rgba(255,255,255,0.2)';
                });
            }
            } catch (error) {
                console.error('❌ initDesktopToggle 오류:', error);
                // 이 함수의 오류는 치명적이지 않으므로 계속 진행
            }
        }
        
        // 초기화는 runInitialization에서 처리됨
        
        // 네비게이션 함수들 (CSS scroll-margin-top 활용)
        function scrollToSection(elementId) {
            const element = document.getElementById(elementId);
            if (!element) return;
            
            // CSS scroll-margin-top을 활용한 간단한 스크롤
            element.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
            
            updateActiveNav(elementId);
            
            // 모바일 메뉴 닫기
            const navMenu = document.querySelector('.nav-menu');
            navMenu.classList.remove('active');
        }
        
        function scrollToPlayoff() {
            scrollToSection('playoff');
        }
        
        function scrollToChampionship() {
            scrollToSection('championship');
        }
        
        function scrollToChase() {
            scrollToSection('chase');
        }
        
        function scrollToVsRecords() {
            scrollToSection('vs-records');
        }
        
        function scrollToRemaining() {
            scrollToSection('remaining');
        }

        
        

        
        

        
        // 활성 네비게이션 업데이트
        function updateActiveNav(activeId) {
            document.querySelectorAll('.nav-menu a').forEach(link => {
                link.classList.remove('active');
            });
            
            const activeLink = document.querySelector(`.nav-menu a[href="#${activeId}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
        }
        
        // 모바일 메뉴 토글
        function toggleMobileMenu() {
            const navMenu = document.querySelector('.nav-menu');
            navMenu.classList.toggle('active');
        }
        
        // 스크롤 이벤트로 활성 섹션 감지
        window.addEventListener('scroll', function() {
            const sections = ['standings', 'championship', 'chase', 'playoff', 'vs-records', 'remaining'];
            let current = 'standings';
            const navHeight = document.querySelector('.nav-container').offsetHeight;
            
            for (const section of sections) {
                const element = document.getElementById(section);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    if (rect.top <= navHeight + 80 && rect.bottom >= navHeight + 80) {
                        current = section;
                        break;
                    }
                }
            }
            
            updateActiveNav(current);
        });
        
        // 모바일에서 메뉴 항목 클릭 시 메뉴 닫기
        document.addEventListener('click', function(e) {
            const navMenu = document.querySelector('.nav-menu');
            const navToggle = document.querySelector('.nav-toggle');
            
            if (!navMenu.contains(e.target) && !navToggle.contains(e.target)) {
                navMenu.classList.remove('active');
            }
        });

