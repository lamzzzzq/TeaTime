/**
 * Convai WebGL Bridge - Unity与Web页面通信的JavaScript库
 * 
 * 这个文件需要放在Unity项目的 Assets/Plugins/WebGL/ 目录下
 * 文件名必须以 .jslib 结尾
 * 
 * Unity构建WebGL时会自动包含这个文件中的函数
 */

mergeInto(LibraryManager.library, {

    /**
     * 调用网页函数 - Unity调用此函数向网页发送数据
     * @param {string} jsonData - JSON格式的数据字符串
     */
    callWebFunction: function(jsonData) {
        try {
            // 将Unity的字符串指针转换为JavaScript字符串
            var dataString = UTF8ToString(jsonData);
            
            console.log('🔄 Unity调用Web函数:', dataString);
            
            // 调用全局的receiveUnityOutput函数
            if (typeof window.receiveUnityOutput === 'function') {
                window.receiveUnityOutput(dataString);
            } else {
                console.warn('⚠️ window.receiveUnityOutput函数未定义');
            }
        } catch (error) {
            console.error('❌ callWebFunction执行失败:', error);
        }
    },

    /**
     * 检查网页函数是否可用
     * @returns {number} 1表示可用，0表示不可用
     */
    isWebFunctionAvailable: function() {
        return (typeof window.receiveUnityOutput === 'function') ? 1 : 0;
    },

    /**
     * 获取当前网页URL
     * @returns {string} 当前页面的URL
     */
    getCurrentURL: function() {
        try {
            var url = window.location.href;
            var bufferSize = lengthBytesUTF8(url) + 1;
            var buffer = _malloc(bufferSize);
            stringToUTF8(url, buffer, bufferSize);
            return buffer;
        } catch (error) {
            console.error('❌ getCurrentURL执行失败:', error);
            return 0;
        }
    },

    /**
     * 检查浏览器是否支持麦克风
     * @returns {number} 1表示支持，0表示不支持
     */
    checkMicrophoneSupport: function() {
        try {
            return (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ? 1 : 0;
        } catch (error) {
            console.error('❌ checkMicrophoneSupport执行失败:', error);
            return 0;
        }
    },

    /**
     * 请求麦克风权限
     * 这是一个异步操作，结果会通过Unity的SendMessage回调
     */
    requestMicrophonePermission: function() {
        try {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia({ audio: true })
                    .then(function(stream) {
                        console.log('✅ 麦克风权限获取成功');
                        // 停止音频流
                        stream.getTracks().forEach(track => track.stop());
                        
                        // 通知Unity权限获取成功
                        if (typeof unityInstance !== 'undefined' && unityInstance.SendMessage) {
                            unityInstance.SendMessage('ConvaiGRPCWebAPI', 'OnMicrophonePermissionResult', 'granted');
                        }
                    })
                    .catch(function(error) {
                        console.error('❌ 麦克风权限获取失败:', error);
                        
                        // 通知Unity权限获取失败
                        if (typeof unityInstance !== 'undefined' && unityInstance.SendMessage) {
                            unityInstance.SendMessage('ConvaiGRPCWebAPI', 'OnMicrophonePermissionResult', 'denied');
                        }
                    });
            } else {
                console.warn('⚠️ 浏览器不支持麦克风API');
                
                // 通知Unity不支持
                if (typeof unityInstance !== 'undefined' && unityInstance.SendMessage) {
                    unityInstance.SendMessage('ConvaiGRPCWebAPI', 'OnMicrophonePermissionResult', 'not_supported');
                }
            }
        } catch (error) {
            console.error('❌ requestMicrophonePermission执行失败:', error);
        }
    },

    /**
     * 发送调试日志到浏览器控制台
     * @param {string} message - 日志消息
     * @param {number} logLevel - 日志级别 (0=Log, 1=Warning, 2=Error)
     */
    sendDebugLog: function(message, logLevel) {
        try {
            var messageString = UTF8ToString(message);
            
            switch (logLevel) {
                case 0:
                    console.log('🎮 Unity:', messageString);
                    break;
                case 1:
                    console.warn('🎮 Unity Warning:', messageString);
                    break;
                case 2:
                    console.error('🎮 Unity Error:', messageString);
                    break;
                default:
                    console.log('🎮 Unity:', messageString);
            }
        } catch (error) {
            console.error('❌ sendDebugLog执行失败:', error);
        }
    },

    /**
     * 获取浏览器信息
     * @returns {string} 浏览器信息的JSON字符串
     */
    getBrowserInfo: function() {
        try {
            var info = {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine,
                screenWidth: screen.width,
                screenHeight: screen.height,
                windowWidth: window.innerWidth,
                windowHeight: window.innerHeight
            };
            
            var infoString = JSON.stringify(info);
            var bufferSize = lengthBytesUTF8(infoString) + 1;
            var buffer = _malloc(bufferSize);
            stringToUTF8(infoString, buffer, bufferSize);
            return buffer;
        } catch (error) {
            console.error('❌ getBrowserInfo执行失败:', error);
            return 0;
        }
    }

});
