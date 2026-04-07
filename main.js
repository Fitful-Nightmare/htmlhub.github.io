// ==================== 微课网页完整版 ====================
// 此版本包含：
// 1. ✅ 完整的 API 调用和轮询机制
// 2. ✅ 正确的 API 响应解析逻辑（修复 ID 误识别问题）
// 3. ✅ Markdown 图片格式转换为 HTML 格式
// 4. ✅ 图片加载失败处理和 URL 大小写修正
// 5. ✅ 详细的调试日志
// 6. ✅ 视频控制和交互逻辑
// 7. ✅ 正确的元素 ID 引用（与 index.html 匹配）

// ==================== 配置信息 ====================
const CONFIG = {
    // API 配置
    COZE_API: 'https://api.coze.cn/v3/chat',
    BOT_ID: '7625443699455557674',
    USER_ID: '123456',
    API_KEY: 'pat_jX4Xp7qk1T2R3W4Y5Z6a7B8C9D0E1F2G3H4I5J6K7L8M9N0O1P2Q3R4S5T6U7V8W9X0',
    
    // 轮询配置
    MAX_RETRIES: 40,
    RETRY_INTERVAL: 1000, // 1秒
    
    // 视频配置
    VIDEO_PAUSE_TIME: 350, // 5分50秒 = 350秒
    VIDEO_JUMP_TIME: 251   // 4分11秒 = 251秒
};

// ==================== 全局变量 ====================
let conversationId = null;
let isPolling = false;
let currentReplyId = null;

// ==================== 格式化消息内容 ====================
function formatMessage(content) {
    console.log('=== formatMessage 调试信息 ===');
    console.log('原始内容长度:', content.length);
    console.log('原始内容（前300字符）:', content.substring(0, 300));

    // 步骤1：将Markdown图片格式转换为HTML格式
    // 格式：![alt](url) -> <img src="url" alt="alt">
    const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const markdownImages = content.match(markdownImageRegex);
    
    if (markdownImages) {
        console.warn('⚠️ 检测到Markdown格式的图片:', markdownImages);
        console.warn('🔧 正在将Markdown图片转换为HTML格式...');
        
        content = content.replace(markdownImageRegex, function(match, alt, url) {
            console.log('📸 处理图片:');
            console.log('  原始格式:', match);
            console.log('  图片URL:', url);
            console.log('  替代文本:', alt);
            
            // 🔧 修正图片URL的大小写问题
            let finalUrl = url;
            
            // 检查是否是主习题配图的URL（可能的大小写错误）
            if (url.includes('Cx34uQlj3Rg')) {
                // 将小写l替换为大写I
                finalUrl = url.replace('Cx34uQlj3Rg', 'Cx34uQIj3Rg');
                console.log('  🔧 修正URL大小写:');
                console.log('     原始:', url);
                console.log('     修正:', finalUrl);
            }
            
            // 生成图片HTML标签，包含加载事件处理
            const imgHtml = `<img 
                src="${finalUrl}" 
                alt="${alt}" 
                class="ai-generated-image"
                style="max-width: 100%; height: auto; margin: 10px 0; border-radius: 8px; display: block; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
                onload="console.log('✅ 图片加载成功:', this.src, '尺寸:', this.naturalWidth + 'x' + this.naturalHeight);"
                onerror="
                    console.error('❌ 图片加载失败:', this.src);
                    this.style.display = 'none';
                    const errorMsg = document.createElement('div');
                    errorMsg.style.cssText = 'background: #fff3cd; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #ffc107; color: #856404;';
                    errorMsg.innerHTML = '<strong>⚠️ 图片加载失败</strong><br><small>URL: ${finalUrl}</small><br><small>请检查网络连接或联系技术支持</small>';
                    this.parentNode.insertBefore(errorMsg, this.nextSibling);
                "
            >`;
            
            console.log('  生成HTML成功');
            return imgHtml;
        });
    } else {
        console.log('✅ 未检测到Markdown格式的图片');
    }

    // 步骤2：检查是否包含HTML格式的图片
    const htmlImageRegex = /<img\s+[^>]*src\s*=\s*["'][^"']+["'][^>]*>/gi;
    const htmlImages = content.match(htmlImageRegex);
    
    if (htmlImages) {
        console.log('✅ 检测到HTML格式的图片:', htmlImages.length, '个');
    }

    // 步骤3：移除视频控制指令（不显示给学生看）
    // 匹配格式：[VIDEO:xxx|xxx|xxx] 或 [VIDEO:xxx|xxx|xxx（可能没有闭合括号）
    const beforeVideoRemoval = content;
    content = content.replace(/\[VIDEO:[^\]]*/g, '');
    if (beforeVideoRemoval !== content) {
        console.log('🎬 已移除视频控制指令');
    }

    // 步骤4：移除代码片段（过滤掉```代码块）
    content = content.replace(/```[\s\S]*?```/g, '<div style="background: #f5f5f5; padding: 10px; border-radius: 4px; margin: 10px 0; border: 1px solid #ddd;">[代码已隐藏]</div>');

    // 步骤5：处理换行（在HTML标签外部的换行符替换为<br>，但不在标签内部替换）
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

    console.log('格式化后内容长度:', formattedContent.length);
    console.log('格式化后内容（前300字符）:', formattedContent.substring(0, 300));
    console.log('=== formatMessage 调试结束 ===');
    
    return formattedContent;
}

// ==================== 添加消息到聊天界面 ====================
function addMessage(role, content) {
    console.log('addMessage 调用，角色:', role, '内容:', content);
    
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) {
        console.error('找不到聊天消息容器');
        return;
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    if (role === 'assistant') {
        avatar.innerHTML = '👩‍🏫';
        contentDiv.innerHTML = formatMessage(content);
    } else if (role === 'user') {
        avatar.innerHTML = '👤';
        contentDiv.textContent = content;
    } else {
        // 默认使用机器人头像
        avatar.innerHTML = '👩‍🏫';
        contentDiv.innerHTML = formatMessage(content);
    }

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);

    // 滚动到底部
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ==================== 调用扣子API ====================
async function callCozeAPI(userMessage) {
    console.log('发送消息到扣子API:', userMessage);
    
    // 步骤1：发送消息
    const payload = {
        bot_id: CONFIG.BOT_ID,
        user_id: CONFIG.USER_ID,
        stream: false,
        auto_save_history: true,
        additional_messages: [{
            role: 'user',
            content: userMessage,
            content_type: 'text'
        }]
    };

    if (conversationId) {
        payload.conversation_id = conversationId;
    }

    const response = await fetch(CONFIG.COZE_API, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CONFIG.API_KEY}`
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
    }

    const data = await response.json();
    console.log('API响应:', data);

    // 步骤2：提取 conversation_id 和回复ID
    if (data.data && data.data.id) {
        currentReplyId = data.data.id;
        conversationId = data.data.conversation_id;
        console.log('已保存conversation_id:', conversationId);
        console.log('回复ID:', currentReplyId);
    }

    // 步骤3：轮询获取回复内容
    let reply = null;
    let retryCount = 0;

    while (retryCount < CONFIG.MAX_RETRIES) {
        retryCount++;
        console.log(`轮询尝试 ${retryCount}/${CONFIG.MAX_RETRIES}...`);

        await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_INTERVAL));

        const pollUrl = `${CONFIG.COZE_API}/retrieve?conversation_id=${conversationId}&bot_id=${CONFIG.BOT_ID}&chat_id=${currentReplyId}`;
        
        const pollResponse = await fetch(pollUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${CONFIG.API_KEY}`
            }
        });

        if (!pollResponse.ok) {
            console.error(`轮询请求失败: ${pollResponse.status}`);
            continue;
        }

        const pollData = await pollResponse.json();
        console.log('API响应:', pollData);

        // 🔍 保存完整响应用于调试
        console.log('=== 完整API响应数据结构 ===');
        console.log('响应类型:', typeof pollData);
        console.log('响应keys:', Object.keys(pollData));
        
        // 🎯 关键修复：正确处理API响应结构
        if (pollData.data && pollData.data.status === 'completed') {
            console.log('✅ 消息已完成');
            
            // 检查响应中的消息内容
            const messages = pollData.data.messages || [];
            console.log('消息数量:', messages.length);
            
            // 找到最后一个助手消息
            for (let i = messages.length - 1; i >= 0; i--) {
                const msg = messages[i];
                console.log(`消息 ${i}:`, {
                    role: msg.role,
                    type: msg.type,
                    content_type: msg.content_type,
                    content_length: msg.content ? msg.content.length : 0
                });
                
                if (msg.role === 'assistant' && msg.type === 'answer') {
                    reply = msg.content;
                    console.log('✅✅✅ 成功获取到回复内容');
                    console.log('内容长度:', reply.length);
                    break;
                }
            }
            
            if (reply) {
                break;
            }
        }
    }

    if (!reply) {
        console.warn('⚠️ 轮询结束，未找到有效的回复内容');
        reply = '抱歉，我暂时无法回复。请稍后再试。';
    }

    return reply;
}

// ==================== 执行视频控制指令 ====================
function executeVideoControl(control) {
    console.log('执行视频控制指令:', control);

    const video = document.getElementById('courseVideo');
    if (!video) {
        console.error('找不到视频播放器');
        return;
    }

    if (control.action === 'pause') {
        video.pause();
        console.log('视频暂停:', control.reason);
    } else if (control.action === 'jump') {
        video.currentTime = control.time;
        video.play();
        console.log('视频跳转到', control.time, '秒:', control.reason);
    }
}

// ==================== 解析视频控制指令 ====================
function parseVideoControl(content) {
    // 匹配格式：[VIDEO:action|time|reason]
    const match = content.match(/\[VIDEO:(\w+)\|(\d+)\|([^\]]*)\]/);
    if (match) {
        return {
            action: match[1],
            time: parseInt(match[2]),
            reason: match[3]
        };
    }
    return null;
}

// ==================== 发送消息处理 ====================
async function handleSendMessage() {
    const messageInput = document.getElementById('chatInput');
    const message = messageInput.value.trim();
    
    if (!message) return;

    // 添加用户消息到界面
    addMessage('user', message);
    messageInput.value = '';

    try {
        // 调用API获取回复
        const reply = await callCozeAPI(message);
        
        // 解析视频控制指令
        const videoControl = parseVideoControl(reply);
        
        // 显示AI回复
        addMessage('assistant', reply);
        
        // 如果有视频控制指令，执行它
        if (videoControl) {
            executeVideoControl(videoControl);
        }
    } catch (error) {
        console.error('发送消息失败:', error);
        addMessage('assistant', '抱歉，发生了错误：' + error.message);
    }
}

// ==================== 页面加载完成后的初始化 ====================
console.log('main.js 开始加载...');
console.log('等待DOM加载完成...');

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM加载完成，开始初始化...');

    // 延迟执行，确保所有元素都渲染完成
    setTimeout(function() {
        console.log('开始绑定事件...');

        // 绑定发送按钮事件
        const sendButton = document.getElementById('sendBtn');
        console.log('查找发送按钮 sendBtn...');
        console.log('sendButton 元素:', sendButton);
        
        if (sendButton) {
            sendButton.addEventListener('click', handleSendMessage);
            console.log('✅ 发送按钮事件已绑定');
        } else {
            console.error('❌ 找不到发送按钮');
            // 尝试查找所有按钮
            const allButtons = document.querySelectorAll('button');
            console.log('页面中的所有按钮:', allButtons.length);
            allButtons.forEach((btn, index) => {
                console.log(`按钮 ${index}:`, btn.id, btn.className);
            });
        }

        // 绑定回车键发送事件
        const messageInput = document.getElementById('chatInput');
        console.log('查找消息输入框 chatInput...');
        console.log('messageInput 元素:', messageInput);
        
        if (messageInput) {
            messageInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault(); // 防止换行
                    handleSendMessage();
                }
            });
            console.log('✅ 回车键事件已绑定');
        } else {
            console.error('❌ 找不到消息输入框');
            // 尝试查找所有输入框和文本域
            const allInputs = document.querySelectorAll('input, textarea');
            console.log('页面中的所有输入元素:', allInputs.length);
            allInputs.forEach((input, index) => {
                console.log(`输入元素 ${index}:`, input.id, input.className);
            });
        }

        // 绑定开始学习按钮事件
        const startButton = document.getElementById('startBtn');
        console.log('查找开始学习按钮 startBtn...');
        console.log('startButton 元素:', startButton);
        
        if (startButton) {
            startButton.addEventListener('click', function() {
                console.log('开始学习按钮被点击');
                const video = document.getElementById('courseVideo');
                console.log('查找视频播放器 courseVideo...');
                console.log('video 元素:', video);
                
                if (video) {
                    video.play();
                    // 隐藏视频遮罩层
                    const overlay = document.getElementById('videoOverlay');
                    if (overlay) {
                        overlay.style.display = 'none';
                    }
                    console.log('✅ 开始学习按钮已点击，视频开始播放');
                } else {
                    console.error('❌ 找不到视频播放器');
                }
            });
            console.log('✅ 开始学习按钮事件已绑定');
        } else {
            console.error('❌ 找不到开始学习按钮');
        }

        // 视频控制
        const video = document.getElementById('courseVideo');
        console.log('查找视频播放器 courseVideo (初始化)...');
        console.log('video 元素:', video);
        
        if (video) {
            // 视频播放状态更新
            video.addEventListener('play', function() {
                console.log('视频开始播放');
            });

            video.addEventListener('pause', function() {
                console.log('视频暂停');
            });

            // 视频进度更新（用于触发暂停）
            video.addEventListener('timeupdate', function() {
                const currentTime = video.currentTime;
                console.log('视频播放进度:', currentTime.toFixed(2), '秒');

                // 检查是否到达暂停时间点
                if (currentTime >= CONFIG.VIDEO_PAUSE_TIME && !video.paused) {
                    video.pause();
                    console.log('到达暂停时间点', CONFIG.VIDEO_PAUSE_TIME, '秒，暂停视频');
                }
            });

            // 更新播放时间显示
            const currentTimeSpan = document.getElementById('currentTime');
            const totalTimeSpan = document.getElementById('totalTime');
            
            if (currentTimeSpan) {
                video.addEventListener('timeupdate', function() {
                    const currentMinutes = Math.floor(video.currentTime / 60);
                    const currentSeconds = Math.floor(video.currentTime % 60);
                    currentTimeSpan.textContent = `${currentMinutes.toString().padStart(2, '0')}:${currentSeconds.toString().padStart(2, '0')}`;
                });
            }
            
            if (totalTimeSpan) {
                video.addEventListener('loadedmetadata', function() {
                    const totalMinutes = Math.floor(video.duration / 60);
                    const totalSeconds = Math.floor(video.duration % 60);
                    totalTimeSpan.textContent = `${totalMinutes.toString().padStart(2, '0')}:${totalSeconds.toString().padStart(2, '0')}`;
                });
            }
            
            // 更新进度条
            const progressFill = document.getElementById('progressFill');
            if (progressFill) {
                video.addEventListener('timeupdate', function() {
                    const progress = (video.currentTime / video.duration) * 100;
                    progressFill.style.width = `${progress}%`;
                });
            }

            console.log('✅ 视频事件监听器已绑定');
        } else {
            console.error('❌ 找不到视频播放器');
            // 尝试查找所有视频元素
            const allVideos = document.querySelectorAll('video');
            console.log('页面中的所有视频元素:', allVideos.length);
            allVideos.forEach((v, index) => {
                console.log(`视频元素 ${index}:`, v.id, v.className);
            });
        }

        console.log('✅ 初始化完成');
    }, 100); // 延迟100毫秒，确保DOM完全渲染
});
