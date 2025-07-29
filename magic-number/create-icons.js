const fs = require('fs');
const { createCanvas } = require('canvas');

// 아이콘 크기들
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

function createIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // 그라데이션 배경
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#1a237e');
    gradient.addColorStop(1, '#3949ab');
    
    // 배경 그리기
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    // 둥근 모서리 만들기
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, size * 0.15);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    
    // 텍스트 스타일 설정
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if (size >= 192) {
        // 큰 아이콘: 야구공 + KBO + 매직넘버
        ctx.font = `${size * 0.15}px Arial`;
        ctx.fillText('⚾', size / 2, size * 0.2);
        
        ctx.font = `bold ${size * 0.25}px Arial`;
        ctx.fillText('KBO', size / 2, size * 0.5);
        
        ctx.font = `${size * 0.1}px Arial`;
        ctx.fillText('매직넘버', size / 2, size * 0.75);
    } else if (size >= 128) {
        // 중간 아이콘: KBO + 야구공
        ctx.font = `${size * 0.12}px Arial`;
        ctx.fillText('⚾', size / 2, size * 0.25);
        
        ctx.font = `bold ${size * 0.35}px Arial`;
        ctx.fillText('KBO', size / 2, size * 0.65);
    } else {
        // 작은 아이콘: KBO만
        ctx.font = `bold ${size * 0.4}px Arial`;
        ctx.fillText('KBO', size / 2, size / 2);
    }
    
    return canvas.toBuffer('image/png');
}

// 모든 크기의 아이콘 생성
console.log('🎨 KBO 매직넘버 아이콘 생성 시작...');

sizes.forEach(size => {
    try {
        const iconBuffer = createIcon(size);
        const filename = `./icons/icon-${size}x${size}.png`;
        fs.writeFileSync(filename, iconBuffer);
        console.log(`✅ 생성 완료: ${filename}`);
    } catch (error) {
        console.error(`❌ 아이콘 생성 실패 (${size}x${size}):`, error.message);
    }
});

console.log('🎉 모든 아이콘 생성 완료!');