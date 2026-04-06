// ==================== 配置区域 ====================
const CONFIG = {
    // 扣子API配置 - 根据环境自动选择
    get API_URL() {
        const hostname = window.location.hostname;
        // OSS环境：由于跨域限制，API调用会失败，需要用户通过Vercel部署
        if (hostname.includes('oss')) {
            console.warn('⚠️ OSS环境无法直接调用API，建议部署到Vercel');
            return 'https://api.coze.cn/v3/chat'; // 尝试直接调用（可能被CORS阻止）
        }
        // Vercel环境：使用代理路径
        if (hostname.includes('vercel') || hostname.includes('localhost')) {
            return '/api/coze/v3/chat';
        }
        // 其他环境
        return 'https://api.coze.cn/v3/chat';
    },
    API_TOKEN: 'pat_Lky4npo9KhdjkggnB2i6gotKbfY7DlzCjZbATBhqv1YbUXD1g81F7TXt5UCA83OG',
    BOT_ID: '7625443699455557674',
    
    // 视频控制时间点（秒）
    VIDEO_PAUSE_TIME: 350,  // 5分50秒暂停
    VIDEO_JUMP_TIME: 251,   // 4分11秒跳转
    
    // 用户ID（可自定义）
    USER_ID: 'student_' + Date.now()
};

// ==================== 全局变量 ====================
let video = null;
let chatMessages = null;
let userInput = null;
let sendBtn = null;
let loadingOverlay = null;
let videoOverlay = null;
let startBtn = null;
let progressFill = null;
let currentTimeEl = null;
let totalTimeEl = null;

let isVideoPaused = false;
let hasTriggeredExercise = false;
let conversationId = null;

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面加载完成，开始初始化...');
    
    // 获取DOM元素
    video = document.getElementById('courseVideo');
    chatMessages = document.getElementById('chatMessages');
    userInput = document.getElementById('userInput');
    sendBtn = document.getElementById('sendBtn');
    loadingOverlay = document.getElementById('loadingOverlay');
    videoOverlay = document.getElementById('videoOverlay');
    startBtn = document.getElementById('startBtn');
    progressFill = document.getElementById('progressFill');
    currentTimeEl = document.getElementById('currentTime');
    totalTimeEl = document.getElementById('totalTime');
    
    // 检查元素是否获取成功
    console.log('视频元素:', video);
    console.log('开始学习按钮:', startBtn);
    console.log('发送按钮:', sendBtn);
    
    // 动态设置视频源 - 统一使用OSS在线视频
    if (video) {
        const videoSource = document.createElement('source');
        
        // 所有环境统一使用OSS视频链接，确保网页独立可运行
        videoSource.src = 'https://aiteacheryaohongyu.oss-cn-shanghai.aliyuncs.com/video.mp4';
        videoSource.type = 'video/mp4';
        video.appendChild(videoSource);
        console.log('已设置视频源（OSS在线）:', videoSource.src);
    }
    
    // 绑定事件
    bindEvents();
    
    // 初始化视频
    initVideo();
    
    console.log('初始化完成');
});

// ==================== 事件绑定 ====================
function bindEvents() {
    console.log('绑定事件...');
    
    // 开始学习按钮
    if (startBtn) {
        startBtn.onclick = function(e) {
            console.log('点击了开始学习按钮');
            e.preventDefault();
            
            if (videoOverlay) {
                videoOverlay.classList.add('hidden');
            }
            
            if (video) {
                console.log('尝试播放视频...');
                video.play().then(function() {
                    console.log('视频开始播放');
                    sendInitialMessage();
                }).catch(function(error) {
                    console.error('视频播放失败:', error);
                    alert('视频播放失败: ' + error.message + '\n请检查视频文件是否存在，以及浏览器是否允许自动播放。');
                });
            } else {
                console.error('找不到视频元素');
                alert('找不到视频元素，请刷新页面重试');
            }
        };
    } else {
        console.error('找不到开始学习按钮');
    }
    
    // 发送按钮
    if (sendBtn) {
        sendBtn.onclick = function() {
            console.log('点击了发送按钮');
            sendMessage();
        };
    } else {
        console.error('找不到发送按钮');
    }
    
    // 回车发送
    if (userInput) {
        userInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    // 视频事件
    if (video) {
        video.addEventListener('timeupdate', handleVideoTimeUpdate);
        
        video.addEventListener('loadedmetadata', function() {
            console.log('视频元数据加载完成，时长:', video.duration);
            if (totalTimeEl) {
                totalTimeEl.textContent = formatTime(video.duration);
            }
        });
        
        video.addEventListener('canplay', function() {
            console.log('视频可以播放');
        });
        
        video.addEventListener('error', function(e) {
            console.error('视频加载错误:', video.error);
            if (video.error) {
                let errorMsg = '未知错误';
                switch(video.error.code) {
                    case 1: errorMsg = '视频加载被中止'; break;
                    case 2: errorMsg = '网络错误'; break;
                    case 3: errorMsg = '视频解码失败'; break;
                    case 4: errorMsg = '视频格式不支持'; break;
                }
                console.error('视频错误详情:', errorMsg);
            }
        });
        
        video.addEventListener('ended', function() {
            hasTriggeredExercise = false;
        });
    }
}

// ==================== 视频控制 ====================
function initVideo() {
    if (video) {
        video.load();
    }
}

function handleVideoTimeUpdate() {
    if (!video || !progressFill || !currentTimeEl) return;
    
    // 更新进度条
    const progress = (video.currentTime / video.duration) * 100;
    progressFill.style.width = progress + '%';
    currentTimeEl.textContent = formatTime(video.currentTime);
    
    // 检查是否到达暂停时间点
    if (!hasTriggeredExercise && video.currentTime >= CONFIG.VIDEO_PAUSE_TIME) {
        video.pause();
        hasTriggeredExercise = true;
        isVideoPaused = true;
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ==================== API调用 ====================
async function callCozeAPI(userMessage) {
    showLoading(true);
    console.log('调用API，消息:', userMessage);
    
    try {
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
        
        if (conversationId) {
            requestBody.conversation_id = conversationId;
        }
        
        console.log('请求体:', JSON.stringify(requestBody, null, 2));
        
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + CONFIG.API_TOKEN,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log('响应状态:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API错误响应:', errorText);
            throw new Error('API请求失败: ' + response.status + ' - ' + errorText);
        }
        
        const result = await response.json();
        console.log('API响应:', result);
        
        if (result.data && result.data.conversation_id) {
            conversationId = result.data.conversation_id;
            console.log('保存会话ID:', conversationId);
        }
        
        showLoading(false);
        
        if (result.data && result.data.messages) {
            for (const msg of result.data.messages) {
                if (msg.role === 'assistant' && msg.type === 'answer') {
                    return msg.content;
                }
            }
        }
        
        if (result.data && result.data.content) {
            return result.data.content;
        }
        
        return '收到回复，但无法解析内容。请查看控制台日志。';
        
    } catch (error) {
        showLoading(false);
        console.error('API调用错误:', error);
        
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            return '网络连接失败，可能是跨域问题。请尝试：\n1. 使用Vercel部署\n2. 或使用浏览器插件临时允许跨域';
        }
        
        return '抱歉，小艾老师遇到了一些问题：' + error.message;
    }
}

// ==================== 消息处理 ====================
async function sendInitialMessage() {
    const botReply = await callCozeAPI('你好，我想学习中点四边形');
    processBotReply(botReply);
}

async function sendMessage() {
    if (!userInput) {
        console.error('找不到输入框元素');
        return;
    }
    
    const message = userInput.value.trim();
    if (!message) {
        console.log('消息为空，不发送');
        return;
    }
    
    console.log('发送消息:', message);
    
    addMessage(message, 'user');
    userInput.value = '';
    
    const botReply = await callCozeAPI(message);
    processBotReply(botReply);
}

function processBotReply(reply) {
    console.log('处理回复:', reply);
    
    const videoControlMatch = reply.match(/\[VIDEO:([^\]]+)\]/);
    
    if (videoControlMatch) {
        const parts = videoControlMatch[1].split('|');
        const action = parts[0];
        const timestamp = parseInt(parts[1]) || 0;
        const reason = parts[2] || '';
        
        console.log('解析到视频控制指令:', action, timestamp, reason);
        executeVideoControl(action, timestamp, reason);
        
        reply = reply.replace(/\[VIDEO:[^\]]+\]/g, '').trim();
    }
    
    reply = parseImages(reply);
    
    if (reply) {
        addMessage(reply, 'bot');
    }
}

function parseImages(text) {
    return text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function(match, alt, url) {
        return `<img src="${url}" alt="${alt}" style="max-width:100%;border-radius:8px;margin:8px 0;">`;
    });
}

function executeVideoControl(action, timestamp, reason) {
    console.log('执行视频控制:', action, timestamp, reason);
    
    if (!video) {
        console.error('视频元素不存在');
        return;
    }
    
    switch (action) {
        case 'play':
            video.play().catch(function(e) {
                console.error('播放失败:', e);
            });
            break;
        case 'pause':
            video.pause();
            isVideoPaused = true;
            if (timestamp > 0) {
                video.currentTime = timestamp;
            }
            break;
        case 'jump':
            video.currentTime = timestamp;
            hasTriggeredExercise = false;
            video.play().catch(function(e) {
                console.error('跳转后播放失败:', e);
            });
            break;
        default:
            console.log('未知视频控制指令:', action);
    }
}

function addMessage(content, type) {
    if (!chatMessages) {
        console.error('找不到聊天消息容器');
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    const avatar = type === 'bot' ? '👩‍🏫' : '👤';
    
    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            ${type === 'bot' ? formatBotMessage(content) : `<p>${escapeHtml(content)}</p>`}
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatBotMessage(content) {
    let html = content.replace(/\n/g, '<br>');
    if (!html.startsWith('<')) {
        html = '<p>' + html + '</p>';
    }
    return html;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== 工具函数 ====================
function showLoading(show) {
    if (!loadingOverlay) return;
    
    if (show) {
        loadingOverlay.classList.add('active');
    } else {
        loadingOverlay.classList.remove('active');
    }
}

// ==================== 调试日志 ====================
console.log('小艾老师教学网页脚本已加载');
console.log('Bot ID:', CONFIG.BOT_ID);