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
            // 일별 데이터 파일 목록
            const dates = [
                '2025-08-06', '2025-08-07', '2025-08-08', '2025-08-09', '2025-08-10',
                '2025-08-12', '2025-08-13', '2025-08-14', '2025-08-15', '2025-08-16', '2025-08-17'
            ];
            
            const allData = [];
            
            // 각 날짜별 데이터 로드
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
            
            // 현재 데이터 추가 (오늘)
            if (window.currentKBOData && window.currentKBOData.standings) {
                allData.push({
                    date: new Date().toISOString().split('T')[0],
                    standings: window.currentKBOData.standings
                });
            }
            
            return processRankingData(allData);
        } catch (error) {
            console.error('Failed to load ranking history:', error);
            return null;
        }
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
                        text: 'KBO 팀 순위 변동 추이',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            boxWidth: 15,
                            padding: 10,
                            font: {
                                size: 11
                            }
                        }
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
        
        return chart;
    }

    // 초기화 함수
    window.initRankChart = async function() {
        const chartData = await loadRankingHistory();
        if (chartData) {
            createRankChart(chartData);
        }
    };
})();