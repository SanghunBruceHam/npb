/**
 * 나무위키 스타일 매직넘버 차트 렌더링
 * 2025년 8월 4일 스크린샷 완전 재현
 */

class NamuwikiMagicChart {
    constructor() {
        this.data = null;
        this.tableElement = null;
    }

    // 데이터 로드
    async loadData() {
        try {
            const response = await fetch('./namuwiki-data.json');
            this.data = await response.json();
            console.log('✅ 나무위키 데이터 로드 완료:', this.data);
        } catch (error) {
            console.error('❌ 데이터 로드 실패:', error);
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
            console.log('✅ 나무위키 매직넘버 차트 렌더링 완료');
        } catch (error) {
            console.error('❌ 렌더링 실패:', error);
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
        const headerRow = document.createElement('tr');
        
        // 구단 헤더
        const teamHeader = document.createElement('th');
        teamHeader.textContent = '구단';
        teamHeader.style.cssText = `
            background-color: #2d3748;
            color: white;
            border: 2px solid #002561;
            padding: 4px 8px;
            font-size: 11px;
            font-weight: bold;
            text-align: center;
        `;
        headerRow.appendChild(teamHeader);

        // 순위 헤더 (9위 → 1위)
        for (let rank = 9; rank >= 1; rank--) {
            const rankHeader = document.createElement('th');
            rankHeader.textContent = rank.toString();
            
            // 순위별 헤더 색상 (나무위키 스타일)
            let bgColor;
            if (rank >= 7) {
                bgColor = '#8B4513'; // 갈색 (7-9위)
            } else if (rank === 6) {
                bgColor = '#B22222'; // 빨간색 (6위)
            } else if (rank === 5) {
                bgColor = '#1E3A8A'; // 파란색 (5위)
            } else {
                bgColor = '#1E40AF'; // 진한 파란색 (1-4위)
            }
            
            rankHeader.style.cssText = `
                background-color: ${bgColor};
                color: white;
                border: 2px solid #002561;
                padding: 4px 8px;
                font-size: 11px;
                font-weight: bold;
                text-align: center;
                width: 10%;
            `;
            
            headerRow.appendChild(rankHeader);
        }
        
        thead.appendChild(headerRow);
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
        teamCell.innerHTML = `
            <img src="${team.logo}" alt="${team.name}" 
                 style="width: 12px; height: 12px; vertical-align: middle; margin-right: 3px;">
            ${team.name}
        `;
        teamCell.style.cssText = `
            background-color: white;
            padding: 3px 8px;
            font-size: 10px;
            font-weight: bold;
            text-align: center;
            border: 1px solid #ddd;
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
            cell.textContent = magicData.value;
            
            // 색상 적용
            const colors = this.getColorByType(magicData.type);
            cell.style.cssText = `
                background-color: ${colors.bg};
                color: ${colors.text};
                padding: 2px 4px;
                font-size: 10px;
                font-weight: bold;
                text-align: center;
                border: 1px solid #ddd;
                width: 10%;
            `;
        } else {
            // 빈 셀
            cell.style.cssText = `
                background-color: white;
                padding: 2px 4px;
                font-size: 10px;
                text-align: center;
                border: 1px solid #ddd;
                width: 10%;
            `;
        }
        
        return cell;
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