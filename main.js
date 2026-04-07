// ==================== 配置区域 ====================
const CONFIG = {
    // 扣子API配置
    API_URL: 'https://api.coze.cn/v3/chat',
    API_TOKEN: 'pat_Lky4npo9KhdjkggnB2i6gotKbfY7DlzCjZbATBhqv1YbUXD1g81F7TXt5UCA83OG',
    BOT_ID: '7625443699455557674',
    
    // 视频控制时间点（秒）
    VIDEO_PAUSE_TIME: 385,  // 6分25秒暂停（第一道测试题）
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
    addMessage(message, 'user');
    showLoading(true);
    
    const reply = await callCozeAPI(message);
    addMessage(reply, 'assistant');
    showLoading(false);
}

// ==================== 添加消息到聊天区域 ====================
function addMessage(content, role) {
    console.log('addMessage 调用，角色:', role, '内容:', content);

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ' + (role === 'user' ? 'user-message' : 'assistant-message');

    const formattedContent = formatMessage(content);
    console.log('格式化后的内容:', formattedContent);

    messageDiv.innerHTML = '<div class="message-content">' + formattedContent + '</div>';

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    console.log('消息已添加到DOM，图片元素数量:', messageDiv.querySelectorAll('img').length);

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
    // 🔍 调试日志：记录原始内容
    console.log('=== formatMessage 调试信息 ===');
    console.log('原始内容长度:', content.length);
    console.log('原始内容（前200字符）:', content.substring(0, 200));

    // 🔍 检查是否包含Markdown格式的图片
    const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const markdownImages = content.match(markdownImageRegex);
    if (markdownImages) {
        console.warn('⚠️ 检测到Markdown格式的图片:', markdownImages);
        console.warn('🔧 正在将Markdown图片转换为HTML格式...');
    }

    // ✅ 将Markdown图片格式转换为HTML格式
    // 格式：![alt](url) -> <img src="url" alt="alt">
    content = content.replace(markdownImageRegex, function(match, alt, url) {
        console.log('原始图片URL:', url);
        
        // 🔍 检查是否是扣子平台的预览URL
        // 格式：https://www.coze.cn/s/xxxx/?width_height=xxx
        let finalUrl = url;
        let note = '';
        
        if (url.includes('www.coze.cn/s/') && url.includes('?')) {
            // 这些URL实际上是有效的图片URL（已验证）
            // 不需要转换，直接使用
            note = '（扣子平台图片URL，可直接使用）';
        }
        
        console.log(`转换图片: ${match}`);
        console.log(`  -> <img src="${finalUrl}" alt="${alt}">`);
        console.log(`  ${note}`);
        
        // 生成图片HTML，添加class以便后续诊断
        return `<img src="${finalUrl}" alt="${alt}" class="ai-generated-image" style="max-width: 100%; height: auto; margin: 10px 0; border-radius: 8px;" onerror="this.style.display=\'none\'; console.error(\'图片加载失败:\', this.src);">`;
    });

    // 检查转换后是否包含HTML格式的图片
    const htmlImageRegex = /<img\s+[^>]*src\s*=\s*["'][^"']+["'][^>]*>/gi;
    const htmlImages = content.match(htmlImageRegex);
    if (htmlImages) {
        console.log('✅ 转换后的HTML图片:', htmlImages);
    }

    // 移除视频控制指令（不显示给学生看）
    // 匹配格式：[VIDEO:xxx|xxx|xxx] 或 [VIDEO:xxx|xxx|xxx（可能没有闭合括号）
    const beforeVideoRemoval = content;
    content = content.replace(/\[VIDEO:[^\]]*/g, '');
    if (beforeVideoRemoval !== content) {
        console.log('已移除视频控制指令');
    }

    // 移除代码片段（过滤掉```代码块）
    content = content.replace(/```[\s\S]*?```/g, '[代码已隐藏]');

    // 处理换行（在HTML标签外部的换行符替换为<br>，但不在标签内部替换）
    // 方法：先保护HTML标签，再替换换行符，最后恢复标签
    const tempPlaceholder = '___HTML_TAG_PLACEHOLDER___';
    const tags = [];
    let protectedContent = content.replace(/<[^>]+>/g, function(tag) {
        tags.push(tag);
        return tempPlaceholder + (tags.length - 1) + '___';
    });

    // 替换换行符（现在只有纯文本部分会被替换）
    protectedContent = protectedContent.replace(/\n/g, '<br>');

    // 恢复HTML标签
    const formattedContent = protectedContent.replace(
        new RegExp(tempPlaceholder + '(\\d+)___', 'g'),
        function(match, index) {
            return tags[parseInt(index)];
        }
    );

    console.log('格式化后内容（前200字符）:', formattedContent.substring(0, 200));
    console.log('=== formatMessage 调试结束 ===\n');

    return formattedContent;
}

// ==================== 解析视频控制指令 ====================
function parseVideoControl(content) {
    // 匹配格式：[VIDEO:pause|385|原因]
    const pauseMatch = content.match(/\[VIDEO:pause\|(\d+)\|([^\]]*)\]/);
    if (pauseMatch) {
        return { action: 'pause', time: parseInt(pauseMatch[1]), reason: pauseMatch[2] };
    }
    
    // 匹配格式：[VIDEO:jump|152|原因]
    const jumpMatch = content.match(/\[VIDEO:jump\|(\d+)\|([^\]]*)\]/);
    if (jumpMatch) {
        return { action: 'jump', time: parseInt(jumpMatch[1]), reason: jumpMatch[2] };
    }
    
    // 匹配格式：[VIDEO:resume]（恢复播放）
    const resumeMatch = content.match(/\[VIDEO:resume\]/);
    if (resumeMatch) {
        return { action: 'resume' };
    }
    
    return null;
}

// ==================== 执行视频控制 ====================
function executeVideoControl(control) {
    if (!control || !video) return;
    
    if (control.action === 'pause') {
        video.pause();
        updatePlayButtonState(false);
        
        // 显示暂停遮罩层（不显示继续按钮）
        const videoOverlay = document.getElementById('videoOverlay');
        if (videoOverlay) {
            videoOverlay.classList.remove('hidden');
            const overlayContent = videoOverlay.querySelector('.overlay-content');
            if (overlayContent) {
                overlayContent.querySelector('h2').textContent = '习题时间';
                overlayContent.querySelector('p').textContent = control.reason || '请完成所有题目后继续';
                // 隐藏开始学习按钮（因为视频已暂停，等待Agent发送resume指令）
                const startBtn = overlayContent.querySelector('.start-btn');
                if (startBtn) {
                    startBtn.style.display = 'none';
                }
            }
        }
        console.log('视频暂停:', control.reason);
    } else if (control.action === 'jump') {
        video.currentTime = control.time;
        video.play();
        updatePlayButtonState(true);
        
        // 隐藏遮罩层
        const videoOverlay = document.getElementById('videoOverlay');
        if (videoOverlay) {
            videoOverlay.classList.add('hidden');
        }
        console.log('视频跳转至', control.time, '秒:', control.reason);
    } else if (control.action === 'resume') {
        // 恢复视频播放（由Agent发送resume指令触发）
        video.play();
        updatePlayButtonState(true);
        
        // 隐藏遮罩层
        const videoOverlay = document.getElementById('videoOverlay');
        if (videoOverlay) {
            videoOverlay.classList.add('hidden');
        }
        console.log('视频恢复播放');
    } else if (control.action === 'play') {
        if (control.time > 0) {
            video.currentTime = control.time;
        }
        video.play();
        updatePlayButtonState(true);
        console.log('视频播放:', control.reason);
    }
}

// ==================== 更新播放按钮状态 ====================
function updatePlayButtonState(isPlaying) {
    const playBtn = document.getElementById('playPauseBtn');
    const videoOverlay = document.getElementById('videoOverlay');
    
    if (playBtn) {
        if (isPlaying) {
            playBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
        } else {
            playBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>';
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
    const maxPolls = 40; // 最多轮询40次
    const pollInterval = 1000; // 每次间隔1秒
    
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
