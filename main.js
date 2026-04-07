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
            const currentTime = video.currentTime;
            
            // 检查是否到达第一道测试题暂停时间点（385秒 = 6分25秒）
            if (currentTime >= CONFIG.VIDEO_PAUSE_TIME && !video.paused) {
                console.log('到达第一道测试题时间点，暂停视频');
                video.pause();
                updatePlayButtonState(false);
                
                // 显示暂停遮罩层
                const videoOverlay = document.getElementById('videoOverlay');
                if (videoOverlay) {
                    videoOverlay.classList.remove('hidden');
                    const overlayContent = videoOverlay.querySelector('.overlay-content');
                    if (overlayContent) {
                        overlayContent.querySelector('h2').textContent = '习题时间';
                        overlayContent.querySelector('p').textContent = '请完成所有题目后继续';
                        // 隐藏开始学习按钮
                        const startBtn = overlayContent.querySelector('.start-btn');
                        if (startBtn) {
                            startBtn.style.display = 'none';
                        }
                    }
                }
            }
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
    
    // 📺 添加视频进度信息到消息中
    const videoProgress = video ? video.currentTime : 0;
    const enhancedMessage = `[视频进度:${videoProgress.toFixed(1)}秒] ${message}`;
    
    const reply = await callCozeAPI(enhancedMessage);
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

    // 移除视频进度信息（不显示给学生看）
    // 匹配格式：[视频进度:XXX.X秒]
    content = content.replace(/\[视频进度:[^\]]+\]/g, '');
    
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
    
    // 匹配格式：[VIDEO:play|时间|原因]（播放到指定时间点）
    const playMatch = content.match(/\[VIDEO:play\|(\d+)\|([^\]]*)\]/);
    if (playMatch) {
        return { action: 'play', time: parseInt(playMatch[1]), reason: playMatch[2] };
    }
    
    // 匹配格式：[VIDEO:resume]（恢复播放，不跳转）
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
    } else if (control.action === 'play') {
        // 跳转到指定时间点并播放
        video.currentTime = control.time;
        video.play();
        updatePlayButtonState(true);
        
        // 隐藏遮罩层
        const videoOverlay = document.getElementById('videoOverlay');
        if (videoOverlay) {
            videoOverlay.classList.add('hidden');
        }
        console.log('视频跳转至', control.time, '秒并播放:', control.reason);
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
    }
}

// ==================== 更新播放按钮状态 ====================
function updatePlayButtonState(isPlaying) {
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
        if (isPlaying) {
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            playPauseBtn.title = '暂停';
        } else {
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            playPauseBtn.title = '播放';
        }
    }
}

// ==================== 显示/隐藏加载状态 ====================
function showLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) {
        if (show) {
            loading.classList.remove('hidden');
        } else {
            loading.classList.add('hidden');
        }
    }
}

// ==================== 调用扣子API ====================
async function callCozeAPI(message) {
    try {
        console.log('发送消息到扣子API:', message);
        
        const body = {
            bot_id: CONFIG.BOT_ID,
            user_id: CONFIG.USER_ID,
            query: message,
            stream: false
        };
        
        // 如果有conversation_id，添加到请求中
        if (conversationId) {
            body.conversation_id = conversationId;
        }
        
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.API_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API请求失败:', response.status, errorText);
            throw new Error(`API请求失败: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API响应:', data);
        
        // 保存conversation_id（用于后续对话）
        if (data.conversation_id) {
            conversationId = data.conversation_id;
            console.log('已保存conversation_id:', conversationId);
        }
        
        // 提取回复内容（使用正确的响应结构）
        let reply = '';
        if (data.choices && data.choices.length > 0) {
            const message = data.choices[0].message;
            if (message && message.content) {
                reply = message.content;
            }
        }
        
        if (!reply) {
            console.warn('未找到有效的回复内容');
            reply = '抱歉，我暂时无法回复。请稍后再试。';
        }
        
        console.log('提取的回复内容:', reply);
        return reply;
        
    } catch (error) {
        console.error('调用扣子API时发生错误:', error);
        return '抱歉，出现了网络错误。请检查网络连接后重试。';
    }
}
