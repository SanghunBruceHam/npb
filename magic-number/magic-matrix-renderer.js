/**
 * KBO 매직넘버 매트릭스 렌더러
 * 나무위키 스타일 매직넘버 차트 렌더링
 */

class NamuwikiMagicChart {
    constructor() {
        this.data = null;
        this.tableElement = null;
    }

    // 데이터 로드
    async loadData() {
        try {
            const response = await fetch(`./namuwiki-data.json?v=${Date.now()}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            this.data = await response.json();
            console.log('✅ 매직넘버 매트릭스 데이터 로드 완료:', this.data.teams[0].name, '1위');
        } catch (error) {
            console.error('❌ 매직넘버 매트릭스 데이터 로드 실패:', error);
            throw error;
        }
    }

    // 메인 렌더링 함수
    async render(containerId = 'namuwiki-magic-table') {
        try {
            await this.loadData();
            
            this.tableElement = document.getElementById(containerId);
            if (!this.tableElement) {
                throw new Error(`컨테이너 ${containerId}를 찾을 수 없습니다`);
            }

            this.renderTable();
            this.updateTimestamp();
            console.log('✅ 매직넘버 매트릭스 렌더링 완료');
        } catch (error) {
            console.error('❌ 매직넘버 매트릭스 렌더링 실패:', error);
            this.renderError(error.message);
        }
    }

    // 테이블 렌더링
    renderTable() {
        // 테이블 초기화
        this.tableElement.innerHTML = '';
        
        // 헤더 생성
        const thead = this.createHeader();
        this.tableElement.appendChild(thead);
        
        // 본문 생성
        const tbody = this.createBody();
        this.tableElement.appendChild(tbody);
    }

    // 헤더 생성
    createHeader() {
        const thead = document.createElement('thead');
        
        // 첫 번째 행: 구단 + "도달 순위" 라벨
        const headerRow = document.createElement('tr');
        
        // 구단 헤더 (2행 병합)
        const teamHeader = document.createElement('th');
        teamHeader.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                <span style="font-size: 0.9rem; font-weight: 600;">구단명</span>
            </div>
        `;
        teamHeader.style.cssText = `
            width: 120px;
            text-align: center;
            vertical-align: middle;
            background: var(--primary-color, #1e40af);
            color: white;
            padding: 12px 8px;
            border: 1px solid #ddd;
        `;
        teamHeader.rowSpan = 2;
        headerRow.appendChild(teamHeader);

        // "도달 순위" 라벨 헤더
        const rankLabelHeader = document.createElement('th');
        rankLabelHeader.innerHTML = '<span style="font-size: 0.85rem; font-weight: 500;">도달 순위</span>';
        rankLabelHeader.colSpan = 9;
        rankLabelHeader.style.cssText = `
            text-align: center;
            background: var(--secondary-color, #6b7280);
            color: white;
            padding: 8px;
            border: 1px solid #ddd;
        `;
        headerRow.appendChild(rankLabelHeader);
        
        thead.appendChild(headerRow);
        
        // 두 번째 행: 실제 순위 번호들 (9위부터 1위까지)
        const rankNumberRow = document.createElement('tr');
        for (let rank = 9; rank >= 1; rank--) {
            const rankHeader = document.createElement('th');
            rankHeader.textContent = rank + '위';
            
            // KBO 플레이오프 기준 색상 적용
            let headerBgColor = '#6b7280'; // 6위 이하 회색 (탈락)
            let textColor = 'white';
            
            if (rank === 1) {
                headerBgColor = '#ffd700'; // 1위 골드 (정규시즌 우승)
                textColor = 'black';
            } else if (rank === 2) {
                headerBgColor = '#c0c0c0'; // 2위 실버 (플레이오프 직행)
                textColor = 'black';
            } else if (rank === 3) {
                headerBgColor = '#cd7f32'; // 3위 브론즈 (준플레이오프 직행)
                textColor = 'white';
            } else if (rank >= 4 && rank <= 5) {
                headerBgColor = '#1a237e'; // 4-5위 파란색 (와일드카드)
                textColor = 'white';
            }
            
            rankHeader.style.cssText = `
                background: ${headerBgColor};
                color: ${textColor};
                font-weight: 600;
                text-align: center;
                padding: 8px 4px;
                border: 1px solid #ddd;
                width: auto;
            `;
            
            rankNumberRow.appendChild(rankHeader);
        }
        
        thead.appendChild(rankNumberRow);
        return thead;
    }

    // 본문 생성
    createBody() {
        const tbody = document.createElement('tbody');
        
        this.data.teams.forEach(team => {
            const row = this.createTeamRow(team);
            tbody.appendChild(row);
        });
        
        return tbody;
    }

    // 팀별 행 생성
    createTeamRow(team) {
        const row = document.createElement('tr');
        
        // 팀명 셀
        const teamCell = document.createElement('td');
        teamCell.className = 'team-cell';
        
        // 동적 순위 계산 (실제 데이터 기반)
        const currentRank = this.data.teams.findIndex(t => t.name === team.name) + 1;
        
        // 팀 정보 매핑 (풀네임)
        const teamFullNames = {
            '한화': { full: '한화 이글스', short: '한화' },
            'LG': { full: 'LG 트윈스', short: 'LG' },
            '롯데': { full: '롯데 자이언츠', short: '롯데' },
            'KT': { full: 'KT 위즈', short: 'KT' },
            'SSG': { full: 'SSG 랜더스', short: 'SSG' },
            'KIA': { full: 'KIA 타이거즈', short: 'KIA' },
            '삼성': { full: '삼성 라이온즈', short: '삼성' },
            'NC': { full: 'NC 다이노스', short: 'NC' },
            '두산': { full: '두산 베어스', short: '두산' },
            '키움': { full: '키움 히어로즈', short: '키움' }
        };
        
        const teamInfo = teamFullNames[team.name] || { full: team.name, short: team.name };
        
        teamCell.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
                <img src="${team.logo}" alt="${team.name}" 
                     style="width: 20px; height: 20px; object-fit: contain;">
                <div style="font-size: 0.75rem; font-weight: 600; color: #374151;">
                    ${teamInfo.short}
                </div>
                <div style="font-size: 0.65rem; color: #6b7280;">
                    ${currentRank}위
                </div>
            </div>
        `;
        teamCell.style.cssText = `
            background-color: white;
            padding: 8px 4px;
            text-align: center;
            border: 1px solid #ddd;
            width: 120px;
            min-width: 120px;
            white-space: nowrap;
            overflow: hidden;
        `;
        row.appendChild(teamCell);

        // 매직넘버 셀들 (9위 → 1위)
        for (let rank = 9; rank >= 1; rank--) {
            const magicCell = this.createMagicCell(team, rank);
            row.appendChild(magicCell);
        }
        
        return row;
    }

    // 매직넘버 셀 생성
    createMagicCell(team, rank) {
        const cell = document.createElement('td');
        const rankStr = rank.toString();
        
        // 매직넘버 데이터 가져오기
        const magicData = team.magicNumbers[rankStr];
        
        if (magicData) {
            const colors = this.getColorByType(magicData.type);
            
            // 툴팁 정보 생성
            const tooltipText = this.getTooltipText(magicData.type, magicData.value, rank);
            
            cell.innerHTML = `
                <div class="magic-cell-content" title="${tooltipText}" style="position: relative;">
                    <span style="font-weight: 600; font-size: 0.8rem;">${magicData.value}</span>
                </div>
            `;
            
            cell.style.cssText = `
                background: ${colors.bg};
                color: ${colors.text};
                padding: 8px 4px;
                text-align: center;
                border: 1px solid rgba(0, 0, 0, 0.1);
                cursor: help;
                transition: all 0.2s ease;
                font-weight: 600;
                position: relative;
            `;
            
            // 호버 효과
            cell.addEventListener('mouseenter', () => {
                cell.style.transform = 'scale(1.05)';
                cell.style.zIndex = '10';
                cell.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            });
            
            cell.addEventListener('mouseleave', () => {
                cell.style.transform = 'scale(1)';
                cell.style.zIndex = '1';
                cell.style.boxShadow = 'none';
            });
        } else {
            // 빈 셀
            cell.style.cssText = `
                background-color: #f8f9fa;
                padding: 8px 4px;
                text-align: center;
                border: 1px solid rgba(0, 0, 0, 0.1);
                color: #6b7280;
            `;
            cell.innerHTML = '<span style="font-size: 0.7rem;">-</span>';
        }
        
        return cell;
    }

    // 툴팁 텍스트 생성
    getTooltipText(type, value, rank) {
        const typeNames = {
            'magic': '매직넘버',
            'competitive': '경합상황', 
            'tragic': '트래직넘버',
            'clinched': '확정상황',
            'eliminated': '탈락확정'
        };
        
        const typeName = typeNames[type] || '알 수 없음';
        
        if (type === 'magic') {
            return `${rank}위 달성까지 ${value}승 필요 (${typeName})`;
        } else if (type === 'tragic') {
            return `${rank}위 탈락까지 ${value}패 남음 (${typeName})`;
        } else if (type === 'competitive') {
            return `${rank}위 경합 중 - ${value}경기 (${typeName})`;
        } else if (type === 'clinched') {
            return `${rank}위 확정 (${typeName})`;
        } else if (type === 'eliminated') {
            return `${rank}위 진출 불가능 (${typeName})`;
        } else {
            return `${rank}위 ${typeName} - ${value}`;
        }
    }

    // 타입별 색상 반환
    getColorByType(type) {
        const colorMap = {
            'magic': { bg: '#7dd87d', text: 'black' },      // 연한 초록
            'competitive': { bg: '#ffff7d', text: 'black' }, // 연한 노랑
            'tragic': { bg: '#ff7d7d', text: 'black' },     // 연한 분홍
            'clinched': { bg: '#4169e1', text: 'white' },   // 파란색
            'eliminated': { bg: '#808080', text: 'white' }   // 회색
        };
        
        return colorMap[type] || { bg: 'white', text: 'black' };
    }

    // 에러 렌더링
    renderError(message) {
        if (this.tableElement) {
            this.tableElement.innerHTML = `
                <tbody>
                    <tr>
                        <td colspan="10" style="text-align: center; color: #999; padding: 20px;">
                            ${message}
                        </td>
                    </tr>
                </tbody>
            `;
        }
    }

    // 범례 렌더링 (별도 함수)
    renderLegend(containerId = 'namuwiki-legend') {
        const container = document.getElementById(containerId);
        if (!container || !this.data) return;

        const legendHtml = Object.entries(this.data.legend).map(([key, value]) => `
            <div style="display: flex; align-items: center; gap: 5px;">
                <span style="
                    width: 20px; 
                    height: 20px; 
                    background: ${value.color}; 
                    border-radius: 4px; 
                    display: inline-block;
                "></span>
                <span>■ ${value.label}</span>
            </div>
        `).join('');

        container.innerHTML = `
            <div style="display: flex; flex-wrap: wrap; gap: 15px; justify-content: center; font-size: 0.9rem;">
                ${legendHtml}
            </div>
        `;
    }

    // 업데이트 정보 렌더링
    renderUpdateInfo(containerId = 'namuwiki-update-info') {
        const container = document.getElementById(containerId);
        if (!container || !this.data) return;

        container.innerHTML = `
            <div style="text-align: right; font-size: 0.75rem; color: #999; margin-bottom: 15px;">
                📊 <span>${this.data.updateDate} ${this.data.title}</span>
            </div>
        `;
    }

    // 타임스탬프 업데이트
    updateTimestamp() {
        const timestampElement = document.getElementById('matrix-load-time');
        if (timestampElement && this.data) {
            timestampElement.textContent = `${this.data.updateDate} ${this.data.title}`;
        }
    }
}

// 전역 인스턴스 생성
const namuwikiChart = new NamuwikiMagicChart();

// DOM 로드 완료 시 자동 렌더링
async function initNamuwikiChart() {
    try {
        console.log('🚀 나무위키 차트 초기화 시작');
        await namuwikiChart.render('namuwiki-magic-table');
        console.log('✅ 나무위키 매직넘버 차트 렌더링 완료');
    } catch (error) {
        console.error('❌ 나무위키 차트 초기화 실패:', error);
    }
}

// DOM이 이미 로드되었는지 확인하고 적절히 실행
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNamuwikiChart);
} else {
    // DOM이 이미 로드된 경우 즉시 실행
    initNamuwikiChart();
}

// 외부에서 사용할 수 있도록 전역 함수 제공
window.renderNamuwikiChart = () => namuwikiChart.render();
window.namuwikiChart = namuwikiChart;