const path = require('path');
const fs = require('fs');

/**
 * 중앙화된 경로 관리 시스템
 * 프로젝트 루트를 자동으로 감지하고 모든 경로를 절대경로로 관리
 */
class PathManager {
    constructor() {
        this.projectRoot = this.findProjectRoot();
        this.magicNumberRoot = path.join(this.projectRoot, 'magic-number');
        this.dataDir = path.join(this.magicNumberRoot, 'data');
        this.jsDir = path.join(this.magicNumberRoot, 'js');
        this.crawlersDir = path.join(this.magicNumberRoot, 'crawlers');
        this.cssDir = path.join(this.magicNumberRoot, 'css');
        this.imagesDir = path.join(this.magicNumberRoot, 'images');
        this.iconsDir = path.join(this.magicNumberRoot, 'icons');
        this.utilsDir = path.join(this.magicNumberRoot, 'utils');
        this.screenshotsDir = path.join(this.magicNumberRoot, 'screenshots');
        this.archiveDir = path.join(this.projectRoot, 'archive');
        this.docsDir = path.join(this.projectRoot, 'docs');
        this.logsDir = path.join(this.projectRoot, 'logs');
    }

    /**
     * package.json이 있는 프로젝트 루트 디렉토리를 찾습니다
     */
    findProjectRoot() {
        let currentDir = __dirname;
        
        // 최대 10단계까지만 상위 디렉토리를 찾습니다 (무한루프 방지)
        for (let i = 0; i < 10; i++) {
            const packageJsonPath = path.join(currentDir, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                return currentDir;
            }
            
            const parentDir = path.dirname(currentDir);
            if (parentDir === currentDir) {
                // 루트 디렉토리에 도달한 경우
                break;
            }
            currentDir = parentDir;
        }
        
        throw new Error('프로젝트 루트를 찾을 수 없습니다. package.json이 있는 디렉토리가 필요합니다.');
    }

    /**
     * data 디렉토리의 파일 경로를 반환합니다
     */
    getDataFile(filename) {
        return path.join(this.dataDir, filename);
    }

    /**
     * js 디렉토리의 파일 경로를 반환합니다
     */
    getJsFile(filename) {
        return path.join(this.jsDir, filename);
    }

    /**
     * crawlers 디렉토리의 파일 경로를 반환합니다
     */
    getCrawlerFile(filename) {
        return path.join(this.crawlersDir, filename);
    }

    /**
     * 지정된 디렉토리가 없으면 생성합니다
     */
    ensureDir(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        return dirPath;
    }

    /**
     * 파일이 존재하는지 확인합니다
     */
    exists(filePath) {
        return fs.existsSync(filePath);
    }

    /**
     * 여러 가능한 파일 경로 중 존재하는 첫 번째 파일을 찾습니다
     */
    findExistingFile(possiblePaths) {
        for (const filePath of possiblePaths) {
            if (this.exists(filePath)) {
                return filePath;
            }
        }
        return null;
    }

    /**
     * 현재 연도의 시즌 데이터 파일을 찾습니다
     */
    findSeasonDataFile() {
        const currentYear = new Date().getFullYear();
        const possibleFiles = [
            this.getDataFile(`${currentYear}-season-data-clean.txt`),
            this.getDataFile('2025-season-data-clean.txt'),
            this.getDataFile('season-data-clean.txt'),
            this.getDataFile('clean.txt')
        ];

        return this.findExistingFile(possibleFiles);
    }

    /**
     * 로그 파일 경로를 생성합니다
     */
    getLogFile(filename) {
        this.ensureDir(this.logsDir);
        return path.join(this.logsDir, filename);
    }

    /**
     * 현재 경로 설정을 출력합니다 (디버깅용)
     */
    printPaths() {
        console.log('📁 KBO Project Paths:');
        console.log(`  Project Root: ${this.projectRoot}`);
        console.log(`  Magic Number: ${this.magicNumberRoot}`);
        console.log(`  Data:         ${this.dataDir}`);
        console.log(`  JS:           ${this.jsDir}`);
        console.log(`  Crawlers:     ${this.crawlersDir}`);
        console.log(`  Logs:         ${this.logsDir}`);
    }

    /**
     * 필수 디렉토리들이 존재하는지 확인합니다
     */
    validatePaths() {
        const requiredPaths = [
            this.projectRoot,
            this.magicNumberRoot,
            this.dataDir,
            this.jsDir
        ];

        const missing = requiredPaths.filter(p => !this.exists(p));
        
        if (missing.length > 0) {
            throw new Error(`필수 경로가 존재하지 않습니다: ${missing.join(', ')}`);
        }

        return true;
    }
}

// 싱글톤 인스턴스로 export
module.exports = new PathManager();