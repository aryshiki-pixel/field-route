// グローバル変数
let canvas, ctx;
let backgroundImage = null;
let imageScale = 1;
let imageOffsetX = 0;
let imageOffsetY = 0;
let mode = 'none';
let fieldPoints = [];
let tempPoint = null;
let selectedPointIndex = -1;
let entryPoint = null;
let exitPoint = null;
let route = [];
const PIXEL_TO_CM = 10;

// DOM要素
let menuToggle, sidebar, drawBtn, editBtn, clearBtn;
let setEntryBtn, setExitBtn, generateBtn;
let status, coords, areaInfo, pointInfo, routeInfo;
let imageUpload, imagePreview, previewImg, imageControls;
let fitImageBtn, removeImageBtn;

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    menuToggle = document.getElementById('menuToggle');
    sidebar = document.getElementById('sidebar');
    drawBtn = document.getElementById('drawBtn');
    editBtn = document.getElementById('editBtn');
    clearBtn = document.getElementById('clearBtn');
    setEntryBtn = document.getElementById('setEntryBtn');
    setExitBtn = document.getElementById('setExitBtn');
    generateBtn = document.getElementById('generateBtn');
    status = document.getElementById('status');
    coords = document.getElementById('coords');
    areaInfo = document.getElementById('areaInfo');
    pointInfo = document.getElementById('pointInfo');
    routeInfo = document.getElementById('routeInfo');
    imageUpload = document.getElementById('imageUpload');
    imagePreview = document.getElementById('imagePreview');
    previewImg = document.getElementById('previewImg');
    imageControls = document.getElementById('imageControls');
    fitImageBtn = document.getElementById('fitImageBtn');
    removeImageBtn = document.getElementById('removeImageBtn');

    setupEventListeners();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    draw();
}

function setupEventListeners() {
    menuToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        sidebar.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        }
    });

    imageUpload.addEventListener('change', handleImageUpload);
    fitImageBtn.addEventListener('click', () => {
        fitImageToCanvas();
        draw();
    });
    removeImageBtn.addEventListener('click', handleImageRemove);

    drawBtn.addEventListener('click', startDrawing);
    editBtn.addEventListener('click', startEditing);
    clearBtn.addEventListener('click', clearAll);
    setEntryBtn.addEventListener('click', () => {
        mode = 'setEntry';
        updateUI();
        status.textContent = '田んぼの境界線上で入口をクリック';
    });
    setExitBtn.addEventListener('click', () => {
        mode = 'setExit';
        updateUI();
        status.textContent = '田んぼの境界線上で出口をクリック';
    });
    generateBtn.addEventListener('click', generateRoute);

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchend', handleTouchEnd);
}

function handleImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                backgroundImage = img;
                previewImg.src = event.target.result;
                imagePreview.style.display = 'block';
                imageControls.style.display = 'flex';
                fitImageToCanvas();
                draw();
                status.textContent = '航空写真を読み込みました';
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function handleImageRemove() {
    if (confirm('航空写真を削除しますか？')) {
        backgroundImage = null;
        imagePreview.style.display = 'none';
        imageControls.style.display = 'none';
        imageUpload.value = '';
        draw();
        status.textContent = '航空写真を削除しました';
    }
}

function fitImageToCanvas() {
    if (!backgroundImage) return;
    const canvasAspect = canvas.width / canvas.height;
    const imageAspect = backgroundImage.width / backgroundImage.height;
    if (canvasAspect > imageAspect) {
        imageScale = canvas.height / backgroundImage.height;
        imageOffsetX = (canvas.width - backgroundImage.width * imageScale) / 2;
        imageOffsetY = 0;
    } else {
        imageScale = canvas.width / backgroundImage.width;
        imageOffsetX = 0;
        imageOffsetY = (canvas.height - backgroundImage.height * imageScale) / 2;
    }
}

function startDrawing() {
    mode = 'drawing';
    fieldPoints = [];
    tempPoint = null;
    entryPoint = null;
    exitPoint = null;
    route = [];
    updateUI();
    status.textContent = 'クリックで点を追加（最初の点をクリックで完成）';
}

function startEditing() {
    mode = 'editing';
    updateUI();
    status.textContent = '点をドラッグして移動';
}

function clearAll() {
    if (confirm('全てクリアしますか？')) {
        fieldPoints = [];
        tempPoint = null;
        entryPoint = null;
        exitPoint = null;
        route = [];
        mode = 'none';
        updateUI();
        status.textContent = 'クリアしました';
    }
}

function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    coords.textContent = `X: ${Math.round(x)}, Y: ${Math.round(y)}`;
    if (mode === 'drawing' && fieldPoints.length > 0) {
        tempPoint = { x, y };
        draw();
    } else if (mode === 'editing' && selectedPointIndex >= 0) {
        fieldPoints[selectedPointIndex] = { x, y };
        draw();
        calculateArea();
    }
}

function handleMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    handlePointerDown(x, y);
}

function handleMouseUp() {
    handlePointerUp();
}

function handleTouchMove(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    if (mode === 'drawing' && fieldPoints.length > 0) {
        tempPoint = { x, y };
        draw();
    } else if (mode === 'editing' && selectedPointIndex >= 0) {
        fieldPoints[selectedPointIndex] = { x, y };
        draw();
        calculateArea();
    }
}

function handleTouchStart(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    handlePointerDown(x, y);
}

function handleTouchEnd(e) {
    e.preventDefault();
    handlePointerUp();
}

function handlePointerDown(x, y) {
    if (mode === 'drawing') {
        if (fieldPoints.length >= 3) {
            const firstPoint = fieldPoints[0];
            const dist = Math.hypot(x - firstPoint.x, y - firstPoint.y);
            if (dist < 15) {
                mode = 'none';
                calculateArea();
                updateUI();
                status.textContent = '範囲の設定が完了しました';
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                }
                return;
            }
        }
        fieldPoints.push({ x, y });
        draw();
    } else if (mode === 'editing') {
        let minDist = Infinity;
        let minIndex = -1;
        fieldPoints.forEach((p, i) => {
            const dist = Math.hypot(x - p.x, y - p.y);
            if (dist < minDist && dist < 20) {
                minDist = dist;
                minIndex = i;
            }
        });
        selectedPointIndex = minIndex;
    } else if (mode === 'setEntry') {
        entryPoint = findNearestPointOnBoundary(x, y);
        mode = 'none';
        updateUI();
        updatePointInfo();
        status.textContent = '入口を設定しました';
    } else if (mode === 'setExit') {
        exitPoint = findNearestPointOnBoundary(x, y);
        mode = 'none';
        updateUI();
        updatePointInfo();
        status.textContent = '出口を設定しました';
    }
}

function handlePointerUp() {
    if (mode === 'editing') {
        selectedPointIndex = -1;
        calculateArea();
    }
}

function findNearestPointOnBoundary(x, y) {
    let minDist = Infinity;
    let nearestPoint = null;
    for (let i = 0; i < fieldPoints.length; i++) {
        const p1 = fieldPoints[i];
        const p2 = fieldPoints[(i + 1) % fieldPoints.length];
        const point = nearestPointOnSegment(x, y, p1, p2);
        const dist = Math.hypot(x - point.x, y - point.y);
        if (dist < minDist) {
            minDist = dist;
            nearestPoint = point;
        }
    }
    return nearestPoint;
}

function nearestPointOnSegment(px, py, p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const t = Math.max(0, Math.min(1, ((px - p1.x) * dx + (py - p1.y) * dy) / (dx * dx + dy * dy)));
    return { x: p1.x + t * dx, y: p1.y + t * dy };
}

function calculateArea() {
    if (fieldPoints.length < 3) {
        areaInfo.innerHTML = '面積: 未計算';
        return;
    }
    let area = 0;
    for (let i = 0; i < fieldPoints.length; i++) {
        const j = (i + 1) % fieldPoints.length;
        area += fieldPoints[i].x * fieldPoints[j].y;
        area -= fieldPoints[j].x * fieldPoints[i].y;
    }
    area = Math.abs(area / 2);
    const areaCm2 = area * PIXEL_TO_CM * PIXEL_TO_CM;
    const areaM2 = areaCm2 / 10000;
    const areaTsubo = areaM2 / 3.30579;
    areaInfo.innerHTML = `<strong>面積:</strong><br>${areaM2.toFixed(1)} m² (${areaTsubo.toFixed(1)} 坪)`;
}

function updatePointInfo() {
    const entryText = entryPoint ? '設定済み ✓' : '未設定';
    const exitText = exitPoint ? '設定済み ✓' : '未設定';
    pointInfo.innerHTML = `入口: ${entryText}<br>出口: ${exitText}`;
}

function updateUI() {
    const hasField = fieldPoints.length >= 3 && mode !== 'drawing';
    drawBtn.classList.toggle('active', mode === 'drawing');
    editBtn.disabled = !hasField;
    editBtn.classList.toggle('active', mode === 'editing');
    clearBtn.disabled = fieldPoints.length === 0;
    setEntryBtn.disabled = !hasField;
    setEntryBtn.classList.toggle('active', mode === 'setEntry');
    setExitBtn.disabled = !hasField;
    setExitBtn.classList.toggle('active', mode === 'setExit');
    generateBtn.disabled = !(hasField && entryPoint && exitPoint);
    draw();
}

function generateRoute() {
    const workWidth = parseInt(document.getElementById('workWidth').value);
    const overlapWidth = parseInt(document.getElementById('overlapWidth').value);
    const perimeterRounds = parseInt(document.getElementById('perimeterRounds').value);
    const effectiveWidth = (workWidth - overlapWidth) / PIXEL_TO_CM;
    route = [];
    for (let i = 0; i < perimeterRounds; i++) {
        const offset = i * effectiveWidth;
        const perimeterPath = createOffsetPolygon(fieldPoints, -offset);
        if (perimeterPath.length > 0) {
            route.push(...perimeterPath);
        }
    }
    const innerPolygon = createOffsetPolygon(fieldPoints, -(perimeterRounds * effectiveWidth));
    if (innerPolygon.length > 0) {
        const bounds = getBounds(innerPolygon);
        const innerRoute = createBackAndForthPattern(innerPolygon, bounds, effectiveWidth);
        route.push(...innerRoute);
    }
    const totalDistance = calculateRouteDistance(route);
    const distanceM = (totalDistance * PIXEL_TO_CM) / 100;
    routeInfo.style.display = 'block';
    routeInfo.innerHTML = `<strong>ルート生成完了</strong><br>総移動距離: ${distanceM.toFixed(1)} m<br>外周周回: ${perimeterRounds}回<br>ルートポイント数: ${route.length}`;
    status.textContent = 'ルートが生成されました';
    draw();
}

function createOffsetPolygon(points, offset) {
    if (points.length < 3) return [];
    const result = [];
    for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy);
        const nx = -dy / len;
        const ny = dx / len;
        result.push({ x: p1.x + nx * offset, y: p1.y + ny * offset });
    }
    return result;
}

function getBounds(points) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    });
    return { minX, minY, maxX, maxY };
}

function createBackAndForthPattern(polygon, bounds, width) {
    const pattern = [];
    let y = bounds.minY;
    let direction = 1;
    while (y <= bounds.maxY) {
        const intersections = [];
        for (let i = 0; i < polygon.length; i++) {
            const p1 = polygon[i];
            const p2 = polygon[(i + 1) % polygon.length];
            if ((p1.y <= y && p2.y > y) || (p2.y <= y && p1.y > y)) {
                const t = (y - p1.y) / (p2.y - p1.y);
                const x = p1.x + t * (p2.x - p1.x);
                intersections.push(x);
            }
        }
        intersections.sort((a, b) => a - b);
        for (let i = 0; i < intersections.length; i += 2) {
            if (i + 1 < intersections.length) {
                if (direction === 1) {
                    pattern.push({ x: intersections[i], y });
                    pattern.push({ x: intersections[i + 1], y });
                } else {
                    pattern.push({ x: intersections[i + 1], y });
                    pattern.push({ x: intersections[i], y });
                }
            }
        }
        y += width;
        direction *= -1;
    }
    return pattern;
}

function calculateRouteDistance(route) {
    let dist = 0;
    for (let i = 1; i < route.length; i++) {
        dist += Math.hypot(route[i].x - route[i-1].x, route[i].y - route[i-1].y);
    }
    return dist;
}

function resizeCanvas() {
    const container = document.getElementById('map-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    draw();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (backgroundImage) {
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.drawImage(backgroundImage, imageOffsetX, imageOffsetY, backgroundImage.width * imageScale, backgroundImage.height * imageScale);
        ctx.restore();
    } else {
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        const gridSize = 1000 / PIXEL_TO_CM;
        for (let x = 0; x < canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }
    if (fieldPoints.length > 0) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 4;
        ctx.fillStyle = 'rgba(52, 152, 219, 0.2)';
        ctx.beginPath();
        ctx.moveTo(fieldPoints[0].x, fieldPoints[0].y);
        for (let i = 1; i < fieldPoints.length; i++) {
            ctx.lineTo(fieldPoints[i].x, fieldPoints[i].y);
        }
        if (mode !== 'drawing') {
            ctx.closePath();
            ctx.fill();
        } else if (tempPoint) {
            ctx.lineTo(tempPoint.x, tempPoint.y);
        }
        ctx.stroke();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        fieldPoints.forEach((p, i) => {
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = i === selectedPointIndex ? '#e74c3c' : '#3498db';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    if (entryPoint) {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(entryPoint.x, entryPoint.y, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#27ae60';
        ctx.beginPath();
        ctx.arc(entryPoint.x, entryPoint.y, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('入', entryPoint.x, entryPoint.y);
    }
    if (exitPoint) {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(exitPoint.x, exitPoint.y, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#e67e22';
        ctx.beginPath();
        ctx.arc(exitPoint.x, exitPoint.y, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('出', exitPoint.x, exitPoint.y);
    }
    if (route.length > 1) {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 5;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(route[0].x, route[0].y);
        for (let i = 1; i < route.length; i++) {
            ctx.lineTo(route[i].x, route[i].y);
        }
        ctx.stroke();
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(route[0].x, route[0].y);
        for (let i = 1; i < route.length; i++) {
            ctx.lineTo(route[i].x, route[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(route[0].x, route[0].y, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#27ae60';
        ctx.beginPath();
        ctx.arc(route[0].x, route[0].y, 9, 0, Math.PI * 2);
        ctx.fill();
        if (route.length > 0) {
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(route[route.length-1].x, route[route.length-1].y, 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            ctx.arc(route[route.length-1].x, route[route.length-1].y, 9, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
