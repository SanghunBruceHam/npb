// 스크롤 가능한 30일 단위 순위 그래프
class ScrollableRankChart {
    constructor() {
        this.fullSeasonData = null;
        this.currentPeriod = 0;
        this.periodsData = [];
        this.chart = null;
        this.isFullSeasonView = false;
        this.teamColors = {
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
        
        this.teamLogos = {
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
    }

    // 전체 시즌 데이터를 30일 단위로 분할
    splitIntoPeriodsIntel(seasonData) {
        if (!seasonData || seasonData.length === 0) return [];
        
        const periods = [];
        const daysPerPeriod = 30;
        
        // 전체 데이터를 30일씩 나누기
        for (let i = 0; i < seasonData.length; i += daysPerPeriod) {
            const periodData = seasonData.slice(i, i + daysPerPeriod);
            
            if (periodData.length > 0) {
                const startDate = periodData[0].date;
                const endDate = periodData[periodData.length - 1].date;
                
                periods.push({
                    startDate: startDate,
                    endDate: endDate,
                    data: periodData,
                    title: this.getPeriodTitle(startDate, endDate)
                });
            }
        }
        
        return periods;
    }

    // 기간 제목 생성 (예: "3월 22일 - 4월 20일")
    getPeriodTitle(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        const startStr = `${start.getMonth() + 1}월 ${start.getDate()}일`;
        const endStr = `${end.getMonth() + 1}월 ${end.getDate()}일`;
        
        return `${startStr} - ${endStr}`;
    }

    // Chart.js용 데이터 포맷 변환 (특정 기간)
    formatPeriodForChart(periodData) {
        const chartData = {
            labels: [],
            datasets: []
        };
        
        // 날짜 라벨 생성
        chartData.labels = periodData.map(day => {
            const [year, month, dayNum] = day.date.split('-');
            return `${parseInt(month)}/${parseInt(dayNum)}`;
        });
        
        // 각 팀별 순위 데이터 생성
        const teams = Object.keys(this.teamColors);
        
        for (const teamName of teams) {
            const rankHistory = [];
            
            periodData.forEach(day => {
                const teamData = day.standings.find(s => s.team === teamName);
                rankHistory.push(teamData ? teamData.rank : null);
            });
            
            chartData.datasets.push({
                label: teamName,
                data: rankHistory,
                borderColor: this.teamColors[teamName],
                backgroundColor: this.teamColors[teamName] + '20',
                borderWidth: 2,
                pointRadius: 1.5,
                pointHoverRadius: 4,
                tension: 0.1,
                fill: false
            });
        }
        
        return chartData;
    }

    // 새 차트 생성
    createChart(chartData) {
        if (this.chart) {
            this.chart.destroy();
        }
        
        const ctx = document.getElementById('rankChart').getContext('2d');
        
        this.chart = new Chart(ctx, {
                type: 'line',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: false // UI에서 따로 표시
                        },
                        legend: {
                            display: false // 커스텀 범례 사용
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                title: function(tooltipItems) {
                                    const item = tooltipItems[0];
                                    const period = window.scrollableChart.periodsData[window.scrollableChart.currentPeriod];
                                    const dateData = period.data[item.dataIndex];
                                    return dateData ? dateData.date : '';
                                },
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
                                        return 'rgba(255, 0, 0, 0.3)';
                                    }
                                    return 'rgba(0, 0, 0, 0.1)';
                                },
                                lineWidth: function(context) {
                                    return context.tick.value === 5.5 ? 2 : 1;
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
        }
        
    }

    // 차트 업데이트 (기간별)
    updateChart(periodIndex) {
        if (!this.periodsData[periodIndex]) return;
        
        const period = this.periodsData[periodIndex];
        const chartData = this.formatPeriodForChart(period.data);
        
        if (this.chart) {
            // 기존 차트 업데이트
            this.chart.data = chartData;
            this.chart.update('active');
        } else {
            // 차트가 없으면 새로 생성
            this.createChart(chartData);
        }
        
        // UI 업데이트
        this.updateUI(periodIndex);
        
        // 커스텀 범례 생성
        this.createCustomLegend();
    }

    // UI 요소 업데이트
    updateUI(periodIndex) {
        const period = this.periodsData[periodIndex];
        
        // 현재 기간 텍스트 업데이트 (30일 단위 모드에서)
        if (!this.isFullSeasonView) {
            const periodText = document.getElementById('currentPeriodText');
            if (periodText && period && period.title) {
                periodText.textContent = `현재 보는 기간: ${period.title}`;
            }
        }
        
        // 버튼 상태 업데이트
        const prevBtn = document.getElementById('prevPeriod');
        const nextBtn = document.getElementById('nextPeriod');
        
        prevBtn.disabled = periodIndex === 0;
        nextBtn.disabled = periodIndex === this.periodsData.length - 1;
        
        prevBtn.style.opacity = prevBtn.disabled ? '0.5' : '1';
        nextBtn.style.opacity = nextBtn.disabled ? '0.5' : '1';
        
        // 진행 도트 업데이트
        this.updateProgressDots(periodIndex);
    }

    // 진행 인디케이터 업데이트
    updateProgressDots(currentIndex) {
        const container = document.getElementById('progressDots');
        container.innerHTML = '';
        
        // 최대 8개 도트만 표시 (너무 많으면 복잡)
        const maxDots = Math.min(8, this.periodsData.length);
        const step = Math.max(1, Math.floor(this.periodsData.length / maxDots));
        
        for (let i = 0; i < this.periodsData.length; i += step) {
            const dot = document.createElement('div');
            dot.style.cssText = `
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background-color: ${i === currentIndex ? '#4CAF50' : '#ddd'};
                cursor: pointer;
                transition: all 0.3s ease;
            `;
            
            dot.addEventListener('click', () => {
                this.currentPeriod = i;
                this.updateChart(i);
            });
            
            container.appendChild(dot);
        }
    }

    // 커스텀 범례 생성
    createCustomLegend() {
        const existingLegend = document.getElementById('custom-legend');
        if (existingLegend) {
            existingLegend.remove();
        }

        const chartContainer = document.querySelector('#rankChart').parentElement;
        const legendContainer = document.createElement('div');
        legendContainer.id = 'custom-legend';
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

        // 현재 순위대로 팀 정렬
        const teams = this.getTeamsByCurrentRank();
        
        teams.forEach((teamName) => {
            // 차트에서 해당 팀의 데이터셋 인덱스 찾기
            const datasetIndex = this.chart ? this.chart.data.datasets.findIndex(ds => ds.label === teamName) : -1;
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
            logoImg.src = `../images/${this.getTeamLogoFileName(teamName)}`;
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
                background-color: ${this.teamColors[teamName]};
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
                if (this.chart && datasetIndex !== -1) {
                    const meta = this.chart.getDatasetMeta(datasetIndex);
                    meta.hidden = !meta.hidden;
                    this.chart.update();
                    
                    // 시각적 피드백
                    legendItem.style.opacity = meta.hidden ? '0.3' : '1';
                    colorBox.style.opacity = meta.hidden ? '0.3' : '1';
                    logoImg.style.opacity = meta.hidden ? '0.3' : '1';
                }
            });
            
            // 호버 효과
            legendItem.addEventListener('mouseenter', () => {
                legendItem.style.backgroundColor = 'rgba(255,255,255,1)';
                legendItem.style.borderColor = this.teamColors[teamName];
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

    // 전체 시즌 보기 토글
    toggleFullSeasonView() {
        console.log('토글 시작, 이전 모드:', this.isFullSeasonView ? '전체시즌' : '30일단위');
        this.isFullSeasonView = !this.isFullSeasonView;
        console.log('토글 후 모드:', this.isFullSeasonView ? '전체시즌' : '30일단위');
        
        if (this.isFullSeasonView) {
            // 전체 시즌 데이터 표시
            console.log('전체 시즌 차트 표시');
            this.showFullSeasonChart();
        } else {
            // 기간별 보기로 복귀
            console.log('30일 단위 차트 표시, 현재 기간:', this.currentPeriod);
            this.updateChart(this.currentPeriod);
        }
        
        console.log('네비게이션 UI 업데이트');
        this.updateNavigationUI();
    }

    // 전체 시즌 차트 표시
    showFullSeasonChart() {
        if (!this.fullSeasonData) return;
        
        const chartData = this.formatPeriodForChart(this.fullSeasonData);
        
        if (this.chart) {
            this.chart.data = chartData;
            this.chart.update('active');
        } else {
            // 차트가 없으면 새로 생성
            this.createChart(chartData);
        }
        
        // 커스텀 범례 생성
        this.createCustomLegend();
    }

    // 내비게이션 UI 업데이트
    updateNavigationUI() {
        const prevBtn = document.getElementById('prevPeriod');
        const nextBtn = document.getElementById('nextPeriod');
        const toggleBtn = document.getElementById('periodToggle');
        const progressDots = document.getElementById('progressDots');
        const periodText = document.getElementById('currentPeriodText');
        
        if (this.isFullSeasonView) {
            // 전체 시즌 모드 → 30일 단위로 전환 가능
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            prevBtn.style.opacity = '0.3';
            nextBtn.style.opacity = '0.3';
            
            if (toggleBtn) {
                toggleBtn.style.background = 'linear-gradient(135deg, #28a745, #34ce57)';
                toggleBtn.textContent = '📅 30일 단위로 보기';
            }
            
            progressDots.style.display = 'none';
            
            // 기간 표시 숨기기
            if (periodText) {
                periodText.style.display = 'none';
            }
        } else {
            // 30일 단위 모드 → 전체 시즌으로 전환 가능
            prevBtn.disabled = this.currentPeriod === 0;
            nextBtn.disabled = this.currentPeriod === this.periodsData.length - 1;
            prevBtn.style.opacity = prevBtn.disabled ? '0.5' : '1';
            nextBtn.style.opacity = nextBtn.disabled ? '0.5' : '1';
            
            if (toggleBtn) {
                const dayCount = this.fullSeasonData ? this.fullSeasonData.length : 0;
                toggleBtn.style.background = 'linear-gradient(135deg, #FF6B35, #FF8A50)';
                toggleBtn.textContent = `📊 전체 시즌 보기 (${dayCount}일간)`;
            }
            
            progressDots.style.display = 'flex';
            
            // 현재 기간 표시
            const currentPeriodData = this.periodsData[this.currentPeriod];
            if (periodText && currentPeriodData) {
                periodText.style.display = 'block';
                periodText.textContent = `현재 보는 기간: ${currentPeriodData.title}`;
            }
        }
    }

    // 현재 순위대로 팀 정렬
    getTeamsByCurrentRank() {
        try {
            // 현재 기간의 마지막 날짜 데이터에서 순위 정보 가져오기
            const currentPeriod = this.periodsData[this.currentPeriod];
            if (currentPeriod && currentPeriod.data && currentPeriod.data.length > 0) {
                const lastDayData = currentPeriod.data[currentPeriod.data.length - 1];
                if (lastDayData && lastDayData.standings) {
                    // 순위대로 정렬
                    const sortedStandings = [...lastDayData.standings].sort((a, b) => a.rank - b.rank);
                    return sortedStandings.map(team => team.team);
                }
            }
            
            // 전역 현재 순위 데이터에서 가져오기 (대체 방안)
            if (window.currentKBOData && window.currentKBOData.standings) {
                const sortedStandings = [...window.currentKBOData.standings].sort((a, b) => a.rank - b.rank);
                return sortedStandings.map(team => team.team);
            }
        } catch (error) {
            console.warn('순위 정렬 실패, 기본 순서 사용:', error);
        }
        
        // 기본 순서로 대체
        return Object.keys(this.teamColors);
    }

    // 이벤트 리스너 설정 (재시도 로직 추가)
    setupEventListeners(retryCount = 0) {
        console.log('이벤트 리스너 설정 시작, 시도 횟수:', retryCount + 1);
        
        const prevBtn = document.getElementById('prevPeriod');
        const nextBtn = document.getElementById('nextPeriod');
        const toggleBtn = document.getElementById('periodToggle');
        
        console.log('버튼 요소들:', { prevBtn, nextBtn, toggleBtn });
        
        // 버튼들이 아직 로드되지 않은 경우 재시도
        if ((!prevBtn || !nextBtn || !toggleBtn) && retryCount < 5) {
            console.log('버튼들이 아직 로드되지 않음, 500ms 후 재시도');
            setTimeout(() => {
                this.setupEventListeners(retryCount + 1);
            }, 500);
            return;
        }
        
        // 기존 이벤트 리스너 제거 (중복 방지)
        if (prevBtn) {
            prevBtn.replaceWith(prevBtn.cloneNode(true));
        }
        if (nextBtn) {
            nextBtn.replaceWith(nextBtn.cloneNode(true));
        }
        if (toggleBtn) {
            toggleBtn.replaceWith(toggleBtn.cloneNode(true));
        }
        
        // 새로운 참조 가져오기
        const newPrevBtn = document.getElementById('prevPeriod');
        const newNextBtn = document.getElementById('nextPeriod');
        const newToggleBtn = document.getElementById('periodToggle');
        
        if (newPrevBtn) {
            newPrevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('이전 버튼 클릭, 현재 모드:', this.isFullSeasonView ? '전체시즌' : '30일단위');
                if (!this.isFullSeasonView && this.currentPeriod > 0) {
                    this.currentPeriod--;
                    this.updateChart(this.currentPeriod);
                }
            });
            console.log('이전 버튼 이벤트 리스너 설정 완료');
        } else {
            console.error('prevPeriod 버튼을 찾을 수 없습니다');
        }

        if (newNextBtn) {
            newNextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('다음 버튼 클릭, 현재 모드:', this.isFullSeasonView ? '전체시즌' : '30일단위');
                if (!this.isFullSeasonView && this.currentPeriod < this.periodsData.length - 1) {
                    this.currentPeriod++;
                    this.updateChart(this.currentPeriod);
                }
            });
            console.log('다음 버튼 이벤트 리스너 설정 완료');
        } else {
            console.error('nextPeriod 버튼을 찾을 수 없습니다');
        }

        // 기간 토글 버튼 (전체 시즌 ↔ 30일 단위)
        if (newToggleBtn) {
            newToggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('토글 버튼 클릭, 현재 모드:', this.isFullSeasonView ? '전체시즌' : '30일단위');
                this.toggleFullSeasonView();
            });
            console.log('토글 버튼 이벤트 리스너 설정 완료');
        } else {
            console.error('periodToggle 버튼을 찾을 수 없습니다');
        }
        
        // 키보드 네비게이션
        document.addEventListener('keydown', (e) => {
            if (e.target.closest('#rank-chart-section') && !this.isFullSeasonView) {
                if (e.key === 'ArrowLeft' && this.currentPeriod > 0) {
                    this.currentPeriod--;
                    this.updateChart(this.currentPeriod);
                } else if (e.key === 'ArrowRight' && this.currentPeriod < this.periodsData.length - 1) {
                    this.currentPeriod++;
                    this.updateChart(this.currentPeriod);
                }
            }
        });
        
        console.log('모든 이벤트 리스너 설정 완료');
    }

    // 초기화
    async initialize() {
        try {
            // 전체 시즌 데이터 로드
            const gameDataResponse = await fetch('data/game-by-game-records.json');
            
            if (gameDataResponse.ok) {
                const gameData = await gameDataResponse.json();
                const generator = new window.SeasonRankGenerator(gameData);
                this.fullSeasonData = generator.generateSeasonRankings();
                
                if (this.fullSeasonData && this.fullSeasonData.length > 0) {
                    console.log(`전체 시즌 데이터 로드 성공: ${this.fullSeasonData.length}일간 데이터`);
                    
                    // 30일 단위로 분할
                    this.periodsData = this.splitIntoPeriodsIntel(this.fullSeasonData);
                    console.log(`${this.periodsData.length}개 기간으로 분할 완료`);
                    
                    // 가장 최근 기간부터 시작
                    this.currentPeriod = this.periodsData.length - 1;
                    
                    // 30일 단위 모드로 시작 (초기에는 가장 최근 기간 표시)
                    console.log('30일 단위 차트 생성 시작, 기간:', this.currentPeriod);
                    this.updateChart(this.currentPeriod);
                    console.log('30일 단위 차트 생성 완료');
                    
                    // 커스텀 범례 생성
                    this.createCustomLegend();
                    console.log('커스텀 범례 생성 완료');
                    
                    // 이벤트 리스너 설정 (DOM 요소들이 모두 준비된 후)
                    setTimeout(() => {
                        this.setupEventListeners();
                    }, 1000);
                    
                    return true;
                }
            }
            
            console.error('시즌 데이터 로드 실패');
            // 로딩 실패 시 UI 업데이트
            const periodInfoElement = document.getElementById('periodInfo');
            if (periodInfoElement) {
                periodInfoElement.textContent = '데이터 로드 실패';
            }
            return false;
            
        } catch (error) {
            console.error('스크롤 차트 초기화 실패:', error);
            // 오류 시 UI 업데이트
            const periodInfoElement = document.getElementById('periodInfo');
            if (periodInfoElement) {
                periodInfoElement.textContent = '초기화 실패';
            }
            return false;
        }
    }

    // 팀 로고 파일명 반환
    getTeamLogoFileName(teamName) {
        return this.teamLogos[teamName] || 'default.png';
    }
}

// 전역 인스턴스
window.scrollableChart = new ScrollableRankChart();