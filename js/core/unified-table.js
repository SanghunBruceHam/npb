/**
 * 통일된 테이블 구조 및 정렬 기능
 */

// 통일된 페이지 구조 생성
function createUnifiedLayout(title, description, centralData, pacificData, tableConfig) {
    return `
        <div class="unified-section">
            <div class="unified-header">
                <h3>${title}</h3>
                <p class="unified-description">${description}</p>
            </div>
            
            <div class="leagues-container">
                <div class="league-section">
                    <div class="league-header">
                        <div class="league-title central">🔵 세리그 (Central League)</div>
                    </div>
                    <div class="league-content">
                        ${createUnifiedTable('central', centralData, tableConfig)}
                    </div>
                </div>
                
                <div class="league-section">
                    <div class="league-header">
                        <div class="league-title pacific">🔴 파리그 (Pacific League)</div>
                    </div>
                    <div class="league-content">
                        ${createUnifiedTable('pacific', pacificData, tableConfig)}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// 통일된 테이블 생성
function createUnifiedTable(leagueId, data, config) {
    const tableId = `table-${leagueId}-${Date.now()}`;
    
    // 헤더 생성
    const headers = config.columns.map(col => 
        `<th class="sortable ${col.class || ''}" data-sort="${col.sort || col.key}">${col.label}</th>`
    ).join('');
    
    // 데이터 행 생성
    const rows = data.map((row, index) => {
        const cells = config.columns.map(col => {
            let value = row[col.key];
            if (col.format) value = col.format(value, row, index);
            return `<td class="${col.class || ''}">${value}</td>`;
        }).join('');
        
        return `<tr>${cells}</tr>`;
    }).join('');
    
    return `
        <table class="unified-table" id="${tableId}">
            <thead>
                <tr>${headers}</tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}

// 테이블 정렬 기능 초기화
function initializeTableSorting() {
    document.querySelectorAll('.unified-table').forEach(table => {
        const headers = table.querySelectorAll('th.sortable');
        
        headers.forEach(header => {
            header.addEventListener('click', () => {
                sortTable(table, header);
            });
        });
    });
}

// 테이블 정렬 실행
function sortTable(table, clickedHeader) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const sortKey = clickedHeader.dataset.sort;
    const columnIndex = Array.from(clickedHeader.parentElement.children).indexOf(clickedHeader);
    
    // 정렬 상태 확인
    const currentSort = clickedHeader.classList.contains('sort-asc') ? 'asc' : 
                       clickedHeader.classList.contains('sort-desc') ? 'desc' : 'none';
    
    // 모든 헤더의 정렬 클래스 제거
    table.querySelectorAll('th').forEach(h => {
        h.classList.remove('sort-asc', 'sort-desc');
    });
    
    // 새로운 정렬 방향 결정
    const newSort = currentSort === 'asc' ? 'desc' : 'asc';
    clickedHeader.classList.add(`sort-${newSort}`);
    
    // 데이터 정렬
    rows.sort((a, b) => {
        const aValue = getCellValue(a, columnIndex);
        const bValue = getCellValue(b, columnIndex);
        
        // 숫자인지 확인
        const aNum = parseFloat(aValue);
        const bNum = parseFloat(bValue);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
            return newSort === 'asc' ? aNum - bNum : bNum - aNum;
        } else {
            return newSort === 'asc' ? 
                aValue.localeCompare(bValue) : 
                bValue.localeCompare(aValue);
        }
    });
    
    // 정렬된 행들을 다시 추가
    rows.forEach(row => tbody.appendChild(row));
}

// 셀 값 추출
function getCellValue(row, columnIndex) {
    const cell = row.cells[columnIndex];
    return cell.textContent.trim();
}

// 표준 컬럼 설정들
const STANDARD_COLUMNS = {
    standings: [
        { key: 'rank', label: '순위', class: 'rank-cell', sort: 'rank' },
        { key: 'team', label: '팀명', class: 'team-cell', sort: 'team' },
        { key: 'games', label: '경기', class: 'number-cell center-cell', sort: 'games' },
        { key: 'wins', label: '승', class: 'number-cell center-cell', sort: 'wins' },
        { key: 'losses', label: '패', class: 'number-cell center-cell', sort: 'losses' },
        { key: 'draws', label: '무', class: 'number-cell center-cell', sort: 'draws' },
        { key: 'winRate', label: '승률', class: 'number-cell center-cell', sort: 'winRate', 
          format: (value) => value.toFixed(3) },
        { key: 'gameBehind', label: '게임차', class: 'number-cell center-cell', sort: 'gameBehind',
          format: (value) => value === 0 ? '-' : value.toFixed(1) }
    ],
    
    homeAway: [
        { key: 'team', label: '팀명', class: 'team-cell', sort: 'team' },
        { key: 'homeWins', label: '홈승', class: 'number-cell center-cell', sort: 'homeWins' },
        { key: 'homeLosses', label: '홈패', class: 'number-cell center-cell', sort: 'homeLosses' },
        { key: 'homeRate', label: '홈승률', class: 'number-cell center-cell', sort: 'homeRate',
          format: (value) => value.toFixed(3) },
        { key: 'awayWins', label: '원정승', class: 'number-cell center-cell', sort: 'awayWins' },
        { key: 'awayLosses', label: '원정패', class: 'number-cell center-cell', sort: 'awayLosses' },
        { key: 'awayRate', label: '원정승률', class: 'number-cell center-cell', sort: 'awayRate',
          format: (value) => value.toFixed(3) },
        { key: 'difference', label: '차이', class: 'number-cell center-cell', sort: 'difference',
          format: (value) => (value >= 0 ? '+' : '') + value.toFixed(3) }
    ]
};

// 페이지 로드 시 정렬 기능 초기화
document.addEventListener('DOMContentLoaded', () => {
    // 지연 초기화 (다른 스크립트가 테이블을 생성한 후)
    setTimeout(() => {
        initializeTableSorting();
    }, 1000);
});

// 전역 함수로 노출
window.UnifiedTable = {
    createLayout: createUnifiedLayout,
    createTable: createUnifiedTable,
    initializeSorting: initializeTableSorting,
    STANDARD_COLUMNS
};