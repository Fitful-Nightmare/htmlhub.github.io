// ==================== 配置区域 ====================
const CONFIG = {
    // 扣子API配置
    API_URL: 'https://api.coze.cn/v3/chat',
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
let startBtn = null;
let sendBtn = null;
let chatInput = null;
let chatMessages = null;
let conversationId = null;
let hasStarted = false;

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
    
    // 视频事件
    if (video) {
        video.addEventListener('loadedmetadata', function() {
            console.log('视频元数据加载完成，时长:', video.duration);
        });
        
        video.addEventListener('canplay', function() {
            console.log('视频可以播放');
        });
        
        video.addEventListener('timeupdate', function() {
            // 视频播放进度监控
        });
    }
}

// ==================== 开始学习 ====================
function startLearning() {
    if (hasStarted) {
        console.log('已经开始了，跳过');
        return;
    }
    
    hasStarted = true;
    
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
    addMessage(message, 'user');
    showLoading(true);
    
    const reply = await callCozeAPI(message);
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
}

// ==================== 格式化消息内容 ====================
function formatMessage(content) {
    // 处理换行
    return content.replace(/\n/g, '<br>');
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
    const maxPolls = 30; // 最多轮询30次
    const pollInterval = 1500; // 每次间隔1.5秒
    
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
