#!/usr/bin/env node

/**
 * KBO 자동화 시스템 종합 점검 스크립트
 * 모든 핵심 기능들을 체계적으로 테스트하고 상태를 점검
 */

const fs = require('fs');
const path = require('path');

class AutomationStatusChecker {
    constructor() {
        this.projectRoot = process.cwd();
        this.results = {
            files: {},
            functions: {},
            data: {},
            overall: 'UNKNOWN'
        };
        
        console.log('🔍 KBO 자동화 시스템 종합 점검 시작...\n');
        console.log(`📁 프로젝트 경로: ${this.projectRoot}\n`);
    }

    // 1. 핵심 파일 존재 여부 확인
    checkCoreFiles() {
        console.log('📂 1. 핵심 파일 존재 여부 확인');
        console.log('=' .repeat(50));
        
        const coreFiles = [
            // 데이터 파일
            { path: '2025-season-data.txt', desc: '과거 시즌 데이터', critical: true },
            
            // 핵심 스크립트
            { path: 'integrate-season-data.js', desc: '통합 데이터 처리 스크립트', critical: true },
            { path: 'parse-season-data.js', desc: '시즌 데이터 파싱 스크립트', critical: true },
            { path: 'scrape-kbo-records.js', desc: 'KBO 스크래핑 스크립트', critical: true },
            { path: 'test-live-scoreboard.js', desc: '실시간 스코어보드 테스트', critical: true },
            
            // 자동화 설정
            { path: 'auto-update.sh', desc: '자동 업데이트 스크립트', critical: false },
            { path: 'setup-cron.sh', desc: 'Cron 설정 스크립트', critical: false },
            { path: 'package.json', desc: 'Node.js 패키지 설정', critical: true },
            
            // 데이터 디렉토리
            { path: 'data/', desc: '데이터 저장 디렉토리', critical: true },
            { path: 'data/home-away-records.json', desc: '홈/어웨이 기록 데이터', critical: false },
            { path: 'data/last-update-date.json', desc: '마지막 업데이트 정보', critical: false },
            
            // 결과 파일
            { path: 'kbo-records.json', desc: 'KBO 기록 JSON', critical: false },
            { path: 'kbo-records.js', desc: 'KBO 기록 JavaScript', critical: false }
        ];
        
        let missingCritical = 0;
        let missingOptional = 0;
        
        coreFiles.forEach(file => {
            const fullPath = path.join(this.projectRoot, file.path);
            const exists = fs.existsSync(fullPath);
            const status = exists ? '✅' : '❌';
            const priority = file.critical ? '[필수]' : '[선택]';
            
            console.log(`${status} ${priority} ${file.path} - ${file.desc}`);
            
            this.results.files[file.path] = {
                exists,
                critical: file.critical,
                desc: file.desc
            };
            
            if (!exists) {
                if (file.critical) {
                    missingCritical++;
                } else {
                    missingOptional++;
                }
            }
        });
        
        console.log(`\n📊 파일 상태 요약:`);
        console.log(`   필수 파일 누락: ${missingCritical}개`);
        console.log(`   선택 파일 누락: ${missingOptional}개`);
        
        return missingCritical === 0;
    }

    // 2. 과거 데이터 파일 분석
    checkHistoricalData() {
        console.log('\n📊 2. 과거 데이터 파일 분석');
        console.log('=' .repeat(50));
        
        const dataFile = path.join(this.projectRoot, '2025-season-data.txt');
        
        if (!fs.existsSync(dataFile)) {
            console.log('❌ 2025-season-data.txt 파일이 없습니다.');
            this.results.data.historical = { status: 'MISSING', games: 0 };
            return false;
        }
        
        try {
            const data = fs.readFileSync(dataFile, 'utf8');
            const lines = data.split('\n').length;
            const fileSize = (fs.statSync(dataFile).size / 1024).toFixed(1);
            
            // 경기 수 대략 계산 (3월 22일부터 시작하는 경기들 카운트)
            const gameMatches = data.match(/✅.*경기/g) || [];
            const gameCount = gameMatches.length;
            
            // 팀명 등장 빈도 확인
            const teams = ['한화', 'KT', '롯데', 'LG', 'NC', 'KIA', '두산', 'SSG', '키움', '삼성'];
            const teamCounts = {};
            teams.forEach(team => {
                teamCounts[team] = (data.match(new RegExp(team, 'g')) || []).length;
            });
            
            console.log(`✅ 파일 존재: ${dataFile}`);
            console.log(`📄 파일 크기: ${fileSize}KB`);
            console.log(`📝 총 라인 수: ${lines.toLocaleString()}줄`);
            console.log(`⚾ 예상 경기 수: ${gameCount}경기`);
            
            console.log(`\n🏟️ 팀별 등장 횟수:`);
            Object.entries(teamCounts)
                .sort((a, b) => b[1] - a[1])
                .forEach(([team, count]) => {
                    console.log(`   ${team}: ${count}회`);
                });
            
            this.results.data.historical = {
                status: 'OK',
                games: gameCount,
                fileSize: fileSize + 'KB',
                teams: teamCounts
            };
            
            return gameCount > 0;
            
        } catch (error) {
            console.log(`❌ 파일 읽기 오류: ${error.message}`);
            this.results.data.historical = { status: 'ERROR', error: error.message };
            return false;
        }
    }

    // 3. Node.js 환경 및 패키지 확인
    checkNodeEnvironment() {
        console.log('\n🔧 3. Node.js 환경 및 패키지 확인');
        console.log('=' .repeat(50));
        
        // Node.js 버전 확인
        const nodeVersion = process.version;
        console.log(`✅ Node.js 버전: ${nodeVersion}`);
        
        // package.json 확인
        const packageFile = path.join(this.projectRoot, 'package.json');
        if (fs.existsSync(packageFile)) {
            try {
                const packageData = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
                console.log(`✅ 패키지명: ${packageData.name || 'N/A'}`);
                console.log(`✅ 버전: ${packageData.version || 'N/A'}`);
                
                if (packageData.dependencies) {
                    console.log(`📦 의존성 패키지: ${Object.keys(packageData.dependencies).length}개`);
                    Object.entries(packageData.dependencies).forEach(([pkg, version]) => {
                        console.log(`   - ${pkg}: ${version}`);
                    });
                }
                
                if (packageData.scripts) {
                    console.log(`📜 스크립트: ${Object.keys(packageData.scripts).length}개`);
                    Object.entries(packageData.scripts).forEach(([name, script]) => {
                        console.log(`   - ${name}: ${script}`);
                    });
                }
                
                this.results.functions.nodeEnv = { status: 'OK', version: nodeVersion };
                return true;
                
            } catch (error) {
                console.log(`❌ package.json 파싱 오류: ${error.message}`);
                this.results.functions.nodeEnv = { status: 'ERROR', error: error.message };
                return false;
            }
        } else {
            console.log(`❌ package.json 파일이 없습니다.`);
            this.results.functions.nodeEnv = { status: 'MISSING', version: nodeVersion };
            return false;
        }
    }

    // 4. 핵심 스크립트 구문 검사
    checkScriptSyntax() {
        console.log('\n🔍 4. 핵심 스크립트 구문 검사');
        console.log('=' .repeat(50));
        
        const scripts = [
            'integrate-season-data.js',
            'parse-season-data.js',
            'scrape-kbo-records.js',
            'test-live-scoreboard.js'
        ];
        
        let allValid = true;
        
        scripts.forEach(script => {
            const scriptPath = path.join(this.projectRoot, script);
            
            if (!fs.existsSync(scriptPath)) {
                console.log(`❌ ${script}: 파일 없음`);
                this.results.functions[script] = { status: 'MISSING' };
                allValid = false;
                return;
            }
            
            try {
                const content = fs.readFileSync(scriptPath, 'utf8');
                const lines = content.split('\n').length;
                const size = (fs.statSync(scriptPath).size / 1024).toFixed(1);
                
                // 간단한 구문 검사 (require, function, class 등 존재 확인)
                const hasRequire = content.includes('require(');
                const hasFunction = content.includes('function') || content.includes('=>');
                const hasClass = content.includes('class ');
                const hasAsync = content.includes('async ');
                
                console.log(`✅ ${script}: ${lines}줄, ${size}KB`);
                console.log(`   require: ${hasRequire ? '✅' : '❌'}, function: ${hasFunction ? '✅' : '❌'}, class: ${hasClass ? '✅' : '❌'}, async: ${hasAsync ? '✅' : '❌'}`);
                
                this.results.functions[script] = {
                    status: 'OK',
                    lines,
                    size: size + 'KB',
                    features: { hasRequire, hasFunction, hasClass, hasAsync }
                };
                
            } catch (error) {
                console.log(`❌ ${script}: 읽기 오류 - ${error.message}`);
                this.results.functions[script] = { status: 'ERROR', error: error.message };
                allValid = false;
            }
        });
        
        return allValid;
    }

    // 5. 데이터 파일 상태 확인
    checkDataFiles() {
        console.log('\n💾 5. 데이터 파일 상태 확인');
        console.log('=' .repeat(50));
        
        const dataFiles = [
            { path: 'data/home-away-records.json', desc: '홈/어웨이 기록' },
            { path: 'data/last-update-date.json', desc: '마지막 업데이트' },
            { path: 'kbo-records.json', desc: 'KBO 기록 JSON' },
            { path: 'kbo-records.js', desc: 'KBO 기록 JS' }
        ];
        
        let validFiles = 0;
        
        dataFiles.forEach(file => {
            const filePath = path.join(this.projectRoot, file.path);
            
            if (!fs.existsSync(filePath)) {
                console.log(`⚠️ ${file.path}: 없음 (${file.desc})`);
                this.results.data[file.path] = { status: 'MISSING', desc: file.desc };
                return;
            }
            
            try {
                const stats = fs.statSync(filePath);
                const size = (stats.size / 1024).toFixed(1);
                const modified = stats.mtime.toLocaleString('ko-KR');
                
                // JSON 파일인 경우 파싱 테스트
                if (file.path.endsWith('.json')) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const data = JSON.parse(content);
                    console.log(`✅ ${file.path}: ${size}KB, 수정일: ${modified}`);
                    
                    // 데이터 구조 간단 분석
                    if (typeof data === 'object') {
                        const keys = Object.keys(data);
                        console.log(`   구조: ${keys.length}개 키 (${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''})`);
                    }
                } else {
                    console.log(`✅ ${file.path}: ${size}KB, 수정일: ${modified}`);
                }
                
                this.results.data[file.path] = {
                    status: 'OK',
                    size: size + 'KB',
                    modified,
                    desc: file.desc
                };
                
                validFiles++;
                
            } catch (error) {
                console.log(`❌ ${file.path}: 오류 - ${error.message}`);
                this.results.data[file.path] = { status: 'ERROR', error: error.message };
            }
        });
        
        console.log(`\n📊 데이터 파일 상태: ${validFiles}/${dataFiles.length}개 정상`);
        return validFiles >= dataFiles.length / 2; // 50% 이상 정상이면 OK
    }

    // 6. 자동화 설정 확인
    checkAutomationSetup() {
        console.log('\n⚙️ 6. 자동화 설정 확인');
        console.log('=' .repeat(50));
        
        const automationFiles = [
            { path: 'auto-update.sh', desc: '자동 업데이트 스크립트' },
            { path: 'setup-cron.sh', desc: 'Cron 설정 스크립트' },
            { path: 'kbo_cron_jobs.txt', desc: 'Cron 작업 목록' }
        ];
        
        let setupComplete = 0;
        
        automationFiles.forEach(file => {
            const filePath = path.join(this.projectRoot, file.path);
            
            if (fs.existsSync(filePath)) {
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const lines = content.split('\n').length;
                    
                    console.log(`✅ ${file.path}: ${lines}줄 (${file.desc})`);
                    
                    // 실행 권한 확인 (Unix 계열)
                    if (file.path.endsWith('.sh')) {
                        const stats = fs.statSync(filePath);
                        const mode = stats.mode;
                        const executable = (mode & parseInt('111', 8)) > 0;
                        console.log(`   실행 권한: ${executable ? '✅' : '❌'}`);
                    }
                    
                    setupComplete++;
                    
                } catch (error) {
                    console.log(`❌ ${file.path}: 읽기 오류 - ${error.message}`);
                }
            } else {
                console.log(`⚠️ ${file.path}: 없음 (${file.desc})`);
            }
        });
        
        console.log(`\n📊 자동화 설정: ${setupComplete}/${automationFiles.length}개 존재`);
        return setupComplete > 0;
    }

    // 7. 종합 상태 평가
    evaluateOverallStatus() {
        console.log('\n🎯 7. 종합 상태 평가');
        console.log('=' .repeat(50));
        
        const checks = [
            this.checkCoreFiles(),
            this.checkHistoricalData(),
            this.checkNodeEnvironment(),
            this.checkScriptSyntax(),
            this.checkDataFiles(),
            this.checkAutomationSetup()
        ];
        
        const passedChecks = checks.filter(Boolean).length;
        const totalChecks = checks.length;
        const percentage = ((passedChecks / totalChecks) * 100).toFixed(1);
        
        console.log(`📊 전체 점검 결과: ${passedChecks}/${totalChecks} (${percentage}%)`);
        
        let status, emoji, message;
        
        if (percentage >= 90) {
            status = 'EXCELLENT';
            emoji = '🎉';
            message = '시스템이 완벽하게 구성되어 있습니다!';
        } else if (percentage >= 75) {
            status = 'GOOD';
            emoji = '✅';
            message = '시스템이 잘 구성되어 있으나 일부 개선이 필요합니다.';
        } else if (percentage >= 50) {
            status = 'WARNING';
            emoji = '⚠️';
            message = '기본 기능은 동작하지만 중요한 구성 요소가 누락되었습니다.';
        } else {
            status = 'ERROR';
            emoji = '❌';
            message = '시스템에 심각한 문제가 있습니다. 수정이 필요합니다.';
        }
        
        this.results.overall = status;
        
        console.log(`\n${emoji} 상태: ${status}`);
        console.log(`💬 ${message}`);
        
        return status;
    }

    // 8. 개선 권장사항 제시
    generateRecommendations() {
        console.log('\n💡 8. 개선 권장사항');
        console.log('=' .repeat(50));
        
        const recommendations = [];
        
        // 파일 관련 권장사항
        Object.entries(this.results.files).forEach(([file, info]) => {
            if (!info.exists && info.critical) {
                recommendations.push(`🔴 [필수] ${file} 파일이 없습니다. 생성이 필요합니다.`);
            }
        });
        
        // 데이터 관련 권장사항
        if (this.results.data.historical?.games === 0) {
            recommendations.push(`🔴 [필수] 과거 경기 데이터가 없습니다. 데이터 수집이 필요합니다.`);
        }
        
        // 스크립트 관련 권장사항
        Object.entries(this.results.functions).forEach(([script, info]) => {
            if (info.status === 'MISSING') {
                recommendations.push(`🟡 [권장] ${script} 스크립트를 복구하거나 재생성하세요.`);
            }
        });
        
        // 일반적인 권장사항
        if (recommendations.length === 0) {
            recommendations.push(`✅ 모든 핵심 구성 요소가 정상입니다!`);
            recommendations.push(`🔄 정기적으로 'node integrate-season-data.js'를 실행하세요.`);
            recommendations.push(`📅 자동화를 위해 cron 작업을 설정하는 것을 권장합니다.`);
            recommendations.push(`🧪 새로운 경기가 있을 때 'node test-live-scoreboard.js'로 테스트하세요.`);
        }
        
        recommendations.forEach(rec => console.log(rec));
        
        return recommendations;
    }

    // 메인 실행 함수
    async run() {
        console.log('🚀 KBO 자동화 시스템 종합 점검을 시작합니다!\n');
        
        try {
            // 각 점검 항목 순차 실행
            this.checkCoreFiles();
            this.checkHistoricalData();
            this.checkNodeEnvironment();
            this.checkScriptSyntax();
            this.checkDataFiles();
            this.checkAutomationSetup();
            
            // 종합 평가
            const status = this.evaluateOverallStatus();
            
            // 권장사항 제시
            this.generateRecommendations();
            
            // 최종 요약
            console.log('\n' + '='.repeat(60));
            console.log('🏁 자동화 시스템 점검 완료');
            console.log('='.repeat(60));
            console.log(`최종 상태: ${status}`);
            console.log(`점검 시간: ${new Date().toLocaleString('ko-KR')}`);
            console.log('='.repeat(60));
            
            return status;
            
        } catch (error) {
            console.error('❌ 점검 중 오류 발생:', error);
            return 'ERROR';
        }
    }
}

// 실행
async function main() {
    const checker = new AutomationStatusChecker();
    
    try {
        const status = await checker.run();
        process.exit(status === 'ERROR' ? 1 : 0);
    } catch (error) {
        console.error('❌ 점검 스크립트 실행 실패:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = AutomationStatusChecker;