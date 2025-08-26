// 在你现有的 ConvaiGRPCWebAPI.cs 文件中需要做以下修改：

// 1. 在文件顶部添加新的 DllImport 声明（替换现有的 Application.ExternalCall）
#if UNITY_WEBGL && !UNITY_EDITOR
    // 添加我们的新桥接函数
    [DllImport("__Internal")] private static extern void callWebFunction(string jsonData);
    [DllImport("__Internal")] private static extern int isWebFunctionAvailable();
    [DllImport("__Internal")] private static extern void sendDebugLog(string message, int logLevel);
    
    // 保留你现有的所有 DllImport 声明
    [DllImport("__Internal")] private static extern void initMicrophone();
    [DllImport("__Internal")] private static extern void startAudioChunk();
    [DllImport("__Internal")] private static extern void endAudioChunk();
    // ... 其他现有的 DllImport
#endif

// 2. 修改 SendOutputToWeb 方法（替换 Application.ExternalCall）
private void SendOutputToWeb(string type, string content, string npcName = "", object additionalData = null)
{
#if UNITY_WEBGL && !UNITY_EDITOR
    try
    {
        var outputData = new
        {
            type = type,
            content = content,
            npcName = npcName,
            timestamp = System.DateTime.Now.ToString("HH:mm:ss"),
            additionalData = additionalData
        };
        
        string jsonData = JsonUtility.ToJson(outputData);
        
        // 替换 Application.ExternalCall 为我们的新方法
        if (isWebFunctionAvailable() == 1)
        {
            callWebFunction(jsonData);
            ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] Sent to web: {type} - {content}", ConvaiLogger.LogCategory.Character);
        }
        else
        {
            ConvaiLogger.Warn("[ConvaiGRPCWebAPI] Web function not available, cannot send data to web", ConvaiLogger.LogCategory.Character);
        }
    }
    catch (Exception e)
    {
        ConvaiLogger.Error($"[{nameof(ConvaiGRPCWebAPI)}] Failed to send output to web: {e.Message}", ConvaiLogger.LogCategory.Character);
    }
#else
    ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] Web Output (Editor): {type} - {content} (NPC: {npcName})", ConvaiLogger.LogCategory.Character);
#endif
}

// 3. 添加调试日志方法（可选但推荐）
private void LogToWeb(string message, int logLevel = 0)
{
#if UNITY_WEBGL && !UNITY_EDITOR
    try
    {
        sendDebugLog(message, logLevel);
    }
    catch (Exception e)
    {
        ConvaiLogger.Error($"Failed to send debug log to web: {e.Message}", ConvaiLogger.LogCategory.Character);
    }
#endif
}

// 4. 在 Awake() 方法中添加初始化日志
private void Awake()
{
    // ... 你现有的 Awake 代码 ...
    
    // 在最后添加这行
#if UNITY_WEBGL && !UNITY_EDITOR
    LogToWeb("ConvaiGRPCWebAPI initialized successfully", 0);
#endif
}

