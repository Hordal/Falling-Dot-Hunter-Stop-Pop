// --- DOM 요소 가져오기 ---
const mainMenu = document.getElementById('mainMenu');
const startButton = document.getElementById('startButton');
const highScoreDisplay = document.getElementById('highScore');
const gameScreen = document.getElementById('gameScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreDisplay = document.getElementById('finalScore');
const finalHighScoreDisplay = document.getElementById('finalHighScore');
const restartButton = document.getElementById('restartButton');
const toMenuButton = document.getElementById('toMenuButton');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const freezeTextElement = document.getElementById('freezeText');
const uiContainer = document.getElementById('uiContainer');

// --- UI 요소 동적 생성 ---
const timerSpan = document.createElement('p');
timerSpan.id = 'timer';

const scoreDisplay = document.createElement('p');
scoreDisplay.id = 'scoreDisplay';

const scoreSpan = document.createElement('span');
scoreSpan.id = 'score';
const livesSpan = document.createElement('p');
livesSpan.id = 'livesDisplay';

scoreDisplay.textContent = '점수: ';
scoreDisplay.appendChild(scoreSpan);
uiContainer.appendChild(timerSpan);
uiContainer.appendChild(livesSpan);
uiContainer.appendChild(scoreDisplay);

// 게임 설정 변수
const GAME_DURATION = 60; // 제한 시간: 60초
const MAX_LIVES = 3;      // 최대 목숨: 3개
const MAX_CIRCLES = 3;    // 최대 원 개수: 3개
const BASE_CIRCLE_RADIUS = 30; // 기본 원 반지름
const BONUS_CIRCLE_PROBABILITY = 0.1; // 보너스 원 등장 확률 (10%)
const BONUS_CIRCLE_MULTIPLIER = 3; // 보너스 원 점수 배율


let score = 0;
let timeRemaining = GAME_DURATION;
let lives = MAX_LIVES;
let timerInterval;
let isGameRunning = false;

let currentSpeedLevel = 0; // 현재 속도 레벨 (10점마다 1씩 증가)
const freezeMessage = "그대로 멈춰라";
let isFreezing = false;
let typingTimeout;
let freezeScheduleTimeout; // 모든 "그대로 멈춰라" 타이머 ID를 관리

// 원 객체 배열
let circles = [];

// 두 원이 겹치는지 확인하는 함수
function isOverlapping(newCircle, existingCircles) {
    for (let i = 0; i < existingCircles.length; i++) {
        const existing = existingCircles[i];
        
        const dx = newCircle.x - existing.x;
        const dy = newCircle.y - existing.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < (newCircle.r + existing.r + 5)) {
            return true;
        }
    }
    return false;
}

// 초기화 함수
function initGame() {
    isGameRunning = true;
    score = 0;
    timeRemaining = GAME_DURATION;
    lives = MAX_LIVES;
    scoreSpan.textContent = score;
    currentSpeedLevel = 0; // 게임 시작 시 속도 레벨 초기화
    updateLivesDisplay();
    updateTimerDisplay(); 

    clearInterval(timerInterval);
    clearTimeout(typingTimeout);
    clearTimeout(freezeScheduleTimeout); 
    
    freezeTextElement.style.display = 'none';
    isFreezing = false;
    
    // 원 초기화 및 생성
    circles = [];
    for(let i = 0; i < MAX_CIRCLES; i++) {
        createCircle(true); 
    }

    // 타이머 및 무궁화 게임 시작
    startTimer();
    // 게임 시작 후 5초 뒤에 첫 "그대로 멈춰라"를 시작합니다.
    freezeScheduleTimeout = setTimeout(startFreeze, 5000); 
}


// 랜덤 색상 생성 함수
function getRandomColor() {
    const colors = ["red", "blue", "green", "orange", "purple", "teal"];
    return colors[Math.floor(Math.random() * colors.length)];
}

// 원 생성 함수
function createCircle(isInitialCreation = false) {
    let r = BASE_CIRCLE_RADIUS;
    let isBonus = false;
    let circleColor = getRandomColor();

    // 낮은 확률로 보너스 원 생성
    if (Math.random() < BONUS_CIRCLE_PROBABILITY) {
        r = BASE_CIRCLE_RADIUS / 2; // 크기 절반
        isBonus = true;
        circleColor = "gold"; // 보너스 원은 황금색으로
    }

    let newCircle = {};
    let safeToCreate = false;
    let attempts = 0;
    const maxAttempts = 50; 

    while (!safeToCreate && attempts < maxAttempts) {
        const x = Math.random() * (canvas.width - r * 2) + r;
        const y = 0; // y 좌표를 항상 0(맨 위)으로 고정합니다.
        
        newCircle = {
            x : x,
            y : y,
            r : r,
            speed : (Math.random() * 1.5 + 1.5) + (currentSpeedLevel * 0.2),
            color : circleColor,
            isBonus: isBonus // 보너스 원 여부 추가
        };

        if (!isOverlapping(newCircle, circles)) {
            safeToCreate = true;
        }
        attempts++;
    }

    if (safeToCreate) {
        circles.push(newCircle);
    } else { // 겹치지 않는 위치를 찾지 못했을 경우, 강제로 생성 (보너스 속성 유지)
        newCircle.x = Math.random() * (canvas.width - r * 2) + r;
        newCircle.y = 0; // 폴백 시에도 0으로 설정
        circles.push(newCircle);
    }
}

// 원 리셋/목숨 차감 함수
function resetCircle(circleIndex) {
    if (circleIndex !== undefined) {
        lives--;
        updateLivesDisplay();
        
        if (lives <= 0) {
            endGame("목숨 모두 소진!");
            return;
        }

        circles.splice(circleIndex, 1);
        createCircle(); 
    }
}

// 타이머 표시 업데이트
function updateTimerDisplay() {
    timerSpan.textContent = `남은 시간: ${timeRemaining}초`;
}

// 목숨 표시 업데이트
function updateLivesDisplay() {
    livesSpan.textContent = `목숨: ${'❤️'.repeat(lives)}`;
}

// 제한 시간 타이머 시작
function startTimer() {
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();

        if (timeRemaining <= 0) {
            endGame("시간 초과!");
        }
    }, 1000);
}

// 게임 종료 함수
function endGame(reason) {
    if (!isGameRunning) return; // 중복 호출 방지
    isGameRunning = false;

    console.log(`게임 종료! (${reason}) 최종 점수: ${score}`);
    clearInterval(timerInterval);
    clearTimeout(typingTimeout);
    clearTimeout(freezeScheduleTimeout);
    
    // 최고 점수 확인 및 갱신
    const currentHighScore = localStorage.getItem('highScore') || 0;
    if (score > currentHighScore) {
        localStorage.setItem('highScore', score);
        updateHighScoreDisplay(); // 메인 메뉴의 최고 점수도 업데이트
    }

    showGameOverScreen();
}

// '그대로 멈춰라' 위반으로 인한 목숨 차감
function gameOver() {
    // ⭐⭐ 수정 완료: 움직이면 목숨 3개 모두 소진!
    alert("움직여서 탈락!");
    lives = 0; // 목숨을 0으로 설정
    updateLivesDisplay();
    
    endGame("움직여서 탈락");
}

// "그대로 멈춰라" 타이핑 함수 (다음 이벤트 예약 담당)
function typeFreezeMessage(index) {
    isFreezing = false;
    if (index < freezeMessage.length) {
        freezeTextElement.textContent += freezeMessage[index];
        const randomSpeed = Math.random() * 200 + 100; 
        typingTimeout = setTimeout(() => typeFreezeMessage(index + 1), randomSpeed);
    } else {
        isFreezing = true;
        
        // ⭐⭐ 수정 완료: 1초(1000ms) 후 '얼음' 상태 해제 및 다음 이벤트 예약
        setTimeout(() => {
            freezeTextElement.style.display = 'none';
            isFreezing = false;
            // 정상 종료 시 다음 이벤트 예약 (루프 유지)
            scheduleNextFreeze();
        }, 1000); // 1.5초(1500) -> 1초(1000)로 변경
    }
}

// "그대로 멈춰라" 시작 함수
function startFreeze() {
    clearTimeout(typingTimeout);
    freezeTextElement.textContent = '';
    freezeTextElement.style.display = 'block';
    typeFreezeMessage(0);
}

// 다음 "그대로 멈춰라" 이벤트 예약 함수 (랜덤 5초 ~ 8초)
function scheduleNextFreeze() {
    // 다음 이벤트를 예약하기 전에 현재 예약된 이벤트를 취소합니다.
    clearTimeout(freezeScheduleTimeout);
    // 5초 ~ 8초 사이의 랜덤한 지연 시간을 설정합니다.
    const randomDelay = Math.random() * 3000 + 5000; 
    // 새로운 타이머를 설정하고 ID를 freezeScheduleTimeout에 저장합니다.
    freezeScheduleTimeout = setTimeout(startFreeze, randomDelay);
}


// 원 그리기 함수
function drawCircle(circle) {
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.r, 0, Math.PI * 2); 
    ctx.fillStyle = circle.color;
    ctx.fill();
    ctx.closePath();
}

// 게임 업데이트 함수 생성 (메인 루프)
function updateGame() {
    if (!isGameRunning) return; // 게임이 실행 중이 아닐 때 루프 중단
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let i = 0; i < circles.length; i++) {
        let circle = circles[i];
        drawCircle(circle);
        
        circle.y += circle.speed; 

        if (circle.y - circle.r > canvas.height) {
            resetCircle(i); 
            i--; 
        }
    }

    requestAnimationFrame(updateGame);
}

// 원클릭 이벤트 함수 생성
canvas.addEventListener('click', function(event) {
    if (isFreezing) {
        // '그대로 멈춰라' 상태에서 클릭 시 즉시 게임 오버
        gameOver(); 
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    let circleClicked = false; // 원 클릭 여부를 확인하는 플래그
    
    for (let i = 0; i < circles.length; i++) {
        let circle = circles[i];
        const dx = mouseX - circle.x;
        const dy = mouseY - circle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < circle.r) {
            const oldScore = score; // 점수 변경 전의 점수 저장

            if (circle.isBonus) {
                score += BONUS_CIRCLE_MULTIPLIER; // 보너스 원은 3배 점수
            } else {
                score++; // 일반 원은 1점
            }
            scoreSpan.textContent = score;

            // 점수 구간이 변경되었는지 확인하여 모든 원의 속도 업데이트
            const newSpeedLevel = Math.floor(score / 10);
            if (newSpeedLevel > currentSpeedLevel) {
                const speedIncreaseAmount = (newSpeedLevel - currentSpeedLevel) * 0.2;
                circles.forEach(c => c.speed += speedIncreaseAmount);
                currentSpeedLevel = newSpeedLevel;
            }
            
            circles.splice(i, 1);
            createCircle(); 
            
            circleClicked = true; // 원을 클릭했음을 표시
            break; // 하나의 원만 클릭되도록 루프 중단
        }
    }
});

// --- 화면 전환 함수 ---
function showMainMenu() {
    mainMenu.classList.remove('hidden');
    gameOverScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');
}

function updateHighScoreDisplay() {
    const currentHighScore = localStorage.getItem('highScore') || 0;
    highScoreDisplay.textContent = `최고 점수: ${currentHighScore}`;
}

function showGameOverScreen() {
    const currentHighScore = localStorage.getItem('highScore') || 0;
    finalScoreDisplay.textContent = `최종 점수: ${score}`;
    finalHighScoreDisplay.textContent = `최고 기록: ${currentHighScore}`;

    gameScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
}

function showGameScreen() {
    mainMenu.classList.add('hidden');
    gameScreen.classList.remove('hidden');
}

// --- 게임 시작 이벤트 ---
startButton.addEventListener('click', () => {
    showGameScreen();
    initGame();
    // updateGame 루프는 initGame 내에서 시작되지 않으므로 여기서 한 번 호출해줍니다.
    updateGame();
});

// --- 게임 종료 화면 버튼 이벤트 ---
restartButton.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    showGameScreen();
    initGame();
    updateGame();
});

toMenuButton.addEventListener('click', showMainMenu);

// --- 초기 상태 설정 ---
// 페이지 로드 시 메인 메뉴를 표시합니다.
updateHighScoreDisplay();
showMainMenu();