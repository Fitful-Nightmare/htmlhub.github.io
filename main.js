/**
 * 小艾老师微课系统前端架构逻辑 (V5.3 - course_id独立字段版)
 * 
 * 主要变更：
 * 1. 前端输出格式增加 course_id 独立字段
 * 2. 将 course_id 从 content 中剥离
 * 3. 后端期望四个参数：signal_type、video_status、content、course_id
 */

// ==================== 配置区域 ====================
const CONFIG = {
    API_URL: 'https://api.coze.cn/v3/chat',  // 扣子API地址
    API_TOKEN: 'pat_hLMslFqT8KMQMVjlr7gLOwF5czE3kg19XEbiV52RnVEtbPfIl7vrz6rASkgDcOoT',  // 替换为调度Agent的API Token
    BOT_ID: '7630581119313838122',  // 替换为调度Agent的BOT_ID
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
let pausePoints = [];  // 动态暂停点
let knowledgeBoundary = 0;  // 知识区与习题区分界线（秒）
let triggeredPauses = new Set();

document.addEventListener('DOMContentLoaded', () => {
    video = document.getElementById('courseVideo');
    chatMessages = document.getElementById('chatMessages');
    chatInput = document.getElementById('chatInput');
    chatMessages.innerHTML = '';
    if (video) {
        video.removeAttribute('src');
        video.addEventListener('timeupdate', handleTimeUpdate);
    }
    bindEvents();
});

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
    
    // 发送选定信号：请求后端回传配置和开场白
    // 后端参数：signal_type、video_status、content、course_id
    const response = await sendToAgent({
        signal_type: "视频选定",
        video_status: "",  // 视频选定时状态为空
        content: `用户已选择《${courseName}》。`,  // content不再包含课程ID
        course_id: config.id  // 课程ID独立字段
    });
    processAgentReply(response);
}

// ==================== 2. 状态监测与信号发送 ====================
function handleTimeUpdate() {
    if (!currentCourse) return;
    const currentTime = Math.floor(video.currentTime);
    
    // 自动暂停判定
    if (pausePoints.includes(currentTime) && !triggeredPauses.has(currentTime)) {
        video.pause();
        triggeredPauses.add(currentTime);
        const status = getVideoStatus();
        
        // 发送暂停节点信号
        // 后端参数：signal_type、video_status、content、course_id
        sendToAgent({
            signal_type: "暂停时间节点",
            video_status: status,
            content: `${currentTime}s`,  // 节点时间作为content
            course_id: currentCourse.id  // 课程ID独立字段
        }).then(reply => processAgentReply(reply));
    }
}

function getVideoStatus(time = video.currentTime) {
    if (!currentCourse) return "未知";
    // 如果指定时间（或当前时间）小于分界线，则为知识区
    return time < knowledgeBoundary ? "知识区" : "习题区";
}

// ==================== 3. 指令解析器 (含跳转安全检查) ====================
function processAgentReply(rawContent) {
    if (!rawContent) return;
    
    // A. 注册暂停点指令 [CMD:SET_PAUSE|10,20]
    const pauseMatch = rawContent.match(/\[CMD:SET_PAUSE\|([\d,]+)\]/);
    if (pauseMatch) pausePoints = pauseMatch[1].split(',').map(n => parseInt(n.trim()));
    
    // B. 设置分界线指令 [CMD:SET_BOUNDARY|300]
    const boundaryMatch = rawContent.match(/\[CMD:SET_BOUNDARY\|(\d+)\]/);
    if (boundaryMatch) knowledgeBoundary = parseInt(boundaryMatch[1]);
    
    // C. 视频控制指令
    if (rawContent.includes('[CMD:PLAY]')) video.play().catch(()=>{});
    if (rawContent.includes('[CMD:PAUSE]')) video.pause();
    
    // D. 安全跳转指令 [CMD:JUMP|150]
    const jumpMatch = rawContent.match(/\[CMD:JUMP\|(\d+)\]/);
    if (jumpMatch) {
        const targetTime = parseInt(jumpMatch[1]);
        const currentStatus = getVideoStatus();  // 当前状态
        const targetStatus = getVideoStatus(targetTime);  // 目标点状态
        
        // 禁止从知识区跳转至习题区
        if (currentStatus === "知识区" && targetStatus === "习题区") {
            console.warn("跳转拦截：禁止从知识区直接跳转至习题区。");
            addMessage("【系统提示】老师认为你还需要夯实基础，暂不支持跳过知识环节哦。", "assistant");
        } else {
            video.currentTime = targetTime;
            video.play().catch(()=>{});
        }
    }
    
    // 过滤标签后显示文本
    const cleanText = rawContent.replace(/\[CMD:[^\]]*\]/g, '').trim();
    if (cleanText) addMessage(cleanText, 'assistant');
}

// ==================== 4. 通信逻辑（核心适配层）====================
async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || !currentCourse) return;
    chatInput.value = '';
    addMessage(text, 'user');
    
    const status = getVideoStatus();
    const currentTime = Math.floor(video.currentTime);
    
    // 构造一般对话信号
    // 后端参数：signal_type、video_status、content、course_id
    let content = text;
    
    // 【关键】习题区对话时，在content末尾添加当前视频时间
    if (status === "习题区") {
        content = `${text} 当前时间:${currentTime}s`;
    }
    
    const response = await sendToAgent({
        signal_type: "一般对话",
        video_status: status,
        content: content,
        course_id: currentCourse.id  // 课程ID独立字段
    });
    processAgentReply(response);
}

/**
 * 核心通信函数 - 发送结构化参数到调度Agent工作流
 * @param {Object} params - 结构化参数对象
 * @param {string} params.signal_type - 信号类型：视频选定 | 暂停时间节点 | 一般对话
 * @param {string} params.video_status - 视频状态：知识区 | 习题区 | (空)
 * @param {string} params.content - 具体内容
 * @param {string} params.course_id - 课程标识：COURSE_ZD | COURSE_WQ
 */
async function sendToAgent({ signal_type, video_status, content, course_id }) {
    showLoading(true);
    try {
        // 构造符合后端工作流输入格式的消息内容
        // 使用JSON格式传递参数，便于后端解析
        const messageContent = JSON.stringify({
            signal_type: signal_type,
            video_status: video_status,
            content: content,
            course_id: course_id
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
        
        // 处理异步响应：轮询获取完成状态
        if (result.data && result.data.status === 'completed') {
            return await fetchMessages(result.data.id, result.data.conversation_id);
        } else {
            return await pollStatus(result.data.id, result.data.conversation_id);
        }
    } catch (e) {
        console.error('通信异常:', e);
        return "通讯异常，请稍后重试。";
    } finally {
        showLoading(false);
    }
}

// ==================== 5. UI 与工具函数 ====================
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

function bindEvents() {
    document.getElementById('sendBtn').onclick = sendMessage;
    chatInput.onkeypress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };
}

function addMessage(text, role) {
    const div = document.createElement('div');
    div.className = `message ${role}-message`;
    div.innerHTML = `<div class="message-content">${text.replace(/\n/g, '<br>')}</div>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showLoading(show) {
    const loader = document.getElementById('loadingOverlay');
    if (loader) loader.classList.toggle('active', show);
}

// ==================== 6. 视频控制API（可选）====================
/**
 * 手动播放视频
 */
function playVideo() {
    if (video) video.play().catch(()=>{});
}

/**
 * 手动暂停视频
 */
function pauseVideo() {
    if (video) video.pause();
}

/**
 * 跳转到指定时间点
 * @param {number} seconds - 目标时间（秒）
 */
function jumpTo(seconds) {
    if (!video || !currentCourse) return;
    
    const currentStatus = getVideoStatus();
    const targetStatus = getVideoStatus(seconds);
    
    // 禁止从知识区跳转至习题区
    if (currentStatus === "知识区" && targetStatus === "习题区") {
        console.warn("跳转拦截：禁止从知识区直接跳转至习题区。");
        addMessage("【系统提示】老师认为你还需要夯实基础，暂不支持跳过知识环节哦。", "assistant");
        return;
    }
    
    video.currentTime = seconds;
    video.play().catch(()=>{});
}
