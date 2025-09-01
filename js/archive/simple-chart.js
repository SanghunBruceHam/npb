// 매우 단순한 차트 관리 시스템
let chartState = {
    isFullView: false,
    currentPeriod: 0,
    periods: [],
    chart: null,
    teamLogoImages: {}
};

// 팀 로고 이미지 미리 로드
async function loadTeamLogos() {
    const teams = ["한화", "LG", "두산", "삼성", "KIA", "SSG", "롯데", "NC", "키움", "KT"];
    const logoPromises = teams.map(team => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                chartState.teamLogoImages[team] = img;
                resolve();
            };
            img.onerror = () => {
                // 로고 로드 실패는 치명적 오류가 아니므로 조용히 처리
                resolve();
            };
            img.src = `images/${getTeamLogo(team)}`;
        });
    });
    
    await Promise.all(logoPromises);
}

// 실제 KBO 데이터 로드 및 처리
async function loadRealKBOData() {
    try {
        const response = await fetch('data/game-by-game-records.json');
        
        if (!response.ok) {
            throw new Error(`데이터 로드 실패: ${response.status}`);
        }
        
        const gameData = await response.json();
        
        // SeasonRankGenerator 사용
        const generator = {
            gameData: gameData,
            teams: ["한화", "LG", "두산", "삼성", "KIA", "SSG", "롯데", "NC", "키움", "KT"],
            
            // 모든 경기 날짜 수집
            getAllGameDates() {
                const dates = new Set();
                
                for (const team of this.teams) {
                    if (this.gameData[team] && this.gameData[team].games) {
                        for (const game of this.gameData[team].games) {
                            dates.add(game.date);
                        }
                    }
                }
                
                return Array.from(dates).sort();
            },
            
            // 특정 날짜까지의 팀별 누적 전적 계산
            calculateCumulativeRecord(targetDate) {
                // 최신 날짜인 경우 종합순위 데이터 우선 사용
                if (window.dashboardData && window.dashboardData.standings && targetDate === this.getLatestDate()) {
                    const records = {};
                    window.dashboardData.standings.forEach(team => {
                        records[team.team] = {
                            wins: team.wins,
                            losses: team.losses,
                            draws: team.draws,
                            games: team.games
                        };
                    });
                    return records;
                }
                
                const records = {};
                
                // 모든 팀 초기화
                for (const team of this.teams) {
                    records[team] = { wins: 0, losses: 0, draws: 0, games: 0 };
                }
                
                // 각 팀의 경기 결과를 targetDate까지 누적
                for (const team of this.teams) {
                    if (this.gameData[team] && this.gameData[team].games) {
                        for (const game of this.gameData[team].games) {
                            if (game.date <= targetDate) {
                                records[team].games++;
                                
                                if (game.result === 'W') {
                                    records[team].wins++;
                                } else if (game.result === 'L') {
                                    records[team].losses++;
                                } else if (game.result === 'D') {
                                    records[team].draws++;
                                }
                            }
                        }
                    }
                }
                
                return records;
            },
            
            // 최신 경기 날짜 반환
            getLatestDate() {
                const allDates = this.getAllGameDates();
                return allDates.length > 0 ? allDates[allDates.length - 1] : null;
            },
            
            // 전체 시즌 순위 생성
            generateSeasonRankings() {
                const allDates = this.getAllGameDates();
                
                const seasonData = [];
                
                for (const date of allDates) {
                    // 최신 날짜인 경우 종합순위 데이터 직접 사용
                    if (window.dashboardData && window.dashboardData.standings && date === this.getLatestDate()) {
                        const standings = window.dashboardData.standings.map(team => ({
                            team: team.team,
                            wins: team.wins,
                            losses: team.losses,
                            draws: team.draws,
                            winPct: team.winRate,
                            games: team.games,
                            rank: team.rank
                        }));
                        
                        seasonData.push({
                            date: date,
                            standings: standings
                        });
                        continue;
                    }
                    
                    // 과거 날짜는 기존 로직 사용
                    const records = this.calculateCumulativeRecord(date);
                    
                    // 승률 계산 및 순위 결정
                    const standings = [];
                    for (const team of this.teams) {
                        const record = records[team];
                        const winPct = record.games > 0 ? record.wins / (record.wins + record.losses) : 0;
                        
                        standings.push({
                            team: team,
                            wins: record.wins,
                            losses: record.losses,
                            draws: record.draws,
                            winPct: winPct,
                            games: record.games
                        });
                    }
                    
                    // 승률순 정렬 (종합순위와 동일한 기준)
                    standings.sort((a, b) => {
                        if (b.winPct !== a.winPct) return b.winPct - a.winPct;
                        if (b.wins !== a.wins) return b.wins - a.wins;
                        return a.losses - b.losses;
                    });
                    
                    // 동순위 처리 포함 순위 부여 - 종합순위와 동일한 로직
                    let currentRank = 1;
                    let previousWinRate = null;
                    
                    for (let i = 0; i < standings.length; i++) {
                        const currentTeam = standings[i];
                        // 표시되는 승률 기준으로 동률 처리 (소수점 3자리)
                        const displayedWinRate = parseFloat(currentTeam.winPct.toFixed(3));
                        
                        // 이전 팀과 표시 승률이 다르면 실제 순위로 업데이트
                        if (previousWinRate !== null && displayedWinRate !== previousWinRate) {
                            currentRank = i + 1;
                        }
                        // 동률일 경우 같은 순위 유지
                        currentTeam.rank = currentRank;
                        previousWinRate = displayedWinRate;
                    }
                    
                    seasonData.push({
                        date: date,
                        standings: standings
                    });
                }
                
                return seasonData;
            }
        };
        
        const seasonRankings = generator.generateSeasonRankings();
        return processRealData(seasonRankings);
        
    } catch (error) {
        // 실제 데이터 로드 실패 시 조용히 가짜 데이터 사용
        return generateMockData();
    }
}

// 실제 데이터를 기간별로 분할 (월별 처리)
function processRealData(seasonRankings) {
    if (!seasonRankings || seasonRankings.length === 0) {
        // 시즌 랭킹 데이터가 없으면 가짜 데이터 사용
        return generateMockData();
    }
    
    const periods = [];
    const monthlyData = {};
    
    // 월별로 데이터 그룹화
    seasonRankings.forEach(dayData => {
        const date = new Date(dayData.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = [];
        }
        monthlyData[monthKey].push(dayData);
    });
    
    // 월별 기간 생성
    Object.keys(monthlyData).sort().forEach(monthKey => {
        const [year, month] = monthKey.split('-');
        const monthData = monthlyData[monthKey];
        
        if (monthData.length > 0) {
            const period = {
                title: `${year}년 ${month}월`,
                rawData: monthData,
                data: formatPeriodDataForChart(monthData)
            };
            
            periods.push(period);
        }
    });
    
    return periods;
}

// 기간 데이터를 Chart.js 형식으로 변환
function formatPeriodDataForChart(periodData) {
    const teams = ["한화", "LG", "두산", "삼성", "KIA", "SSG", "롯데", "NC", "키움", "KT"];
    
    const chartData = {
        labels: [],
        datasets: []
    };
    
    // 날짜 라벨 생성
    chartData.labels = periodData.map(day => {
        const date = new Date(day.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    });
    
    // 각 팀별 순위 데이터 생성 (동순위 정확히 표시)
    teams.forEach(teamName => {
        const rankHistory = [];
        
        periodData.forEach(day => {
            const teamData = day.standings.find(s => s.team === teamName);
            rankHistory.push(teamData ? teamData.rank : null);
        });
        

        chartData.datasets.push({
            label: teamName,
            data: rankHistory,
            borderColor: getTeamColor(teamName),
            backgroundColor: getTeamColor(teamName) + '20',
            borderWidth: 2,
            pointRadius: 1.5,
            pointHoverRadius: 4,
            tension: 0.1,
            fill: false
        });
    });
    
    return chartData;
}

// 백업용 가짜 데이터 생성 함수 (기존 함수명 변경)
function generateMockData() {
    const teams = ["한화", "LG", "두산", "삼성", "KIA", "SSG", "롯데", "NC", "키움", "KT"];
    const periods = [];
    
    // 5개 기간 생성
    for (let p = 0; p < 5; p++) {
        const period = {
            title: `${p*30+1}일 - ${(p+1)*30}일`,
            data: {
                labels: [],
                datasets: []
            }
        };
        
        // 30일 데이터 생성
        for (let d = 1; d <= 30; d++) {
            period.data.labels.push(`${d}일`);
        }
        
        // 각 팀별 순위 데이터 생성
        teams.forEach((team, index) => {
            const rankData = [];
            for (let d = 1; d <= 30; d++) {
                // 랜덤하게 순위 변동
                const baseRank = index + 1;
                const variation = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
                const rank = Math.max(1, Math.min(10, baseRank + variation));
                rankData.push(rank);
            }
            
            period.data.datasets.push({
                label: team,
                data: rankData,
                borderColor: getTeamColor(team),
                backgroundColor: getTeamColor(team) + '20',
                borderWidth: 2,
                fill: false
            });
        });
        
        periods.push(period);
    }
    
    return periods;
}

function getTeamColor(team) {
    const colors = {
        "한화": "#FF6600",
        "LG": "#C50E2E", 
        "두산": "#131230",
        "삼성": "#1F4E8C",
        "KIA": "#EA0029",
        "SSG": "#CE0E2D",
        "롯데": "#041E42",
        "NC": "#315288",
        "키움": "#570514",
        "KT": "#333333"
    };
    return colors[team] || "#666666";
}

function getTeamLogo(team) {
    const logos = {
        "한화": "hanwha.png",
        "LG": "lg.png",
        "두산": "doosan.png",
        "삼성": "samsung.png",
        "KIA": "kia.png",
        "SSG": "ssg.png",
        "롯데": "lotte.png",
        "NC": "nc.png",
        "키움": "kiwoom.png",
        "KT": "kt.png"
    };
    return logos[team] || "default.png";
}

// 커스텀 범례 생성
function createCustomLegend() {
    
    // 기존 커스텀 범례 제거
    const existingMainLegend = document.getElementById('main-legend-container');
    if (existingMainLegend) {
        existingMainLegend.remove();
    }
    
    // 혹시 모를 기존 범례도 제거
    const existingLegend = document.getElementById('custom-chart-legend');
    if (existingLegend) {
        existingLegend.remove();
    }
    
    if (!chartState.chart) {
        // 차트가 생성되지 않음
        return;
    }
    
    // 레전드 컨테이너 찾기 (고정 위치)
    const chartContainer = document.getElementById('mainRankChartLegend');
    
    // 범례 컨테이너 생성 (버튼과 팀들을 함께 배치)
    const mainLegendContainer = document.createElement('div');
    mainLegendContainer.id = 'main-legend-container';
    mainLegendContainer.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        align-items: center;
        gap: 8px;
        margin-top: 5px;
        margin-bottom: 0;
        padding: 0 10px;
        background: none;
        border-radius: 0;
        box-shadow: none;
        border: none;
        width: 100%;
        box-sizing: border-box;
    `;

    // 버튼 클릭 상태 초기화
    let allVisible = true;
    
    // 전체선택/해제 버튼 생성 (팀 아이템과 동일한 스타일)
    const toggleAllButton = document.createElement('button');
    toggleAllButton.id = 'toggle-all-teams';
    toggleAllButton.textContent = '전체 해제';
    toggleAllButton.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 5px 12px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
        font-weight: 600;
        font-size: 13px;
        white-space: nowrap;
        flex-shrink: 0;
        min-height: 34px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.15);
        border: none;
    `;

    // 버튼 호버 효과
    toggleAllButton.addEventListener('mouseenter', () => {
        const hoverGradient = allVisible ? 
            'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' :
            'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
        toggleAllButton.style.background = hoverGradient;
        toggleAllButton.style.transform = 'translateY(-1px)';
        toggleAllButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.12)';
    });
    
    toggleAllButton.addEventListener('mouseleave', () => {
        const normalGradient = allVisible ? 
            'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' :
            'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
        toggleAllButton.style.background = normalGradient;
        toggleAllButton.style.transform = 'translateY(0)';
        toggleAllButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.15)';
    });

    // 버튼 클릭 이벤트
    toggleAllButton.addEventListener('click', () => {
        allVisible = !allVisible;
        
        chartState.chart.data.datasets.forEach((dataset, index) => {
            const meta = chartState.chart.getDatasetMeta(index);
            meta.hidden = !allVisible;
        });
        
        chartState.chart.update();
        
        // 버튼 텍스트 및 색상 업데이트
        toggleAllButton.textContent = allVisible ? '전체 해제' : '전체 선택';
        const buttonGradient = allVisible ? 
            'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' :
            'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
        toggleAllButton.style.background = buttonGradient;
        
        // 모든 범례 아이템의 시각적 상태 업데이트
        const legendItems = mainLegendContainer.querySelectorAll('div[data-team]');
        legendItems.forEach(item => {
            const img = item.querySelector('img');
            const colorBox = item.querySelector('div[style*="border-radius: 50%"]');
            const text = item.querySelector('span');
            
            const opacity = allVisible ? '1' : '0.4';
            const filter = allVisible ? 'none' : 'grayscale(100%)';
            
            item.style.opacity = opacity;
            if (img) img.style.filter = filter;
            if (colorBox) colorBox.style.opacity = opacity;
            if (text) text.style.opacity = opacity;
            
            if (!allVisible) {
                item.style.borderColor = 'rgba(0,0,0,0.2)';
                item.style.background = 'rgba(128,128,128,0.1)';
            } else {
                item.style.borderColor = 'rgba(0,0,0,0.1)';
                item.style.background = 'rgba(255,255,255,0.9)';
            }
        });
    });

    // 고정된 순위대로 팀 정렬 (전체 시즌 최신 날짜 기준으로 한 번 결정하여 모든 기간에서 동일)
    const sortedTeams = getFixedRankingSortedTeams();
    
    sortedTeams.forEach(({teamName, datasetIndex}, index) => {
        const dataset = chartState.chart.data.datasets[datasetIndex];
        if (!dataset) return;
        
        const legendItem = document.createElement('div');
        legendItem.setAttribute('data-team', teamName);
        legendItem.style.cssText = `
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 5px 8px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
            background: rgba(255,255,255,0.9);
            border: 1px solid rgba(0,0,0,0.1);
            font-weight: 600;
            font-size: 13px;
            white-space: nowrap;
            flex-shrink: 0;
            min-height: 34px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.08);
        `;
        
        // 색상 인디케이터
        const colorBox = document.createElement('div');
        colorBox.style.cssText = `
            width: 12px;
            height: 12px;
            background-color: ${dataset.borderColor};
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 0 0 1px rgba(0,0,0,0.2);
            flex-shrink: 0;
        `;
        
        // 팀 로고 이미지
        const logoImg = document.createElement('img');
        logoImg.src = `../images/${getTeamLogo(teamName)}`;
        logoImg.alt = teamName;
        logoImg.style.cssText = `
            width: 20px;
            height: 20px;
            object-fit: contain;
            border-radius: 3px;
            flex-shrink: 0;
        `;
        
        // 팀명 텍스트
        const teamText = document.createElement('span');
        teamText.textContent = teamName;
        teamText.style.cssText = `
            color: #333;
            font-weight: 700;
            font-size: 13px;
            text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        `;
        
        legendItem.appendChild(colorBox);
        legendItem.appendChild(logoImg);
        legendItem.appendChild(teamText);
        
        // 클릭 이벤트로 데이터셋 토글
        legendItem.addEventListener('click', () => {
            const meta = chartState.chart.getDatasetMeta(datasetIndex);
            meta.hidden = !meta.hidden;
            chartState.chart.update();
            
            // 시각적 피드백
            const opacity = meta.hidden ? '0.4' : '1';
            const filter = meta.hidden ? 'grayscale(100%)' : 'none';
            
            legendItem.style.opacity = opacity;
            logoImg.style.filter = filter;
            colorBox.style.opacity = opacity;
            teamText.style.opacity = opacity;
            
            if (meta.hidden) {
                legendItem.style.borderColor = 'rgba(0,0,0,0.2)';
                legendItem.style.background = 'rgba(128,128,128,0.1)';
            } else {
                legendItem.style.borderColor = 'transparent';
                legendItem.style.background = 'rgba(255,255,255,0.8)';
            }
        });
        
        // 호버 효과
        legendItem.addEventListener('mouseenter', () => {
            if (!chartState.chart.getDatasetMeta(datasetIndex).hidden) {
                legendItem.style.backgroundColor = 'rgba(255,255,255,1)';
                legendItem.style.borderColor = dataset.borderColor;
                legendItem.style.transform = 'translateY(-1px)';
                legendItem.style.boxShadow = '0 4px 8px rgba(0,0,0,0.12)';
            }
        });
        
        legendItem.addEventListener('mouseleave', () => {
            if (!chartState.chart.getDatasetMeta(datasetIndex).hidden) {
                legendItem.style.backgroundColor = 'rgba(255,255,255,0.9)';
                legendItem.style.borderColor = 'rgba(0,0,0,0.1)';
                legendItem.style.transform = 'translateY(0)';
                legendItem.style.boxShadow = '0 2px 4px rgba(0,0,0,0.08)';
            }
        });
        
        // 1위 팀(첫 번째) 앞에 버튼 추가
        if (index === 0) {
            mainLegendContainer.appendChild(toggleAllButton);
            mainLegendContainer.appendChild(legendItem);
        } else {
            mainLegendContainer.appendChild(legendItem);
        }
    });
    
    // 기존 내용 제거 후 메인 범례 컨테이너 추가
    chartContainer.innerHTML = '';
    chartContainer.appendChild(mainLegendContainer);
}

// 전체 시즌 기준 고정 순위로 팀 정렬 (전역 변수로 한 번만 계산)
let globalFixedTeamOrder = null;

function getFixedRankingSortedTeams() {
    // 이미 계산된 고정 순서가 있으면 재사용
    if (globalFixedTeamOrder && globalFixedTeamOrder.length > 0) {
        return globalFixedTeamOrder;
    }
    
    try {
        // 전체 시즌에서 가장 최신 날짜의 순위로 고정 순서 결정
        let latestRankings = [];
        let latestDate = '';
        
        // 모든 기간의 데이터를 합쳐서 가장 최신 날짜 찾기
        let allData = [];
        chartState.periods.forEach(period => {
            if (period.rawData) {
                allData = allData.concat(period.rawData);
            }
        });
        
        if (allData.length > 0) {
            // 날짜순으로 정렬하여 가장 최신 데이터 가져오기
            allData.sort((a, b) => new Date(a.date) - new Date(b.date));
            const latestData = allData[allData.length - 1];
            latestRankings = latestData.standings;
            latestDate = latestData.date;
            
        }
        
        if (latestRankings.length > 0) {
            // 순위대로 정렬하고 데이터셋 인덱스 찾기
            const sortedStandings = [...latestRankings].sort((a, b) => a.rank - b.rank);
            const sortedTeams = [];
            
            sortedStandings.forEach(standing => {
                const teamName = standing.team;
                const datasetIndex = chartState.chart.data.datasets.findIndex(ds => ds.label === teamName);
                if (datasetIndex !== -1) {
                    sortedTeams.push({ teamName, datasetIndex });
                }
            });
            
            // 전역 변수에 저장하여 모든 기간에서 동일한 순서 사용
            globalFixedTeamOrder = sortedTeams;
            
            return sortedTeams;
        }
    } catch (error) {
        // 고정 순위 기준 정렬 실패, 기본 순서 사용
    }
    
    // 기본 순서로 대체 (데이터셋 순서대로)
    const teams = ["한화", "LG", "두산", "삼성", "KIA", "SSG", "롯데", "NC", "키움", "KT"];
    const defaultOrder = teams.map((teamName, index) => ({
        teamName,
        datasetIndex: index
    }));
    
    globalFixedTeamOrder = defaultOrder;
    return defaultOrder;
}

// 차트 생성
function createSimpleChart(data) {
    
    const ctx = document.getElementById('rankChart');
    
    if (!ctx) {
        // rankChart 캔버스 요소를 찾을 수 없음
        return null;
    }
    
    if (chartState.chart) {
        chartState.chart.destroy();
    }
    
    try {
        chartState.chart = new Chart(ctx, {
            type: 'line',
            data: data,
            plugins: [{
                id: 'teamLogos',
                afterDraw: (chart) => {
                    const ctx = chart.ctx;
                    chart.data.datasets.forEach((dataset, index) => {
                        const meta = chart.getDatasetMeta(index);
                        if (meta.data && meta.data.length > 0 && !meta.hidden) {
                            const lastPoint = meta.data[meta.data.length - 1];
                            const teamName = dataset.label;
                            const logoImg = chartState.teamLogoImages[teamName];
                            
                            if (logoImg && lastPoint) {
                                ctx.save();
                                ctx.shadowColor = 'rgba(0,0,0,0.3)';
                                ctx.shadowBlur = 2;
                                const size = 24;
                                ctx.drawImage(logoImg, lastPoint.x - size/2, lastPoint.y - size/2, size, size);
                                ctx.restore();
                            }
                        }
                    });
                }
            }],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        left: 35, // 텍스트만 표시하므로 패딩 줄임
                        right: 35, // 좌우 균형 맞춤
                        top: 10,
                        bottom: 10
                    }
                },
                plugins: {
                    legend: {
                        display: false // 커스텀 범례 사용
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function(tooltipItems) {
                                const dataIndex = tooltipItems[0].dataIndex;
                                
                                // 전체 시즌 모드인지 확인
                                if (chartState.isFullView) {
                                    // 전체 시즌 데이터에서 실제 날짜 찾기
                                    let allData = [];
                                    chartState.periods.forEach(period => {
                                        if (period.rawData) {
                                            allData = allData.concat(period.rawData);
                                        }
                                    });
                                    
                                    if (allData[dataIndex] && allData[dataIndex].date) {
                                        const date = new Date(allData[dataIndex].date);
                                        return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
                                    }
                                }
                                
                                return tooltipItems[0].label;
                            },
                            beforeBody: function(tooltipItems) {
                                // 현재 시점의 모든 팀 순위 정보 수집
                                const dataIndex = tooltipItems[0].dataIndex;
                                const allTeamsAtThisPoint = [];
                                
                                tooltipItems.forEach(item => {
                                    const rank = item.parsed.y;
                                    const teamName = item.dataset.label;
                                    if (rank && teamName) {
                                        allTeamsAtThisPoint.push({ rank, teamName });
                                    }
                                });
                                
                                // 순위별로 정렬
                                allTeamsAtThisPoint.sort((a, b) => a.rank - b.rank);
                                
                                // 동순위 그룹핑 후 툴팁에 표시할 텍스트 생성
                                const rankGroups = {};
                                allTeamsAtThisPoint.forEach(team => {
                                    if (!rankGroups[team.rank]) {
                                        rankGroups[team.rank] = [];
                                    }
                                    rankGroups[team.rank].push(team.teamName);
                                });
                                
                                return Object.keys(rankGroups).map(rank => {
                                    const teams = rankGroups[rank];
                                    if (teams.length > 1) {
                                        return `${rank}위 공동: ${teams.join(', ')}`;
                                    } else {
                                        return `${rank}위: ${teams[0]}`;
                                    }
                                });
                            },
                            label: function(context) {
                                // beforeBody에서 이미 정보를 표시했으므로 빈 문자열 반환
                                return '';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        reverse: true,
                        min: 0.5,
                        max: 10.5,
                        beginAtZero: false,
                        bounds: 'data',
                        title: {
                            display: true,
                            text: '순위',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        afterBuildTicks: function(axis) {
                            axis.ticks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => ({value}));
                        },
                        ticks: { 
                            stepSize: 1,
                            autoSkip: false,
                            callback: function(value) {
                                // 1~10 정수값만 표시
                                if (Number.isInteger(value) && value >= 1 && value <= 10) {
                                    return value + '위';
                                }
                                return null;
                            },
                            font: {
                                size: 12
                            },
                            padding: 5
                        },
                        grid: {
                            color: '#e5e7eb'
                        }
                    },
                    x: {
                        grid: {
                            display: true,   // x축 격자 표시 활성화
                            color: '#e5e7eb'  // y축과 동일한 격자 색상
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
        
        
        // 커스텀 범례 생성
        setTimeout(() => createCustomLegend(), 100);
        
        return chartState.chart;
    } catch (error) {
        // 차트 생성 오류
        return null;
    }
}

// 차트 업데이트
function updateSimpleChart() {
    
    if (chartState.periods.length === 0) {
        // 기간 데이터가 없음
        return;
    }
    
    let chartData;
    
    if (chartState.isFullView) {
        // 전체 시즌 데이터 생성
        chartData = generateFullSeasonChart();
    } else {
        // 특정 기간 데이터 사용
        const period = chartState.periods[chartState.currentPeriod];
        if (!period) {
            // 현재 기간 데이터를 찾을 수 없음
            return;
        }
        chartData = period.data;
    }
    
    // 항상 기존 차트를 완전히 파괴하고 새로 생성 (강제 업데이트)
    if (chartState.chart) {
        chartState.chart.destroy();
        chartState.chart = null;
    }
    
    // 잠시 대기 후 새 차트 생성 (DOM 정리 시간 확보)
    setTimeout(() => {
        createSimpleChart(chartData);
        // UI 업데이트
        updateSimpleUI();
        updateProgressIndicator();
    }, 50);
}

// 전체 시즌 차트 데이터 생성
function generateFullSeasonChart() {
    const teams = ["한화", "LG", "두산", "삼성", "KIA", "SSG", "롯데", "NC", "키움", "KT"];
    
    // 모든 기간의 rawData를 하나로 합치기
    let allData = [];
    chartState.periods.forEach(period => {
        if (period.rawData) {
            allData = allData.concat(period.rawData);
        }
    });
    
    // 날짜순으로 정렬
    allData.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    
    const chartData = {
        labels: [],
        datasets: []
    };
    
    // 날짜 라벨 생성 (일부만 표시)
    const showEveryN = Math.max(1, Math.floor(allData.length / 20)); // 최대 20개 라벨
    chartData.labels = allData.map((day, index) => {
        if (index % showEveryN === 0) {
            const date = new Date(day.date);
            return `${date.getMonth() + 1}/${date.getDate()}`;
        }
        return '';
    });
    
    // 각 팀별 순위 데이터 생성 (동순위 정확히 표시)
    teams.forEach(teamName => {
        const rankHistory = [];
        
        allData.forEach(day => {
            const teamData = day.standings.find(s => s.team === teamName);
            rankHistory.push(teamData ? teamData.rank : null);
        });
        

        chartData.datasets.push({
            label: teamName,
            data: rankHistory,
            borderColor: getTeamColor(teamName),
            backgroundColor: getTeamColor(teamName) + '20',
            borderWidth: 2,
            pointRadius: 1.5,
            pointHoverRadius: 4,
            tension: 0.1,
            fill: false
        });
    });
    
    return chartData;
}

// UI 업데이트
function updateSimpleUI() {
    const period = chartState.periods[chartState.currentPeriod];
    
    // 현재 기간 텍스트 업데이트
    const periodText = document.getElementById('currentPeriodText');
    if (periodText) {
        if (chartState.isFullView) {
            // 전체 시즌 모드일 때 전체 기간 표시
            if (chartState.periods.length > 0) {
                // 첫 번째 기간의 시작일과 마지막 기간의 종료일 계산
                const firstPeriod = chartState.periods[0];
                const lastPeriod = chartState.periods[chartState.periods.length - 1];
                
                if (firstPeriod.rawData && lastPeriod.rawData) {
                    const startDate = new Date(firstPeriod.rawData[0].date);
                    const endDate = new Date(lastPeriod.rawData[lastPeriod.rawData.length - 1].date);
                    
                    periodText.textContent = `전체 시즌: ${startDate.getFullYear()}년 ${startDate.getMonth() + 1}월 ${startDate.getDate()}일 - ${endDate.getFullYear()}년 ${endDate.getMonth() + 1}월 ${endDate.getDate()}일`;
                } else {
                    periodText.textContent = `전체 시즌: 2025년 3월 22일 개막 ~ 현재`;
                }
            } else {
                periodText.textContent = `전체 시즌: 2025년 3월 22일 개막 ~ 현재`;
            }
            periodText.style.visibility = 'visible';
        } else if (period) {
            periodText.textContent = `현재 보는 기간: ${period.title}`;
            periodText.style.visibility = 'visible';
        }
    }
    
    // 버튼 상태 업데이트
    const prevBtn = document.getElementById('prevPeriod');
    const nextBtn = document.getElementById('nextPeriod');
    const toggleBtn = document.getElementById('periodToggle');
    const chartNav = document.getElementById('rank-chart-nav');
    
    if (prevBtn) {
        prevBtn.disabled = chartState.isFullView || chartState.currentPeriod === 0;
        prevBtn.style.opacity = prevBtn.disabled ? '0.5' : '1';
        
        // 전체시즌 모드이거나 첫 번째 월인 경우 버튼 숨김
        if (chartState.isFullView || chartState.currentPeriod === 0) {
            prevBtn.style.display = 'none';
        } else {
            prevBtn.style.display = 'inline-block';
            // 이전월 버튼 텍스트 업데이트
            const prevPeriod = chartState.periods[chartState.currentPeriod - 1];
            prevBtn.textContent = `← ${prevPeriod.title}`;
        }
    }
    
    if (nextBtn) {
        nextBtn.disabled = chartState.isFullView || chartState.currentPeriod === chartState.periods.length - 1;
        nextBtn.style.opacity = nextBtn.disabled ? '0.5' : '1';
        
        // 전체시즌 모드이거나 마지막 월인 경우 버튼 숨김
        if (chartState.isFullView || chartState.currentPeriod === chartState.periods.length - 1) {
            nextBtn.style.display = 'none';
        } else {
            nextBtn.style.display = 'inline-block';
            // 다음월 버튼 텍스트 업데이트
            const nextPeriod = chartState.periods[chartState.currentPeriod + 1];
            nextBtn.textContent = `${nextPeriod.title} →`;
        }
    }
    
    // 네비게이션 컨테이너는 항상 space-between 유지 (플레이스홀더 div가 정렬 처리)
    
    if (toggleBtn) {
        toggleBtn.textContent = chartState.isFullView ? '📅 월별 보기' : '📊 전체 시즌 보기';
    }
    
}

// 초기화
async function initSimpleChart() {
    
    try {
        // 팀 로고 로드
        await loadTeamLogos();
        
        // 실제 KBO 데이터 로드
        chartState.periods = await loadRealKBOData();
        chartState.currentPeriod = chartState.periods.length - 1; // 최근 기간
        chartState.isFullView = true;
        
        updateSimpleChart();
        
    } catch (error) {
        // 차트 초기화 실패 시 조용히 처리
    }
}

// 전역 함수들
function handlePrevPeriod() {
    if (!chartState.isFullView && chartState.currentPeriod > 0) {
        chartState.currentPeriod--;
        updateSimpleChart();
    }
}

function handleNextPeriod() {
    if (!chartState.isFullView && chartState.currentPeriod < chartState.periods.length - 1) {
        chartState.currentPeriod++;
        updateSimpleChart();
    }
}

function handlePeriodToggle() {
    chartState.isFullView = !chartState.isFullView;
    updateSimpleChart();
}

// 진행 인디케이터 업데이트 함수
function updateProgressIndicator() {
    const container = document.getElementById('progressDots');
    if (!container) return;

    if (chartState.isFullView) {
        // 전체 시즌 모드에서는 진행 인디케이터 숨김
        container.innerHTML = '';
        return;
    }

    // 월별 모드에서 진행 인디케이터 표시
    let html = '';
    for (let i = 0; i < chartState.periods.length; i++) {
        const isActive = i === chartState.currentPeriod;
        html += `<div style="
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: ${isActive ? '#28a745' : '#dee2e6'};
            transition: all 0.3s ease;
        "></div>`;
    }
    container.innerHTML = html;
}

// Chart.js 지연 로딩 및 대기 함수
async function waitForChart(maxAttempts = 10, interval = 500) {
    // 지연 로딩 먼저 시도
    if (typeof window.loadChartJs === 'function') {
        await window.loadChartJs();
    }
    
    return new Promise((resolve, reject) => {
        let attempts = 0;
        
        const checkChart = () => {
            attempts++;
            
            if (typeof Chart !== 'undefined') {
                resolve();
                return;
            }
            
            if (attempts >= maxAttempts) {
                reject(new Error('Chart.js 라이브러리가 로드되지 않았습니다.'));
                return;
            }
            
            setTimeout(checkChart, interval);
        };
        
        checkChart();
    });
}

// DOM 로드 후 초기화
document.addEventListener('DOMContentLoaded', async function() {
    
    // 캔버스 요소 확인
    const canvas = document.getElementById('rankChart');
    if (!canvas) {
        // rankChart 캔버스 요소를 찾을 수 없음
        return;
    }
    
    try {
        // Chart.js 로딩 대기
        await waitForChart();
        
        // 차트 초기화 실행
        await initSimpleChart();
        
    } catch (error) {
        // 초기화 실패 시 조용히 처리
        // 사용자에게 친화적인 오류 메시지 표시
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; margin: 10px; border-radius: 5px; text-align: center;">
                <strong>차트 로딩 실패</strong><br>
                네트워크 연결을 확인하고 페이지를 새로고침해 주세요.
                <br><small>오류: ${error.message}</small>
            </div>
        `;
        
        // 차트 컨테이너에 오류 메시지 표시
        const chartContainer = canvas.parentElement;
        if (chartContainer) {
            chartContainer.appendChild(errorDiv);
        }
    }
});