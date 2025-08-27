#!/usr/bin/env node

/**
 * KBO 데이터 백업 관리자
 * - 자동 타임스탬프 백업
 * - 순환 백업 관리 (최대 30개 보관)
 * - 무결성 검증
 */

const fs = require('fs');
const path = require('path');

class BackupManager {
    constructor() {
        // 경로 설정
        this.dataDir = path.join(__dirname, '../data');
        this.backupDir = path.join(this.dataDir, 'backup');
        this.timestampBackupDir = path.join(this.backupDir, 'timestamped');
        
        // 백업 대상 파일들
        this.criticalFiles = [
            'service-data.json',
            'kbo-rankings.json', 
            'kbo-records.json',
            '2025-season-data-clean.txt'
        ];
        
        // 최대 보관 개수
        this.maxBackups = 30;
        
        this.ensureDirectories();
    }
    
    ensureDirectories() {
        [this.backupDir, this.timestampBackupDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`📁 백업 디렉토리 생성: ${dir}`);
            }
        });
    }
    
    /**
     * 타임스탬프 백업 생성
     */
    createTimestampBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupSubDir = path.join(this.timestampBackupDir, timestamp);
        
        if (!fs.existsSync(backupSubDir)) {
            fs.mkdirSync(backupSubDir, { recursive: true });
        }
        
        let backupCount = 0;
        
        this.criticalFiles.forEach(filename => {
            const sourceFile = path.join(this.dataDir, filename);
            const backupFile = path.join(backupSubDir, filename);
            
            if (fs.existsSync(sourceFile)) {
                try {
                    fs.copyFileSync(sourceFile, backupFile);
                    backupCount++;
                    console.log(`✅ 백업 완료: ${filename}`);
                } catch (error) {
                    console.error(`❌ 백업 실패: ${filename} - ${error.message}`);
                }
            } else {
                console.warn(`⚠️ 파일 없음: ${filename}`);
            }
        });
        
        // 백업 메타데이터 생성
        const metadata = {
            timestamp: new Date().toISOString(),
            backupDate: new Date().toLocaleDateString('ko-KR'),
            filesBackedUp: backupCount,
            totalFiles: this.criticalFiles.length,
            backupPath: backupSubDir
        };
        
        fs.writeFileSync(
            path.join(backupSubDir, 'backup-info.json'),
            JSON.stringify(metadata, null, 2)
        );
        
        console.log(`🎯 백업 완료: ${backupCount}/${this.criticalFiles.length} 파일`);
        console.log(`📂 백업 위치: ${backupSubDir}`);
        
        return { success: true, backupPath: backupSubDir, filesBackedUp: backupCount };
    }
    
    /**
     * 오래된 백업 정리
     */
    cleanupOldBackups() {
        try {
            const backups = fs.readdirSync(this.timestampBackupDir)
                .filter(item => {
                    const fullPath = path.join(this.timestampBackupDir, item);
                    return fs.statSync(fullPath).isDirectory();
                })
                .sort()
                .reverse(); // 최신순
            
            if (backups.length > this.maxBackups) {
                const toDelete = backups.slice(this.maxBackups);
                
                toDelete.forEach(backup => {
                    const backupPath = path.join(this.timestampBackupDir, backup);
                    try {
                        fs.rmSync(backupPath, { recursive: true, force: true });
                        console.log(`🗑️ 오래된 백업 삭제: ${backup}`);
                    } catch (error) {
                        console.error(`❌ 백업 삭제 실패: ${backup} - ${error.message}`);
                    }
                });
                
                console.log(`✅ 백업 정리 완료: ${toDelete.length}개 삭제`);
            } else {
                console.log(`✅ 백업 정리 불필요: ${backups.length}/${this.maxBackups}개 보관 중`);
            }
            
        } catch (error) {
            console.error(`❌ 백업 정리 중 오류: ${error.message}`);
        }
    }
    
    /**
     * 백업 무결성 검증
     */
    verifyBackups(backupPath = null) {
        const targetDir = backupPath || this.timestampBackupDir;
        
        if (!fs.existsSync(targetDir)) {
            console.error(`❌ 백업 디렉토리가 존재하지 않습니다: ${targetDir}`);
            return false;
        }
        
        let totalBackups = 0;
        let validBackups = 0;
        
        if (backupPath) {
            // 특정 백업 검증
            totalBackups = 1;
            validBackups = this.verifyBackupDirectory(backupPath) ? 1 : 0;
        } else {
            // 모든 백업 검증
            const backups = fs.readdirSync(targetDir)
                .filter(item => fs.statSync(path.join(targetDir, item)).isDirectory());
            
            totalBackups = backups.length;
            
            backups.forEach(backup => {
                const backupDir = path.join(targetDir, backup);
                if (this.verifyBackupDirectory(backupDir)) {
                    validBackups++;
                }
            });
        }
        
        console.log(`🔍 백업 검증 완료: ${validBackups}/${totalBackups}개 유효`);
        return validBackups === totalBackups;
    }
    
    verifyBackupDirectory(backupDir) {
        try {
            let validFiles = 0;
            
            this.criticalFiles.forEach(filename => {
                const filePath = path.join(backupDir, filename);
                if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
                    validFiles++;
                }
            });
            
            // backup-info.json 확인
            const infoFile = path.join(backupDir, 'backup-info.json');
            const hasInfo = fs.existsSync(infoFile);
            
            const isValid = validFiles >= 2 && hasInfo; // 최소 2개 파일 + 메타데이터
            
            if (!isValid) {
                console.warn(`⚠️ 백업 무결성 문제: ${backupDir} (${validFiles}개 파일, 메타데이터: ${hasInfo})`);
            }
            
            return isValid;
            
        } catch (error) {
            console.error(`❌ 백업 검증 오류: ${backupDir} - ${error.message}`);
            return false;
        }
    }
    
    /**
     * 백업 리스트 조회
     */
    listBackups() {
        try {
            const backups = fs.readdirSync(this.timestampBackupDir)
                .filter(item => {
                    const fullPath = path.join(this.timestampBackupDir, item);
                    return fs.statSync(fullPath).isDirectory();
                })
                .sort()
                .reverse(); // 최신순
            
            console.log(`📋 총 ${backups.length}개 백업 발견:`);
            
            backups.slice(0, 10).forEach((backup, index) => {
                const backupPath = path.join(this.timestampBackupDir, backup);
                const infoFile = path.join(backupPath, 'backup-info.json');
                
                let info = { filesBackedUp: '?', backupDate: backup };
                if (fs.existsSync(infoFile)) {
                    try {
                        info = JSON.parse(fs.readFileSync(infoFile, 'utf8'));
                    } catch (e) {
                        // 메타데이터 읽기 실패
                    }
                }
                
                console.log(`  ${index + 1}. ${backup} (${info.filesBackedUp || '?'}개 파일, ${info.backupDate || '날짜 불명'})`);
            });
            
            if (backups.length > 10) {
                console.log(`  ... 및 ${backups.length - 10}개 더`);
            }
            
            return backups;
            
        } catch (error) {
            console.error(`❌ 백업 리스트 조회 실패: ${error.message}`);
            return [];
        }
    }
}

// CLI 실행
if (require.main === module) {
    const backupManager = new BackupManager();
    const args = process.argv.slice(2);
    const command = args[0] || 'backup';
    
    switch (command) {
        case 'backup':
            console.log('🔄 타임스탬프 백업 생성 중...');
            const result = backupManager.createTimestampBackup();
            if (result.success) {
                backupManager.cleanupOldBackups();
            }
            break;
            
        case 'verify':
            console.log('🔍 백업 무결성 검증 중...');
            backupManager.verifyBackups();
            break;
            
        case 'list':
            console.log('📋 백업 리스트 조회 중...');
            backupManager.listBackups();
            break;
            
        case 'cleanup':
            console.log('🗑️ 오래된 백업 정리 중...');
            backupManager.cleanupOldBackups();
            break;
            
        default:
            console.log(`
🛠️ KBO 백업 관리자

사용법:
  node backup-manager.js [command]

명령어:
  backup   - 새로운 타임스탬프 백업 생성 (기본값)
  verify   - 백업 무결성 검증
  list     - 백업 리스트 조회
  cleanup  - 오래된 백업 정리

예제:
  node backup-manager.js backup
  node backup-manager.js list
            `);
    }
}

module.exports = BackupManager;