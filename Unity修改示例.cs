// 在你现有的ConvaiGRPCWebAPI.cs脚本顶部添加这些引用
using System.Runtime.InteropServices;

public class ConvaiGRPCWebAPI : MonoBehaviour
{
    // 1. 添加WebGL平台的DllImport声明
#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")]
    private static extern void callWebFunction(string jsonData);
    
    [DllImport("__Internal")]
    private static extern int isWebFunctionAvailable();
    
    [DllImport("__Internal")]
    private static extern void sendDebugLog(string message, int logLevel);
#endif

    // 2. 定义数据结构
    [System.Serializable]
    public class WebInputData
    {
        public string type;     // "text", "voice_start", "voice_stop"
        public string content;  // 文本内容
        public string source;   // "web"
    }

    [System.Serializable]
    public class UnityOutputData
    {
        public string type;           // "user_text", "npc_text", "talking_status"
        public string content;        // 消息内容
        public string npcName;        // NPC名称
        public string timestamp;      // 时间戳
        public AdditionalData additionalData;
        
        [System.Serializable]
        public class AdditionalData
        {
            public bool isTalking;
        }
    }

    // 3. 添加接收网页输入的方法（这个方法名很重要，React会调用它）
    public void InjectWebInput(string jsonInput)
    {
        try
        {
            Debug.Log($"收到网页输入: {jsonInput}");
            
            WebInputData inputData = JsonUtility.FromJson<WebInputData>(jsonInput);
            
            switch (inputData.type)
            {
                case "text":
                    // 处理文本输入 - 调用你现有的文本处理方法
                    ProcessTextInput(inputData.content);
                    break;
                    
                case "voice_start":
                    // 开始语音录制 - 调用你现有的语音开始方法
                    StartVoiceRecording();
                    break;
                    
                case "voice_stop":
                    // 停止语音录制 - 调用你现有的语音停止方法
                    StopVoiceRecording();
                    break;
                    
                default:
                    Debug.LogWarning($"未知的输入类型: {inputData.type}");
                    break;
            }
        }
        catch (System.Exception e)
        {
            Debug.LogError($"处理网页输入失败: {e.Message}");
        }
    }

    // 4. 添加发送输出到网页的方法
    private void SendOutputToWeb(string type, string content, string npcName = "", bool isTalking = false)
    {
        try
        {
            UnityOutputData outputData = new UnityOutputData
            {
                type = type,
                content = content,
                npcName = npcName,
                timestamp = System.DateTime.Now.ToString("HH:mm:ss"),
                additionalData = new UnityOutputData.AdditionalData
                {
                    isTalking = isTalking
                }
            };
            
            string jsonOutput = JsonUtility.ToJson(outputData);
            
#if UNITY_WEBGL && !UNITY_EDITOR
            if (isWebFunctionAvailable() == 1)
            {
                callWebFunction(jsonOutput);
                Debug.Log($"发送到网页: {jsonOutput}");
            }
            else
            {
                Debug.LogWarning("Web函数不可用，无法发送数据到网页");
            }
#else
            Debug.Log($"[模拟] 发送到网页: {jsonOutput}");
#endif
        }
        catch (System.Exception e)
        {
            Debug.LogError($"发送Unity输出失败: {e.Message}");
        }
    }

    // 5. 在你现有的方法中调用SendOutputToWeb
    
    // 例如：当用户输入文本时（包括语音转录结果）
    private void OnUserTextInput(string userText)
    {
        // 发送用户输入到网页
        SendOutputToWeb("user_text", userText, "User");
        
        // 你的原有处理逻辑...
    }
    
    // 例如：当NPC回复时
    private void OnNPCResponse(string npcText, string npcName)
    {
        // 发送NPC回复到网页
        SendOutputToWeb("npc_text", npcText, npcName);
        
        // 你的原有处理逻辑...
    }
    
    // 例如：当NPC开始/停止说话时
    private void OnNPCTalkingStatusChange(string npcName, bool isTalking)
    {
        // 发送说话状态到网页
        SendOutputToWeb("talking_status", isTalking ? "开始说话" : "停止说话", npcName, isTalking);
        
        // 你的原有处理逻辑...
    }

    // 6. 你现有的方法保持不变，只需要在适当的地方调用SendOutputToWeb
    private void ProcessTextInput(string text)
    {
        // 你的现有文本处理逻辑
        // ...
        
        // 添加这一行来发送用户输入到网页
        SendOutputToWeb("user_text", text, "User");
    }
    
    private void StartVoiceRecording()
    {
        // 你的现有语音开始逻辑
        // ...
    }
    
    private void StopVoiceRecording()
    {
        // 你的现有语音停止逻辑
        // ...
    }
}

