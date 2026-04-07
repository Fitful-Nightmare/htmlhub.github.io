// ==================== 配置区域 ====================
const CONFIG = {
    // 扣子API配置
    API_URL: 'https://api.coze.cn/v3/chat',
    API_TOKEN: 'pat_Lky4npo9KhdjkggnB2i6gotKbfY7DlzCjZbATBhqv1YbUXD1g81F7TXt5UCA83OG',
    BOT_ID: '7625443699455557674',

    // 视频控制时间点（秒）
    VIDEO_PAUSE_TIME: 385,  // 6分25秒暂停（第一道测试题）
    VIDEO_PAUSE_TIME_2: 390,  // 第二道测试题暂停时间
    VIDEO_PAUSE_TIME_3: 395,  // 第三道测试题暂停时间
    VIDEO_JUMP_TIME: 152,   // 2分32秒跳转（特殊平行四边形的中点四边形）

    // 用户ID（可自定义）
    USER_ID: 'student_' + Date.now()
};

// ==================== 全局变量 ====================
let video = null;
let startBtn = null;
let sendBtn = null;
let chatInput = null;
let chatMessages = null;
let conversationId = null;
let hasStarted = false;
let currentQuestion = 0;  // 当前题目编号（0表示不在题目阶段，1-3表示对应的题目）

// ==================== 页面初始化 ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面加载完成，开始初始化...');

    // 获取DOM元素
    video = document.getElementById('courseVideo');
    startBtn = document.getElementById('startBtn');
    sendBtn = document.getElementById('sendBtn');
    chatInput = document.getElementById('chatInput');
    chatMessages = document.getElementById('chatMessages');

    console.log('视频元素:', video);
    console.log('开始学习按钮:', startBtn);
    console.log('发送按钮:', sendBtn);

    // 设置视频源（OSS在线链接）
    if (video) {
        video.src = 'https://aiteacheryaohongyu.oss-cn-shanghai.aliyuncs.com/video.mp4';
        console.log('已设置视频源（OSS在线）:', video.src);
    }

    // 绑定事件
    bindEvents();

    console.log('初始化完成');
});

// ==================== 事件绑定 ====================
function bindEvents() {
    console.log('绑定事件...');

    // 开始学习按钮
    if (startBtn) {
        startBtn.addEventListener('click', function() {
            console.log('点击了开始学习按钮');
            startLearning();
        });
    }

    // 发送消息按钮
    if (sendBtn) {
        sendBtn.addEventListener('click', function() {
            console.log('点击了发送按钮');
            sendMessage();
        });
    }

    // 输入框回车发送
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                console.log('按下回车键');
                sendMessage();
            }
        });
    }

    // 恢复视频进度监听，在题目时间点自动暂停并通知Agent
video.addEventListener('timeupdate', function() {
    const currentTime = Math.floor(video.currentTime);
    
    // 检查第一道测试题（385秒）
    if (currentTime === CONFIG.VIDEO_PAUSE_TIME && currentQuestion === 0) {
        currentQuestion = 1;
        video.pause();
        updatePlayButtonState(false);
        console.log('到达第一道测试题位置，暂停视频并通知Agent');
        // 通知Agent
        notifyAgentPause(1);
    }
    
    // 检查第二道测试题（时间待确认）
    if (CONFIG.VIDEO_PAUSE_TIME_2 > 0 && 
        currentTime === CONFIG.VIDEO_PAUSE_TIME_2 && 
        currentQuestion === 1) {
        currentQuestion = 2;
        video.pause();
        updatePlayButtonState(false);
        console.log('到达第二道测试题位置，暂停视频并通知Agent');
        notifyAgentPause(2);
    }
    
    // 检查第三道测试题（时间待确认）
    if (CONFIG.VIDEO_PAUSE_TIME_3 > 0 && 
        currentTime === CONFIG.VIDEO_PAUSE_TIME_3 && 
        currentQuestion === 2) {
        currentQuestion = 3;
        video.pause();
        updatePlayButtonState(false);
        console.log('到达第三道测试题位置，暂停视频并通知Agent');
        notifyAgentPause(3);
    }
});

        video.addEventListener('canplay', function() {
            console.log('视频可以播放');
        });

        // 移除自动暂停逻辑，完全由Agent控制

    async function notifyAgentPause(questionNum) {
    const message = '视频已暂停在第' + questionNum + '道测试题处';
    addMessage(message, 'user');
    showLoading(true);
    const reply = await callCozeAPI(message);
    addMessage(reply, 'assistant');
    showLoading(false);
    }
}

// ==================== 开始学习 ====================
function startLearning() {
    if (hasStarted) {
        console.log('已经开始了，跳过');
        return;
    }

    hasStarted = true;

    // 隐藏视频遮罩层
    const videoOverlay = document.getElementById('videoOverlay');
    if (videoOverlay) {
        videoOverlay.classList.add('hidden');
    }

    // 播放视频
    if (video) {
        console.log('尝试播放视频...');
        video.play().then(function() {
            console.log('视频开始播放');
        }).catch(function(error) {
            console.error('视频播放失败:', error);
        });
    }

    // 发送初始消息
    sendInitialMessage();
}

// ==================== 发送初始消息 ====================
async function sendInitialMessage() {
    const initialMessage = '你好，我想学习中点四边形';
    addMessage(initialMessage, 'user');
    showLoading(true);
    const reply = await callCozeAPI(initialMessage);
    addMessage(reply, 'assistant');
    showLoading(false);
}

// ==================== 发送消息 ====================
async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) {
        console.log('消息为空，跳过');
        return;
    }

    chatInput.value = '';
    
    // 如果视频正在播放，添加当前进度信息
    let finalMessage = message;
    if (video && !video.paused && currentQuestion > 0) {
        finalMessage = message + '（当前视频进度：' + Math.floor(video.currentTime) + '秒）';
    }
    
    addMessage(finalMessage, 'user');
    showLoading(true);
    const reply = await callCozeAPI(finalMessage);
    addMessage(reply, 'assistant');
    showLoading(false);
}

// ==================== 添加消息到聊天区域 ====================
function addMessage(content, role) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ' + (role === 'user' ? 'user-message' : 'assistant-message');
    messageDiv.innerHTML = '<div class="message-content">' + formatMessage(content) + '</div>';
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // 如果是AI回复，检查是否有视频控制指令
    if (role === 'assistant') {
        const videoControl = parseVideoControl(content);
        if (videoControl) {
            executeVideoControl(videoControl);
        }
    }
}

// ==================== 格式化消息内容 ====================
function formatMessage(content) {
    // 移除视频控制指令（不显示给学生看）
    content = content.replace(/\[VIDEO:[^\]]*/g, '');

    // 移除代码片段（过滤掉```代码块）
    content = content.replace(/```[\s\S]*?```/g, '[代码已隐藏]');

    // 移除Markdown图片格式（Agent不再输出图片）
    content = content.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');

    // 处理换行
    return content.replace(/\n/g, '<br>');
}

// ==================== 解析视频控制指令 ====================
function parseVideoControl(content) {
    // 匹配格式：[VIDEO:pause|时间戳|原因]
    const pauseMatch = content.match(/\[VIDEO:pause\|(\d+)\|([^\]]*)\]/);
    if (pauseMatch) {
        return {
            action: 'pause',
            time: parseInt(pauseMatch[1]),
            reason: pauseMatch[2]
        };
    }

    // 匹配格式：[VIDEO:jump|时间戳|原因]
    const jumpMatch = content.match(/\[VIDEO:jump\|(\d+)\|([^\]]*)\]/);
    if (jumpMatch) {
        return {
            action: 'jump',
            time: parseInt(jumpMatch[1]),
            reason: jumpMatch[2]
        };
    }

    // 匹配格式：[VIDEO:resume]（恢复播放）
    const resumeMatch = content.match(/\[VIDEO:resume\]/);
    if (resumeMatch) {
        return {
            action: 'resume',
            reason: '恢复播放'
        };
    }

    return null;
}

// ==================== 执行视频控制 ====================
function executeVideoControl(control) {
    if (!control || !video) return;

    if (control.action === 'pause') {
        video.pause();
        updatePlayButtonState(false);
        console.log('视频暂停:', control.reason, '时间点:', control.time);
    } else if (control.action === 'jump') {
        video.currentTime = control.time;
        video.play();
        updatePlayButtonState(true);
        console.log('视频跳转至', control.time, '秒:', control.reason);
    } else if (control.action === 'resume') {
        video.play();
        updatePlayButtonState(true);
        console.log('视频恢复播放:', control.reason);
    }
}

// ==================== 更新播放按钮状态 ====================
function updatePlayButtonState(isPlaying) {
    const playBtn = document.getElementById('playPauseBtn');
    const videoOverlay = document.getElementById('videoOverlay');

    if (playBtn) {
        if (isPlaying) {
            playBtn.innerHTML = '⏸'; // 暂停图标
        } else {
            playBtn.innerHTML = '▶'; // 播放图标
        }
    }

    // 隐藏遮罩层
    if (videoOverlay && isPlaying) {
        videoOverlay.classList.add('hidden');
    }
}

// ==================== 显示/隐藏加载状态 ====================
function showLoading(show) {
    const loadingDiv = document.getElementById('loadingIndicator');
    if (loadingDiv) {
        loadingDiv.style.display = show ? 'block' : 'none';
    }

    if (sendBtn) {
        sendBtn.disabled = show;
    }
}

// ==================== 调用扣子API ====================
async function callCozeAPI(userMessage) {
    try {
        console.log('调用API，消息:', userMessage);

        const requestBody = {
            bot_id: CONFIG.BOT_ID,
            user_id: CONFIG.USER_ID,
            stream: false,
            auto_save_history: true,
            additional_messages: [
                {
                    role: 'user',
                    content: userMessage,
                    content_type: 'text'
                }
            ]
        };

        // 如果有会话ID，添加到请求中
        if (conversationId) {
            requestBody.conversation_id = conversationId;
        }

        console.log('请求体:', JSON.stringify(requestBody, null, 2));

        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + CONFIG.API_TOKEN,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        console.log('响应状态:', response.status);

        if (!response.ok) {
            throw new Error('API请求失败: ' + response.status);
        }

        const result = await response.json();
        console.log('API响应:', result);

        // 保存会话ID
        if (result.data && result.data.conversation_id) {
            conversationId = result.data.conversation_id;
            console.log('保存会话ID:', conversationId);
        }

        // 获取chat_id
        const chatId = result.data && result.data.id;

        // 检查状态
        if (result.data && result.data.status === 'in_progress') {
            console.log('AI正在生成回复，开始轮询...');
            return await pollForResult(chatId);
        }

        // 如果状态是completed，直接解析响应
        if (result.data && result.data.status === 'completed') {
            return extractReplyContent(result);
        }

        // 尝试直接解析（兼容其他格式）
        return extractReplyContent(result);
    } catch (error) {
        showLoading(false);
        console.error('API调用错误:', error);

        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            return '网络连接失败，可能是跨域问题。请尝试：\n1. 使用Vercel部署\n2. 或使用浏览器插件临时允许跨域';
        }

        return '抱歉，小艾老师遇到了一些问题：' + error.message;
    }
}

// ==================== 轮询获取结果 ====================
async function pollForResult(chatId) {
    const maxPolls = 40;  // 最多轮询40次
    const pollInterval = 1000;  // 每次间隔1秒

    for (let i = 0; i < maxPolls; i++) {
        console.log('轮询第 ' + (i + 1) + ' 次，chatId: ' + chatId);

        await new Promise(function(resolve) {
            setTimeout(resolve, pollInterval);
        });

        try {
            // 第一步：GET请求查询对话状态
            const pollUrl = 'https://api.coze.cn/v3/chat/retrieve?conversation_id=' + conversationId + '&chat_id=' + chatId;

            const response = await fetch(pollUrl, {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + CONFIG.API_TOKEN,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('轮询请求失败:', response.status);
                continue;
            }

            const result = await response.json();
            console.log('轮询响应:', JSON.stringify(result, null, 2));

            if (result.data && result.data.status === 'completed') {
                // 第二步：GET请求获取消息列表
                return await getMessageList(chatId);
            }

            if (result.data && result.data.status === 'failed') {
                showLoading(false);
                return '抱歉，AI处理失败，请稍后再试。';
            }
        } catch (error) {
            console.error('轮询错误:', error);
        }
    }

    showLoading(false);
    return '抱歉，AI回复超时，请稍后再试。';
}

// ==================== 获取消息列表 ====================
async function getMessageList(chatId) {
    try {
        const messageUrl = 'https://api.coze.cn/v3/chat/message/list?conversation_id=' + conversationId + '&chat_id=' + chatId;

        const response = await fetch(messageUrl, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + CONFIG.API_TOKEN,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('获取消息列表失败:', response.status);
            showLoading(false);
            return '获取回复失败，请稍后再试。';
        }

        const result = await response.json();
        console.log('消息列表响应:', JSON.stringify(result, null, 2));

        showLoading(false);

        // 解析消息列表，查找type=answer的消息
        if (result.data && Array.isArray(result.data)) {
            for (let i = 0; i < result.data.length; i++) {
                const msg = result.data[i];
                if (msg.type === 'answer' && msg.content) {
                    return msg.content;
                }
            }
        }

        return '收到回复，但未找到有效内容。';
    } catch (error) {
        console.error('获取消息列表错误:', error);
        showLoading(false);
        return '获取回复时出错，请稍后再试。';
    }
}

// ==================== 提取回复内容 ====================
function extractReplyContent(result) {
    let replyContent = null;

    // 格式1: data.messages数组中有assistant的answer
    if (result.data && result.data.messages && Array.isArray(result.data.messages)) {
        for (let i = 0; i < result.data.messages.length; i++) {
            const msg = result.data.messages[i];
            if (msg.role === 'assistant' && msg.type === 'answer') {
                replyContent = msg.content;
                break;
            }
        }
    }

    // 格式2: data.content
    if (!replyContent && result.data && result.data.content) {
        replyContent = result.data.content;
    }

    // 格式3: data.answer
    if (!replyContent && result.data && result.data.answer) {
        replyContent = result.data.answer;
    }

    // 格式4: result.content
    if (!replyContent && result.content) {
        replyContent = result.content;
    }

    // 格式5: result.answer
    if (!replyContent && result.answer) {
        replyContent = result.answer;
    }

    if (replyContent) {
        return replyContent;
    }

    console.error('无法解析API响应，完整数据:', JSON.stringify(result, null, 2));
    return '收到回复，但无法解析内容。请查看浏览器控制台(F12)获取详细日志。';
}

// ==================== 视频控制 ====================
function pauseVideo() {
    if (video) {
        video.pause();
    }
}

function playVideo() {
    if (video) {
        video.play();
    }
}

function seekVideo(time) {
    if (video) {
        video.currentTime = time;
    }
}

// ==================== 页面加载提示 ====================
console.log('小艾老师教学网页脚本已加载');
console.log('Bot ID:', CONFIG.BOT_ID);
console.log('视频控制：完全由Agent指令控制');
console.log('题目阶段：无需管理，按顺序作答');
console.log('图片处理：Agent不再输出图片');
