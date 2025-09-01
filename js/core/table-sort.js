// 안전한 테이블 정렬 시스템
class TableSort {
    static init() {
        try {
            console.log('🚀 테이블 정렬 시스템 시작');
            
            // 즉시 처리
            this.processAllTables();
            
            // DOM 변화 감지
            this.setupObserver();
            
            // 주기적 체크 (안전장치)
            this.setupInterval();
            
        } catch (error) {
            console.error('테이블 정렬 초기화 오류:', error);
        }
    }
    
    static setupInterval() {
        try {
            setInterval(() => {
                try {
                    this.processAllTables();
                } catch (error) {
                    console.error('주기적 테이블 처리 오류:', error);
                }
            }, 3000);
        } catch (error) {
            console.error('인터벌 설정 오류:', error);
        }
    }
    
    static setupObserver() {
        try {
            const observer = new MutationObserver(() => {
                try {
                    setTimeout(() => this.processAllTables(), 200);
                } catch (error) {
                    console.error('옵저버 콜백 오류:', error);
                }
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        } catch (error) {
            console.error('옵저버 설정 오류:', error);
        }
    }
    
    static processAllTables() {
        try {
            const tables = document.querySelectorAll('table');
            let processed = 0;
            
            tables.forEach(table => {
                try {
                    if (this.addSorting(table)) {
                        processed++;
                    }
                } catch (error) {
                    console.error('개별 테이블 처리 오류:', error, table);
                }
            });
            
            if (processed > 0) {
                console.log(`✅ ${processed}개 테이블에 정렬 기능 추가됨`);
            }
            
        } catch (error) {
            console.error('전체 테이블 처리 오류:', error);
        }
    }
    
    static addSorting(table) {
        try {
            if (!table) return false;
            
            // 이미 처리된 테이블인지 확인
            if (table.hasAttribute('data-sort-ready')) return false;
            
            const headers = table.querySelectorAll('th');
            if (headers.length === 0) return false;
            
            let added = 0;
            
            headers.forEach((th, index) => {
                try {
                    const text = th.textContent?.trim() || '';
                    if (!text || text === '-' || text === '—') return;
                    
                    // 이미 화살표가 있으면 스킵
                    if (th.querySelector('.sort-btn')) return;
                    
                    // 스타일 적용
                    th.style.cursor = 'pointer';
                    th.style.userSelect = 'none';
                    
                    // 화살표 버튼 추가
                    const btn = document.createElement('span');
                    btn.className = 'sort-btn';
                    btn.textContent = ' ⇅';
                    btn.style.opacity = '0.6';
                    btn.style.fontSize = '12px';
                    btn.style.marginLeft = '4px';
                    
                    th.appendChild(btn);
                    
                    // 클릭 핸들러 - 안전하게 바인딩
                    const clickHandler = (e) => {
                        try {
                            e.preventDefault();
                            e.stopPropagation();
                            this.sortTable(table, index);
                        } catch (error) {
                            console.error('클릭 핸들러 오류:', error);
                        }
                    };
                    
                    th.addEventListener('click', clickHandler);
                    added++;
                    
                } catch (error) {
                    console.error('헤더 처리 오류:', error, th);
                }
            });
            
            if (added > 0) {
                table.setAttribute('data-sort-ready', 'true');
                const tableId = table.id || table.className || '무명테이블';
                console.log(`📊 "${tableId}" 정렬 활성화 (${added}개 컬럼)`);
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('테이블 정렬 추가 오류:', error);
            return false;
        }
    }
    
    static sortTable(table, columnIndex) {
        try {
            const tbody = table.tBodies[0];
            const allRows = Array.from(tbody?.rows || table.rows || []);
            const dataRows = allRows.filter(row => {
                try {
                    return row && !row.querySelector('th');
                } catch {
                    return false;
                }
            });
            
            if (dataRows.length === 0) return;
            
            // 헤더 처리
            const headers = table.querySelectorAll('th');
            const currentHeader = headers[columnIndex];
            if (!currentHeader) return;
            
            // 정렬 방향
            const currentSort = currentHeader.dataset.sortDir || 'none';
            const newSort = currentSort === 'asc' ? 'desc' : 'asc';
            
            // 모든 헤더 리셋
            headers.forEach(h => {
                try {
                    h.dataset.sortDir = 'none';
                    const btn = h.querySelector('.sort-btn');
                    if (btn) {
                        btn.textContent = ' ⇅';
                        btn.style.opacity = '0.6';
                    }
                } catch (error) {
                    console.error('헤더 리셋 오류:', error);
                }
            });
            
            // 현재 헤더 업데이트
            currentHeader.dataset.sortDir = newSort;
            const btn = currentHeader.querySelector('.sort-btn');
            if (btn) {
                btn.textContent = newSort === 'asc' ? ' ↑' : ' ↓';
                btn.style.opacity = '1';
            }
            
            // 데이터 정렬
            dataRows.sort((a, b) => {
                try {
                    const cellA = a.cells[columnIndex];
                    const cellB = b.cells[columnIndex];
                    
                    if (!cellA || !cellB) return 0;
                    
                    const valueA = (cellA.textContent || '').trim();
                    const valueB = (cellB.textContent || '').trim();
                    
                    // 숫자 비교
                    const numA = this.parseNumber(valueA);
                    const numB = this.parseNumber(valueB);
                    
                    let result = 0;
                    if (numA !== null && numB !== null) {
                        result = numA - numB;
                    } else {
                        result = valueA.localeCompare(valueB);
                    }
                    
                    return newSort === 'asc' ? result : -result;
                    
                } catch (error) {
                    console.error('정렬 비교 오류:', error);
                    return 0;
                }
            });
            
            // 행 재배치
            const container = tbody || table;
            dataRows.forEach(row => {
                try {
                    container.appendChild(row);
                } catch (error) {
                    console.error('행 재배치 오류:', error);
                }
            });
            
            console.log(`🔄 정렬 완료: 컬럼 ${columnIndex + 1} (${newSort})`);
            
        } catch (error) {
            console.error('테이블 정렬 실행 오류:', error);
        }
    }
    
    static parseNumber(text) {
        try {
            if (!text) return null;
            
            // 승률 패턴
            if (/^0\.\d+$/.test(text)) {
                return parseFloat(text);
            }
            
            // 숫자 추출
            const numMatch = text.match(/^[+-]?\d*\.?\d+/);
            if (numMatch) {
                return parseFloat(numMatch[0]);
            }
            
            // 퍼센트
            const percentMatch = text.match(/(\d+\.?\d*)%/);
            if (percentMatch) {
                return parseFloat(percentMatch[1]);
            }
            
            return null;
            
        } catch (error) {
            console.error('숫자 파싱 오류:', error);
            return null;
        }
    }
}

// 안전한 초기화
try {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            try {
                TableSort.init();
            } catch (error) {
                console.error('DOMContentLoaded 오류:', error);
            }
        });
    } else {
        TableSort.init();
    }
} catch (error) {
    console.error('초기 스크립트 실행 오류:', error);
}

// 전역 함수
try {
    window.TableSort = TableSort;
    window.debugTableSort = () => {
        console.log('=== 테이블 정렬 디버그 ===');
        console.log('전체 테이블:', document.querySelectorAll('table').length);
        console.log('정렬 준비된 테이블:', document.querySelectorAll('table[data-sort-ready]').length);
        console.log('정렬 버튼:', document.querySelectorAll('.sort-btn').length);
        return '디버그 완료';
    };
    
    window.forceTableSort = () => {
        try {
            // 기존 표시 제거
            document.querySelectorAll('table[data-sort-ready]').forEach(t => {
                t.removeAttribute('data-sort-ready');
            });
            document.querySelectorAll('.sort-btn').forEach(btn => btn.remove());
            
            // 다시 적용
            TableSort.processAllTables();
            return '강제 적용 완료';
        } catch (error) {
            console.error('강제 적용 오류:', error);
            return '강제 적용 실패';
        }
    };
} catch (error) {
    console.error('전역 함수 설정 오류:', error);
}

console.log('💪 안전한 테이블 정렬 시스템 준비 완료');