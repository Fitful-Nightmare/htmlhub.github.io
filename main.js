/**
 * 修改说明：
 * 1. 增加了对 backBtn 的事件监听，实现刷新功能。
 * 2. 删除了对 courseTitle 和 courseSubtitle 的初始化操作，防止 null 指针报错导致脚本挂起。
 * 3. 增强了 showLoading 的非空检查。
 */

// ==================== 配置区域 ====================
const CONFIG = {
    API_URL: 'https://api.coze.cn/v3/chat',
    API_TOKEN: 'pat_hLMslFqT8KMQMVjlr7gLOwF5czE3kg19XEbiV52RnVEtbPfIl7vrz6rASkgDcOoT',
    BOT_ID: '7630581119313838122',
    OSS_BASE_URL: 'https://aiteacheryaohongyu.oss-cn-shanghai.aliyuncs.com/',
    USER_ID: 'student_' + Date.now(),
    COURSES: {
        "中点四边形": { id: "COURSE_ZD", file: "video.mp4" },
        "完全平方和公式": { id: "COURSE_WQ", file: "video_1.mp4" }
    }
};

// ==================== 全局状态 ====================
let video = null;
let chatMessages = null;
let chatInput = null;
let currentCourse = null;
let pausePoints = [];
let knowledgeBoundary = 0;
let triggeredPauses = new Set();

document.addEventListener('DOMContentLoaded', () => {
    video = document.getElementById('courseVideo');
    chatMessages = document.getElementById('chatMessages');
    chatInput = document.getElementById('chatInput');
    
    // 修改点 9: 确保初次加载时 chatMessages 存在再操作
    if (chatMessages) chatMessages.innerHTML = '';
    
    if (video) {
        video.removeAttribute('src');
        video.addEventListener('timeupdate', handleTimeUpdate);
        
        // 进度条显示更新逻辑（旧版中缺失的联动）
        video.addEventListener('timeupdate', () => {
            const progress = (video.currentTime / video.duration) * 100;
            const fill = document.getElementById('progressFill');
            if (fill) fill.style.width = progress + '%';
            
            const cur = document.getElementById('currentTime');
            if (cur) cur.innerText = formatTime(video.currentTime);
            
            const dur = document.getElementById('duration');
            if (dur && !isNaN(video.duration)) dur.innerText = formatTime(video.duration);
        });
    }
    
    // 修改点 10: 移除了原本可能存在的对 courseTitle.innerText 的赋值操作
    
    bindEvents();
});

// 时间格式化辅助
function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

// ==================== 1. 选课与初始化 ====================
async function selectCourse(courseName) {
    const config = CONFIG.COURSES[courseName];
    if (!config) return;
    currentCourse = config;
    pausePoints = [];
    knowledgeBoundary = 0;
    triggeredPauses.clear();
    video.src = CONFIG.OSS_BASE_URL + config.file;
    video.load();
    document.getElementById('videoOverlay').classList.add('hidden');
    
    showLoading(true); // 调用加载
    const response = await sendToAgent({
        signal_type: "视频选定",
        video_status: "",
        content: `用户已选择《${courseName}》。`,
        course_id: config.id
    });
    showLoading(false);
    processAgentReply(response);
}

// ==================== 2. 状态监测与信号发送 ====================
function handleTimeUpdate() {
    if (!currentCourse) return;
    const currentTime = Math.floor(video.currentTime);
    
    if (pausePoints.includes(currentTime) && !triggeredPauses.has(currentTime)) {
        video.pause();
        triggeredPauses.add(currentTime);
        const status = getVideoStatus();
        
        sendToAgent({
            signal_type: "暂停时间节点",
            video_status: status,
            content: `${currentTime}s`,
            course_id: currentCourse.id
        }).then(reply => processAgentReply(reply));
    }
}

function getVideoStatus(time = video.currentTime) {
    if (!currentCourse) return "未知";
    return time < knowledgeBoundary ? "知识区" : "习题区";
}

// ==================== 3. 指令解析器 ====================
function processAgentReply(rawContent) {
    if (!rawContent) return;
    
    const pauseMatch = rawContent.match(/\[CMD:SET_PAUSE\|([\d,]+)\]/);
    if (pauseMatch) pausePoints = pauseMatch[1].split(',').map(n => parseInt(n.trim()));
    
    const boundaryMatch = rawContent.match(/\[CMD:SET_BOUNDARY\|(\d+)\]/);
    if (boundaryMatch) knowledgeBoundary = parseInt(boundaryMatch[1]);
    
    if (rawContent.includes('[CMD:PLAY]')) video.play().catch(()=>{});
    if (rawContent.includes('[CMD:PAUSE]')) video.pause();
    
    const jumpMatch = rawContent.match(/\[CMD:JUMP\|(\d+)\]/);
    if (jumpMatch) {
        const targetTime = parseInt(jumpMatch[1]);
        const currentStatus = getVideoStatus();
        const targetStatus = getVideoStatus(targetTime);
        
        if (currentStatus === "知识区" && targetStatus === "习题区") {
            addMessage("【系统提示】老师认为你还需要夯实基础，暂不支持跳过知识环节哦。", "assistant");
        } else {
            video.currentTime = targetTime;
            video.play().catch(()=>{});
        }
    }
    
    const cleanText = rawContent.replace(/\[CMD:[^\]]*\]/g, '').trim();
    if (cleanText) addMessage(cleanText, 'assistant');
}

// ==================== 4. 通信逻辑 ====================
async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || !currentCourse) return;
    chatInput.value = '';
    addMessage(text, 'user');
    
    const status = getVideoStatus();
    const currentTime = Math.floor(video.currentTime);
    let content = text;
    
    if (status === "习题区") {
        content = `${text} 当前时间:${currentTime}s`;
    }
    
    showLoading(true);
    const response = await sendToAgent({
        signal_type: "一般对话",
        video_status: status,
        content: content,
        course_id: currentCourse.id
    });
    showLoading(false);
    processAgentReply(response);
}

async function sendToAgent({ signal_type, video_status, content, course_id }) {
    try {
        const messageContent = JSON.stringify({
            signal_type, video_status, content, course_id
        });
        
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bot_id: CONFIG.BOT_ID,
                user_id: CONFIG.USER_ID,
                additional_messages: [{
                    role: 'user',
                    content: messageContent,
                    content_type: 'text'
                }]
            })
        });
        const result = await response.json();
        if (result.data && result.data.status === 'completed') {
            return await fetchMessages(result.data.id, result.data.conversation_id);
        } else {
            return await pollStatus(result.data.id, result.data.conversation_id);
        }
    } catch (e) {
        console.error('通信异常:', e);
        return "通讯异常，请稍后重试。";
    }
}

async function pollStatus(chatId, convId) {
    for (let i = 0; i < 40; i++) {
        const res = await fetch(`https://api.coze.cn/v3/chat/retrieve?conversation_id=${convId}&chat_id=${chatId}`, {
            headers: { 'Authorization': `Bearer ${CONFIG.API_TOKEN}` }
        });
        const d = await res.json();
        if (d.data.status === 'completed') return await fetchMessages(chatId, convId);
        await new Promise(r => setTimeout(r, 1000));
    }
    return "老师忙线中...";
}

async function fetchMessages(chatId, convId) {
    const res = await fetch(`https://api.coze.cn/v3/chat/message/list?conversation_id=${convId}&chat_id=${chatId}`, {
        headers: { 'Authorization': `Bearer ${CONFIG.API_TOKEN}` }
    });
    const j = await res.json();
    const ans = j.data.find(m => m.type === 'answer');
    return ans ? ans.content : "";
}

// ==================== 5. 事件绑定 ====================
function bindEvents() {
    // 修改点 11: 绑定返回按钮点击刷新
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.reload();
        });
    }

    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        sendBtn.onclick = sendMessage;
    }

    if (chatInput) {
        chatInput.onkeypress = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        };
    }
}

function addMessage(text, role) {
    if (!chatMessages) return;
    const div = document.createElement('div');
    div.className = `message ${role}-message`;
    div.innerHTML = `<div class="message-content">${text.replace(/\n/g, '<br>')}</div>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showLoading(show) {
    const loader = document.getElementById('loadingOverlay');
    // 修改点 12: 增强非空判断，防止 active 切换报错
    if (loader) {
        if (show) loader.classList.add('active');
        else loader.classList.remove('active');
    }
}
