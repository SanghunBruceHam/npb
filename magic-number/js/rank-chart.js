// KBO 순위 변동 그래프
(function() {
    // 팀 색상 정의
    const teamColors = {
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

    // 순위 데이터 로드 및 처리
    async function loadRankingHistory() {
        try {
            // 전체 시즌 데이터 로드 시도
            const gameDataResponse = await fetch('data/game-by-game-records.json');
            
            if (gameDataResponse.ok) {
                const gameData = await gameDataResponse.json();
                const generator = new window.SeasonRankGenerator(gameData);
                const seasonData = generator.generateSeasonRankings();
                
                if (seasonData && seasonData.length > 0) {
                    console.log(`전체 시즌 데이터 로드 성공: ${seasonData.length}일간 데이터`);
                    return generator.formatForChart(seasonData);
                }
            }
            
            // 대체 데이터: 기존 8월 데이터 사용
            console.warn('전체 시즌 데이터 로드 실패, 8월 데이터 사용');
            return await loadAugustData();
            
        } catch (error) {
            console.error('순위 데이터 로드 실패:', error);
            return await loadAugustData();
        }
    }
    
    // 8월 데이터 대체 로드
    async function loadAugustData() {
        const dates = [
            '2025-08-06', '2025-08-07', '2025-08-08', '2025-08-09', '2025-08-10',
            '2025-08-12', '2025-08-13', '2025-08-14', '2025-08-15', '2025-08-16', '2025-08-17'
        ];
        
        const allData = [];
        
        for (const date of dates) {
            try {
                const response = await fetch(`history/daily/${date}.json`);
                if (response.ok) {
                    const data = await response.json();
                    allData.push({
                        date: date,
                        standings: data.snapshot.standings
                    });
                }
            } catch (err) {
                console.warn(`Failed to load ${date}:`, err);
            }
        }
        
        if (window.currentKBOData && window.currentKBOData.standings) {
            allData.push({
                date: new Date().toISOString().split('T')[0],
                standings: window.currentKBOData.standings
            });
        }
        
        return processRankingData(allData);
    }

    // 순위 데이터 처리
    function processRankingData(allData) {
        const teams = Object.keys(teamColors);
        const chartData = {
            labels: [],
            datasets: []
        };
        
        // 날짜 라벨 생성
        chartData.labels = allData.map(d => {
            const [year, month, day] = d.date.split('-');
            return `${parseInt(month)}/${parseInt(day)}`;
        });
        
        // 각 팀별 데이터셋 생성
        teams.forEach(teamName => {
            const rankHistory = [];
            
            allData.forEach(dayData => {
                const teamData = dayData.standings.find(s => s.team === teamName);
                rankHistory.push(teamData ? teamData.rank : null);
            });
            
            chartData.datasets.push({
                label: teamName,
                data: rankHistory,
                borderColor: teamColors[teamName],
                backgroundColor: teamColors[teamName] + '20',
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                tension: 0.1,
                fill: false
            });
        });
        
        return chartData;
    }

    // 차트 생성
    function createRankChart(chartData) {
        const ctx = document.getElementById('rankChart').getContext('2d');
        
        const chart = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'KBO 팀 순위 변동 추이 (3월 22일~현재)',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        display: false // 커스텀 범례 사용
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y}위`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        reverse: true,
                        min: 0.5,
                        max: 10.5,
                        ticks: {
                            stepSize: 1,
                            callback: function(value) {
                                if (Number.isInteger(value) && value >= 1 && value <= 10) {
                                    return value + '위';
                                }
                                return '';
                            }
                        },
                        grid: {
                            color: function(context) {
                                if (context.tick.value === 5.5) {
                                    return 'rgba(255, 0, 0, 0.3)'; // 5위 경계선 (플레이오프)
                                }
                                return 'rgba(0, 0, 0, 0.1)';
                            },
                            lineWidth: function(context) {
                                if (context.tick.value === 5.5) {
                                    return 2;
                                }
                                return 1;
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
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
        createBasicCustomLegend(chart);
        
        return chart;
    }

    // 기본 차트용 커스텀 범례 생성
    function createBasicCustomLegend(chart) {
        const existingLegend = document.getElementById('basic-custom-legend');
        if (existingLegend) {
            existingLegend.remove();
        }

        const teamLogos = {
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

        const chartContainer = document.querySelector('#rankChart').parentElement;
        const legendContainer = document.createElement('div');
        legendContainer.id = 'basic-custom-legend';
        legendContainer.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            align-items: center;
            gap: 12px;
            margin-top: 5px;
            margin-bottom: 40px;
            padding: 0;
            background: none;
            border: none;
            position: relative;
            z-index: 10;
        `;

        // 현재 순위대로 정렬된 팀 목록 가져오기
        const sortedTeams = getSortedTeamsByRank(chart);
        
        sortedTeams.forEach(({ teamName, datasetIndex }) => {
            const dataset = chart.data.datasets[datasetIndex];
            const legendItem = document.createElement('div');
            legendItem.style.cssText = `
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px 8px;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
                background: rgba(255,255,255,0.9);
                border: 1px solid rgba(0,0,0,0.1);
                font-weight: 600;
                font-size: 13px;
                white-space: nowrap;
                flex-shrink: 0;
                box-shadow: 0 2px 4px rgba(0,0,0,0.08);
            `;
            
            // 팀 로고 이미지
            const logoImg = document.createElement('img');
            logoImg.src = `../images/${teamLogos[teamName] || 'default.png'}`;
            logoImg.alt = teamName;
            logoImg.style.cssText = `
                width: 20px;
                height: 20px;
                object-fit: contain;
                border-radius: 2px;
            `;
            
            // 색상 인디케이터
            const colorBox = document.createElement('div');
            colorBox.style.cssText = `
                width: 12px;
                height: 12px;
                background-color: ${dataset.borderColor};
                border-radius: 50%;
                border: 2px solid white;
                box-shadow: 0 0 0 1px rgba(0,0,0,0.1);
            `;
            
            // 팀명 텍스트
            const teamText = document.createElement('span');
            teamText.textContent = teamName;
            teamText.style.cssText = `
                color: #333;
                font-weight: 600;
            `;
            
            legendItem.appendChild(logoImg);
            legendItem.appendChild(colorBox);
            legendItem.appendChild(teamText);
            
            // 클릭 이벤트로 데이터셋 토글
            legendItem.addEventListener('click', () => {
                const meta = chart.getDatasetMeta(datasetIndex);
                meta.hidden = !meta.hidden;
                chart.update();
                
                // 시각적 피드백
                legendItem.style.opacity = meta.hidden ? '0.3' : '1';
                colorBox.style.opacity = meta.hidden ? '0.3' : '1';
                logoImg.style.opacity = meta.hidden ? '0.3' : '1';
            });
            
            // 호버 효과
            legendItem.addEventListener('mouseenter', () => {
                legendItem.style.backgroundColor = 'rgba(255,255,255,1)';
                legendItem.style.borderColor = dataset.borderColor;
                legendItem.style.transform = 'translateY(-2px)';
                legendItem.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
            });
            
            legendItem.addEventListener('mouseleave', () => {
                legendItem.style.backgroundColor = 'rgba(255,255,255,0.9)';
                legendItem.style.borderColor = 'rgba(0,0,0,0.1)';
                legendItem.style.transform = 'translateY(0)';
                legendItem.style.boxShadow = '0 2px 4px rgba(0,0,0,0.08)';
            });
            
            legendContainer.appendChild(legendItem);
        });
        
        chartContainer.appendChild(legendContainer);
    }

    // 순위대로 팀 정렬 (기본 차트용)
    function getSortedTeamsByRank(chart) {
        try {
            // 전역 현재 순위 데이터에서 가져오기
            if (window.currentKBOData && window.currentKBOData.standings) {
                const sortedStandings = [...window.currentKBOData.standings].sort((a, b) => a.rank - b.rank);
                const sortedTeams = [];
                
                sortedStandings.forEach(standing => {
                    const teamName = standing.team;
                    const datasetIndex = chart.data.datasets.findIndex(ds => ds.label === teamName);
                    if (datasetIndex !== -1) {
                        sortedTeams.push({ teamName, datasetIndex });
                    }
                });
                
                return sortedTeams;
            }
        } catch (error) {
            console.warn('기본 차트 순위 정렬 실패, 기본 순서 사용:', error);
        }
        
        // 기본 순서로 대체
        return chart.data.datasets.map((dataset, index) => ({
            teamName: dataset.label,
            datasetIndex: index
        }));
    }

    // 초기화 함수 - 스크롤 가능한 차트로 대체
    window.initRankChart = async function() {
        try {
            // 먼저 periodInfo 요소를 "데이터 로드 중..."으로 설정
            const periodInfoElement = document.getElementById('periodInfo');
            if (periodInfoElement) {
                periodInfoElement.textContent = '데이터 로드 중...';
            }

            // SeasonRankGenerator가 로드되었는지 확인
            if (!window.SeasonRankGenerator) {
                console.warn('SeasonRankGenerator 미로드');
                throw new Error('SeasonRankGenerator not loaded');
            }

            if (window.scrollableChart) {
                console.log('스크롤 차트 초기화 시작');
                const success = await window.scrollableChart.initialize();
                if (!success) {
                    throw new Error('스크롤 차트 초기화 실패');
                }
                console.log('스크롤 차트 초기화 성공');
            } else {
                console.error('scrollableChart 인스턴스 없음');
                throw new Error('scrollableChart 인스턴스 없음');
            }
        } catch (error) {
            console.error('차트 초기화 오류:', error);
            
            // 오류 시 대체 방안: 기존 방식 사용
            try {
                const chartData = await loadRankingHistory();
                if (chartData && chartData.datasets && chartData.datasets.length > 0) {
                    console.log('대체 차트 생성 성공');
                    createRankChart(chartData);
                    
                    // UI 업데이트
                    const periodInfoElement = document.getElementById('periodInfo');
                    if (periodInfoElement) {
                        periodInfoElement.textContent = '8월 순위 변동';
                    }
                    
                    // 기본 차트의 경우 간단한 토글 기능만 추가
                    setTimeout(() => {
                        const toggleBtn = document.getElementById('periodToggle');
                        if (toggleBtn) {
                            console.log('기본 차트: 토글 버튼 이벤트 추가');
                            toggleBtn.addEventListener('click', () => {
                                console.log('기본 차트: 토글 버튼 클릭됨');
                            });
                        }
                    }, 100);
                } else {
                    throw new Error('차트 데이터 없음');
                }
            } catch (fallbackError) {
                console.error('대체 차트도 실패:', fallbackError);
                
                // 최종 실패 처리
                const periodInfoElement = document.getElementById('periodInfo');
                if (periodInfoElement) {
                    periodInfoElement.textContent = '데이터 로드 실패';
                }
                
                // 버튼 비활성화
                const prevBtn = document.getElementById('prevPeriod');
                const nextBtn = document.getElementById('nextPeriod');
                if (prevBtn) prevBtn.disabled = true;
                if (nextBtn) nextBtn.disabled = true;
            }
        }
    };
})();

// HTML onclick 이벤트 핸들러 함수들 (전역 스코프)
function handlePrevPeriod() {
    console.log('handlePrevPeriod 호출됨');
    if (window.scrollableChart) {
        if (!window.scrollableChart.isFullSeasonView && window.scrollableChart.currentPeriod > 0) {
            window.scrollableChart.currentPeriod--;
            window.scrollableChart.updateChart(window.scrollableChart.currentPeriod);
            console.log('이전 기간으로 이동:', window.scrollableChart.currentPeriod);
        } else {
            console.log('이전 기간으로 이동 불가 - 전체시즌모드이거나 첫번째 기간');
        }
    } else {
        console.error('scrollableChart 인스턴스 없음');
    }
}

function handleNextPeriod() {
    console.log('handleNextPeriod 호출됨');
    if (window.scrollableChart) {
        if (!window.scrollableChart.isFullSeasonView && window.scrollableChart.currentPeriod < window.scrollableChart.periodsData.length - 1) {
            window.scrollableChart.currentPeriod++;
            window.scrollableChart.updateChart(window.scrollableChart.currentPeriod);
            console.log('다음 기간으로 이동:', window.scrollableChart.currentPeriod);
        } else {
            console.log('다음 기간으로 이동 불가 - 전체시즌모드이거나 마지막 기간');
        }
    } else {
        console.error('scrollableChart 인스턴스 없음');
    }
}

function handlePeriodToggle() {
    console.log('handlePeriodToggle 호출됨');
    if (window.scrollableChart) {
        window.scrollableChart.toggleFullSeasonView();
        console.log('기간 토글 완료, 현재 모드:', window.scrollableChart.isFullSeasonView ? '전체시즌' : '30일단위');
    } else {
        console.error('scrollableChart 인스턴스 없음');
    }
}