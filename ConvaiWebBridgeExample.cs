using System;
using System.Runtime.InteropServices;
using UnityEngine;

/// <summary>
/// Convai WebGL桥接示例脚本
/// 展示如何在Unity中与网页进行双向通信
/// 
/// 使用方法：
/// 1. 将ConvaiWebBridge.jslib文件放到 Assets/Plugins/WebGL/ 目录
/// 2. 将此脚本附加到场景中的GameObject上
/// 3. 构建WebGL版本并测试通信功能
/// </summary>
public class ConvaiWebBridgeExample : MonoBehaviour
{
    [Header("Web通信设置")]
    [SerializeField] private bool enableDebugLogs = true;
    [SerializeField] private float heartbeatInterval = 5f; // 心跳间隔（秒）
    
    private float lastHeartbeat = 0f;
    private bool isWebFunctionAvailable = false;

#if UNITY_WEBGL && !UNITY_EDITOR
    // 导入JavaScript函数
    [DllImport("__Internal")]
    private static extern void callWebFunction(string jsonData);
    
    [DllImport("__Internal")]
    private static extern int isWebFunctionAvailable();
    
    [DllImport("__Internal")]
    private static extern string getCurrentURL();
    
    [DllImport("__Internal")]
    private static extern int checkMicrophoneSupport();
    
    [DllImport("__Internal")]
    private static extern void requestMicrophonePermission();
    
    [DllImport("__Internal")]
    private static extern void sendDebugLog(string message, int logLevel);
    
    [DllImport("__Internal")]
    private static extern string getBrowserInfo();
#endif

    /// <summary>
    /// Web输入数据结构（从网页接收）
    /// </summary>
    [System.Serializable]
    public class WebInputData
    {
        public string type;     // "text", "voice_start", "voice_stop"
        public string content;  // 文本内容
        public string source;   // "web"
    }

    /// <summary>
    /// Unity输出数据结构（发送到网页）
    /// </summary>
    [System.Serializable]
    public class UnityOutputData
    {
        public string type;           // "user_text", "npc_text", "talking_status"
        public string content;        // 消息内容
        public string npcName;        // NPC名称
        public string timestamp;      // 时间戳
        public AdditionalData additionalData; // 附加数据
        
        [System.Serializable]
        public class AdditionalData
        {
            public bool isTalking;
        }
    }

    void Start()
    {
        InitializeWebBridge();
    }

    void Update()
    {
        // 定期发送心跳
        if (Time.time - lastHeartbeat > heartbeatInterval)
        {
            SendHeartbeat();
            lastHeartbeat = Time.time;
        }
    }

    /// <summary>
    /// 初始化Web桥接
    /// </summary>
    private void InitializeWebBridge()
    {
        LogDebug("正在初始化Web桥接...");

#if UNITY_WEBGL && !UNITY_EDITOR
        try
        {
            // 检查Web函数可用性
            isWebFunctionAvailable = isWebFunctionAvailable() == 1;
            LogDebug($"Web函数可用性: {isWebFunctionAvailable}");
            
            // 获取浏览器信息
            string browserInfo = getBrowserInfo();
            LogDebug($"浏览器信息: {browserInfo}");
            
            // 检查麦克风支持
            bool micSupport = checkMicrophoneSupport() == 1;
            LogDebug($"麦克风支持: {micSupport}");
            
            // 请求麦克风权限
            if (micSupport)
            {
                requestMicrophonePermission();
            }
            
            // 发送初始化完成消息
            SendUnityOutput("system_ready", "Unity WebGL桥接初始化完成", "System");
            
            LogDebug("Web桥接初始化成功！");
        }
        catch (System.Exception e)
        {
            LogError($"Web桥接初始化失败: {e.Message}");
        }
#else
        LogDebug("非WebGL环境，跳过Web桥接初始化");
#endif
    }

    /// <summary>
    /// 接收来自网页的输入（由网页调用）
    /// 这个方法会被Unity的SendMessage系统调用
    /// </summary>
    /// <param name="jsonInput">JSON格式的输入数据</param>
    public void InjectWebInput(string jsonInput)
    {
        try
        {
            LogDebug($"收到网页输入: {jsonInput}");
            
            WebInputData inputData = JsonUtility.FromJson<WebInputData>(jsonInput);
            
            switch (inputData.type)
            {
                case "text":
                    HandleTextInput(inputData.content);
                    break;
                    
                case "voice_start":
                    HandleVoiceStart();
                    break;
                    
                case "voice_stop":
                    HandleVoiceStop();
                    break;
                    
                default:
                    LogWarning($"未知的输入类型: {inputData.type}");
                    break;
            }
        }
        catch (System.Exception e)
        {
            LogError($"处理网页输入失败: {e.Message}");
        }
    }

    /// <summary>
    /// 处理文本输入
    /// </summary>
    /// <param name="text">输入的文本</param>
    private void HandleTextInput(string text)
    {
        LogDebug($"处理文本输入: {text}");
        
        // 回显用户输入
        SendUnityOutput("user_text", text, "User");
        
        // 模拟NPC回复
        string npcReply = GenerateNPCReply(text);
        SendUnityOutput("npc_text", npcReply, "AI Assistant");
    }

    /// <summary>
    /// 处理语音开始
    /// </summary>
    private void HandleVoiceStart()
    {
        LogDebug("开始语音输入");
        
        // 更新NPC说话状态
        SendTalkingStatus("AI Assistant", false);
        
        // 这里可以添加语音录制逻辑
        // 例如：启动麦克风录制
    }

    /// <summary>
    /// 处理语音停止
    /// </summary>
    private void HandleVoiceStop()
    {
        LogDebug("停止语音输入");
        
        // 这里可以添加语音处理逻辑
        // 例如：停止录制，发送音频数据到语音识别服务
        
        // 模拟语音转文本结果
        string transcribedText = "这是模拟的语音转文本结果";
        SendUnityOutput("user_text", transcribedText, "User (Voice)");
        
        // 模拟NPC回复
        string npcReply = GenerateNPCReply(transcribedText);
        SendUnityOutput("npc_text", npcReply, "AI Assistant");
    }

    /// <summary>
    /// 生成NPC回复（示例）
    /// </summary>
    /// <param name="userInput">用户输入</param>
    /// <returns>NPC回复</returns>
    private string GenerateNPCReply(string userInput)
    {
        // 这里是简单的示例回复逻辑
        // 实际项目中应该调用Convai API或其他AI服务
        
        string[] responses = {
            $"我理解你说的是：{userInput}",
            "这是一个很有趣的话题！",
            "让我想想如何回应...",
            "感谢你的输入！",
            $"关于'{userInput}'，我有一些想法..."
        };
        
        int randomIndex = UnityEngine.Random.Range(0, responses.Length);
        return responses[randomIndex];
    }

    /// <summary>
    /// 发送Unity输出到网页
    /// </summary>
    /// <param name="type">消息类型</param>
    /// <param name="content">消息内容</param>
    /// <param name="npcName">NPC名称</param>
    public void SendUnityOutput(string type, string content, string npcName = "")
    {
        try
        {
            UnityOutputData outputData = new UnityOutputData
            {
                type = type,
                content = content,
                npcName = npcName,
                timestamp = System.DateTime.Now.ToString("HH:mm:ss"),
                additionalData = new UnityOutputData.AdditionalData()
            };
            
            string jsonOutput = JsonUtility.ToJson(outputData);
            
#if UNITY_WEBGL && !UNITY_EDITOR
            if (isWebFunctionAvailable)
            {
                callWebFunction(jsonOutput);
                LogDebug($"发送到网页: {jsonOutput}");
            }
            else
            {
                LogWarning("Web函数不可用，无法发送数据到网页");
            }
#else
            LogDebug($"[模拟] 发送到网页: {jsonOutput}");
#endif
        }
        catch (System.Exception e)
        {
            LogError($"发送Unity输出失败: {e.Message}");
        }
    }

    /// <summary>
    /// 发送NPC说话状态
    /// </summary>
    /// <param name="npcName">NPC名称</param>
    /// <param name="isTalking">是否在说话</param>
    public void SendTalkingStatus(string npcName, bool isTalking)
    {
        try
        {
            UnityOutputData outputData = new UnityOutputData
            {
                type = "talking_status",
                content = isTalking ? "开始说话" : "停止说话",
                npcName = npcName,
                timestamp = System.DateTime.Now.ToString("HH:mm:ss"),
                additionalData = new UnityOutputData.AdditionalData
                {
                    isTalking = isTalking
                }
            };
            
            string jsonOutput = JsonUtility.ToJson(outputData);
            
#if UNITY_WEBGL && !UNITY_EDITOR
            if (isWebFunctionAvailable)
            {
                callWebFunction(jsonOutput);
                LogDebug($"发送说话状态: {jsonOutput}");
            }
#else
            LogDebug($"[模拟] 发送说话状态: {jsonOutput}");
#endif
        }
        catch (System.Exception e)
        {
            LogError($"发送说话状态失败: {e.Message}");
        }
    }

    /// <summary>
    /// 发送心跳消息
    /// </summary>
    private void SendHeartbeat()
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        // 重新检查Web函数可用性
        isWebFunctionAvailable = isWebFunctionAvailable() == 1;
#endif
        
        LogDebug($"心跳检测 - Web函数可用: {isWebFunctionAvailable}");
    }

    /// <summary>
    /// 麦克风权限结果回调（由JavaScript调用）
    /// </summary>
    /// <param name="result">"granted", "denied", 或 "not_supported"</param>
    public void OnMicrophonePermissionResult(string result)
    {
        LogDebug($"麦克风权限结果: {result}");
        
        switch (result)
        {
            case "granted":
                SendUnityOutput("system_info", "麦克风权限已获取", "System");
                break;
            case "denied":
                SendUnityOutput("system_info", "麦克风权限被拒绝", "System");
                break;
            case "not_supported":
                SendUnityOutput("system_info", "浏览器不支持麦克风", "System");
                break;
        }
    }

    /// <summary>
    /// 测试通信功能
    /// </summary>
    [ContextMenu("测试Web通信")]
    public void TestWebCommunication()
    {
        SendUnityOutput("system_info", "这是一条测试消息", "Test System");
    }

    // 日志方法
    private void LogDebug(string message)
    {
        if (enableDebugLogs)
        {
            Debug.Log($"[ConvaiWebBridge] {message}");
            
#if UNITY_WEBGL && !UNITY_EDITOR
            sendDebugLog(message, 0);
#endif
        }
    }

    private void LogWarning(string message)
    {
        Debug.LogWarning($"[ConvaiWebBridge] {message}");
        
#if UNITY_WEBGL && !UNITY_EDITOR
        sendDebugLog(message, 1);
#endif
    }

    private void LogError(string message)
    {
        Debug.LogError($"[ConvaiWebBridge] {message}");
        
#if UNITY_WEBGL && !UNITY_EDITOR
        sendDebugLog(message, 2);
#endif
    }
}
