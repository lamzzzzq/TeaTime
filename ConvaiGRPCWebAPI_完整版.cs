using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Text;
using Convai.Scripts.Runtime.Features;
using Convai.Scripts.Runtime.LoggerSystem;
using Convai.Scripts.Runtime.UI;
using Convai.Scripts.Runtime.Utils;
using UnityEngine;
using UnityEngine.Networking;

namespace Convai.Scripts.Runtime.Core
{
    /// <summary>
    /// Main class for handling Convai GRPC Web API interactions via JavaScript interop for WebGL.
    /// In Unity Editor, uses HTTP REST API for testing. In WebGL build, uses JavaScript SDK.
    /// Manages API key, interaction state, text I/O, visemes, actions, triggers, and narrative design callbacks.
    /// Supports bidirectional communication with React web interface.
    /// </summary>
    [DefaultExecutionOrder(-100)]
    public class ConvaiGRPCWebAPI : MonoBehaviour
    {
        #region Singleton & Core References
        // Singleton Instance
        public static ConvaiGRPCWebAPI Instance { get; private set; }

        [HideInInspector] public string APIKey; // Loaded from Resources

        // State
        private ConvaiNPC _currentInteractingNPC; // The NPC currently targeted for interaction
        private ConvaiNPC _interactionCandidateNPC; // The NPC currently in player focus (candidate)
        private string _lastReceivedText = string.Empty; // Cache last text response for UI optimization
        private float _audioVolume = 1.0f; // Internal cache for volume reported by JS

        // Public getter for the currently interacting NPC
        public ConvaiNPC CurrentInteractingNPC => _currentInteractingNPC;

        // Component References
        private ConvaiChatUIHandler _convaiChatUIHandler;

        // Object Pools (Visemes only)
        private ConvaiObjectPool<VisemesData> _visemesDataPool;

#if !UNITY_WEBGL || UNITY_EDITOR
        // HTTP REST API fields for Unity Editor
        private const string CONVAI_API_BASE_URL = "https://api.convai.com";
        private string _currentSessionID = "";
        private bool _isProcessingRequest = false;
#endif

        #endregion

        #region Events
        /// <summary>
        /// Fired when the player starts (true) or stops (false) speaking via input key.
        /// </summary>
        public event Action<bool> OnPlayerSpeakingChanged;

        /// <summary>
        /// Fired when the character starts (true) or stops (false) speaking, based on JS callback.
        /// </summary>
        public event Action<bool> OnCharacterSpeakingChanged;
        #endregion

        #region Unity Lifecycle Methods

        private void Awake()
        {
            // Singleton pattern
            if (Instance == null)
            {
                Instance = this;
            }
            else
            {
                ConvaiLogger.Warn($"Duplicate instance of {nameof(ConvaiGRPCWebAPI)} detected. Destroying this one.", ConvaiLogger.LogCategory.Character);
                Destroy(gameObject);
                return;
            }

            _convaiChatUIHandler = FindObjectOfType<ConvaiChatUIHandler>();
            if (_convaiChatUIHandler == null)
                ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] {nameof(ConvaiChatUIHandler)} not found. Chat UI updates skipped.", ConvaiLogger.LogCategory.Character);

            // Load API Key
            LoadAPIKey();

            // Initialize required object pools
            try
            {
                _visemesDataPool = new ConvaiObjectPool<VisemesData>(15);
            }
            catch (Exception e)
            {
                ConvaiLogger.Error($"[{nameof(ConvaiGRPCWebAPI)}] Failed to initialize VisemesData pool: {e.Message}", ConvaiLogger.LogCategory.Character);
                enabled = false; return;
            }

            // Initialize microphone (WebGL specific)
#if UNITY_WEBGL && !UNITY_EDITOR
            try
            {
                initMicrophone();
                ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] WebGL Microphone initialized successfully.", ConvaiLogger.LogCategory.Character);
                
                // 发送初始化完成消息到React
                SendOutputToWeb("system_ready", "Unity WebGL initialized successfully", "System");
            }
            catch (Exception ex)
            {
                ConvaiLogger.Error($"[{nameof(ConvaiGRPCWebAPI)}] WebGL Microphone initialization failed: {ex.Message}", ConvaiLogger.LogCategory.Character);
            }
#else
            ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] WebGL Microphone initialization skipped in Unity Editor.", ConvaiLogger.LogCategory.Character);
#endif
        }

        // Using OnEnable/OnDisable for event subscription is robust for objects that might be deactivated/reactivated.
        private void OnEnable()
        {
            // Subscribe to NPC manager events
            if (ConvaiNPCManager.Instance != null)
            {
                ConvaiNPCManager.Instance.OnActiveNPCChanged += HandleInteractionCandidateChanged;
                // Handle initially active NPC
                HandleInteractionCandidateChanged(ConvaiNPCManager.Instance.activeConvaiNPC);
            }
            else if (Application.isPlaying) // Log error only during play mode
            {
                // Log error if the manager isn't available when this component enables
                ConvaiLogger.Error($"[{nameof(ConvaiGRPCWebAPI)}] {nameof(ConvaiNPCManager)} instance not found. NPC targeting will fail.", ConvaiLogger.LogCategory.Character);
            }
        }

        private void OnDisable()
        {
            // Unsubscribe from events to prevent memory leaks
            if (ConvaiNPCManager.Instance != null)
            {
                ConvaiNPCManager.Instance.OnActiveNPCChanged -= HandleInteractionCandidateChanged;
            }
        }

        // Using OnDestroy for final cleanup, though OnDisable handles most event unsubscriptions.
        private void OnDestroy()
        {
            if (ConvaiNPCManager.Instance != null)
            {
                ConvaiNPCManager.Instance.OnActiveNPCChanged -= HandleInteractionCandidateChanged;
            }

#if UNITY_WEBGL && !UNITY_EDITOR
            try { interruptCharacter(); } catch (Exception e) { ConvaiLogger.Error($"JS call interruptCharacter failed: {e.Message}", ConvaiLogger.LogCategory.Character); }
#else
            ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] JS Interop: interruptCharacter() called (Editor Dummy).", ConvaiLogger.LogCategory.Character);
#endif
        }

        #endregion

        #region Web Integration Methods (Called from JavaScript)

        /// <summary>
        /// Data structure for receiving input from the web interface
        /// </summary>
        [System.Serializable]
        public class WebInputData
        {
            public string type;     // "text", "voice_start", "voice_stop"
            public string content;  // 文本内容
            public string source;   // "web"
        }

        /// <summary>
        /// Public method called from JavaScript to inject web input into Unity
        /// </summary>
        /// <param name="jsonInput">JSON string containing web input data</param>
        public void InjectWebInput(string jsonInput)
        {
            try
            {
                var inputData = JsonUtility.FromJson<WebInputData>(jsonInput);
                ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] Received web input: {inputData.type} - {inputData.content}", ConvaiLogger.LogCategory.Character);

                switch (inputData.type)
                {
                    case "text":
                        RequestSendTextData(inputData.content);
                        break;
                    case "voice_start":
                        RequestStartRecordAudio();
                        break;
                    case "voice_stop":
                        RequestStopRecordAudio();
                        break;
                    default:
                        ConvaiLogger.Warn($"[{nameof(ConvaiGRPCWebAPI)}] Unknown web input type: {inputData.type}", ConvaiLogger.LogCategory.Character);
                        break;
                }
            }
            catch (Exception e)
            {
                ConvaiLogger.Error($"[{nameof(ConvaiGRPCWebAPI)}] Failed to process web input: {e.Message}", ConvaiLogger.LogCategory.Character);
            }
        }

        /// <summary>
        /// Sends output data to the web interface via JavaScript callback
        /// </summary>
        /// <param name="type">Output type (user_text, npc_text, talking_status, etc.)</param>
        /// <param name="content">Content to send</param>
        /// <param name="npcName">Name of the NPC (optional)</param>
        /// <param name="additionalData">Additional data object (optional)</param>
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
                Application.ExternalCall("receiveUnityOutput", jsonData);
                ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] Sent to web: {type} - {content}", ConvaiLogger.LogCategory.Character);
            }
            catch (Exception e)
            {
                ConvaiLogger.Error($"[{nameof(ConvaiGRPCWebAPI)}] Failed to send output to web: {e.Message}", ConvaiLogger.LogCategory.Character);
            }
#else
            ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] Web Output (Editor): {type} - {content} (NPC: {npcName})", ConvaiLogger.LogCategory.Character);
#endif
        }

        #endregion

        #region Interaction Management
        /// <summary>
        /// Sets the target NPC for interaction, handling initialization and interruptions.
        /// Called internally based on player actions or NPC manager events.
        /// </summary>
        /// <param name="targetNPC">The new NPC target, or null to clear.</param>
        private void SetInteractionTarget(ConvaiNPC targetNPC)
        {
            // Case 1: Clearing the target
            if (targetNPC == null)
            {
                if (_currentInteractingNPC != null)
                {
                    ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] Interaction target cleared. Previous: {_currentInteractingNPC.name}", ConvaiLogger.LogCategory.Character);
                    // Interrupt any ongoing speech from the previous target
                    InterruptCharacterSpeechInternal();
                    _currentInteractingNPC = null;
                }
                return;
            }

            // Case 2: Targeting the same NPC again
            if (_currentInteractingNPC == targetNPC)
            {
                // If the same NPC is already talking, interrupt it to allow player input.
                if (_currentInteractingNPC.isCharacterTalking)
                {
                    ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] Re-interacting with talking NPC: {_currentInteractingNPC.name}. Interrupting.", ConvaiLogger.LogCategory.Character);
                    InterruptCharacterSpeechInternal();
                }
                // No need to re-initialize if it's the same target.
                return;
            }

            // Case 3: Switching target from one NPC to another
            // If the *previous* NPC was talking, interrupt it.
            if (_currentInteractingNPC != null && _currentInteractingNPC.isCharacterTalking)
            {
                ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] Switching target. Interrupting previous NPC: {_currentInteractingNPC.name}", ConvaiLogger.LogCategory.Character);
                InterruptCharacterSpeechInternal(); // Interrupt the old one
            }

            // Set the new NPC as the current target
            _currentInteractingNPC = targetNPC;
            ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] Setting interaction target to: {_currentInteractingNPC.name}", ConvaiLogger.LogCategory.Character);

            // 发送NPC切换信息到React
            SendOutputToWeb("npc_selected", $"Now interacting with {_currentInteractingNPC.characterName}", _currentInteractingNPC.characterName);

            // Initialize the JS client for the new target NPC
#if UNITY_WEBGL && !UNITY_EDITOR
            // Prepare configurations
            string templateKeyJSON = GetJsonString(_currentInteractingNPC.NarrativeDesignKeyController?.narrativeDesignKeyController, "NarrativeDesign Keys");
            string actionConfigJSON = GetJsonString(_currentInteractingNPC.ActionsHandler?.ActionConfig, "Action Config");

            // Call the internal wrapper for JS client initialization
            InitializeConvaiClientWrapper(
                _currentInteractingNPC.characterID,
                enableAudioRecorder: true,
                actionConfigJson: actionConfigJSON,
                templateKeysJson: templateKeyJSON
            );
#else
            // Call wrapper even in editor to log the skip message
            InitializeConvaiClientWrapper(_currentInteractingNPC.characterID, true, "", "");
#endif
        }

        /// <summary>
        /// Handles changes in the potential NPC interaction candidate reported by the NPC Manager.
        /// Updates the internal candidate reference.
        /// </summary>
        private void HandleInteractionCandidateChanged(ConvaiNPC newCandidateNPC)
        {
            _interactionCandidateNPC = newCandidateNPC;
            
            // 发送候选NPC信息到React
            if (newCandidateNPC != null)
            {
                SendOutputToWeb("npc_candidate", $"NPC candidate: {newCandidateNPC.characterName}", newCandidateNPC.characterName);
            }
        }

        /// <summary>
        /// Internal method to signal speech interruption via JavaScript and perform local cleanup.
        /// </summary>
        private void InterruptCharacterSpeechInternal()
        {
            if (_currentInteractingNPC == null) return; // No target to interrupt

            ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] Requesting JS interrupt for {_currentInteractingNPC.name}", ConvaiLogger.LogCategory.Character);

#if UNITY_WEBGL && !UNITY_EDITOR
            try { interruptCharacter(); } catch (Exception e) { ConvaiLogger.Error($"JS call interruptCharacter failed: {e.Message}", ConvaiLogger.LogCategory.Character); }
#else
            ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] JS Interop: interruptCharacter() called (Editor Dummy).", ConvaiLogger.LogCategory.Character);
#endif

            // Ensure local NPC state reflects the interruption immediately
            // Use the ForceStop method on the NPC
            _currentInteractingNPC.ForceStopLocalPlaybackAndAnimation();

            // Immediately notify C# listeners that the character *should* have stopped speaking.
            OnCharacterSpeakingChanged?.Invoke(false);

            // Interrupted
            ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] Character interrupted: {_currentInteractingNPC.name}", ConvaiLogger.LogCategory.Character);
        }

        #endregion

        #region Public API Methods (Called by C# scripts like PlayerInteractionManager)

        /// <summary>
        /// Requests to start recording audio. Sets the interaction target to the current candidate first.
        /// </summary>
        public void RequestStartRecordAudio()
        {
            // Set/Confirm the interaction target before starting audio
            SetInteractionTarget(_interactionCandidateNPC);

            if (_currentInteractingNPC == null)
            {
                ConvaiLogger.Error($"[{nameof(ConvaiGRPCWebAPI)}] {nameof(RequestStartRecordAudio)} failed: No interaction target NPC set. Is player looking at an NPC?", ConvaiLogger.LogCategory.Character);
                SendOutputToWeb("system_error", "No NPC selected for voice interaction", "System");
                return;
            }

            ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] {nameof(RequestStartRecordAudio)} for {_currentInteractingNPC.name}", ConvaiLogger.LogCategory.Character);
            OnPlayerSpeakingChanged?.Invoke(true); // Notify listeners

            // 发送语音开始状态到React
            SendOutputToWeb("voice_recording", "Voice recording started", _currentInteractingNPC.characterName, new { recording = true });

#if UNITY_WEBGL && !UNITY_EDITOR
            try { startAudioChunk(); } catch (Exception e) { ConvaiLogger.Error($"JS call startAudioChunk failed: {e.Message}", ConvaiLogger.LogCategory.Character); }
#else
            // Unity Editor: Simulate voice input for testing
            StartCoroutine(SimulateVoiceInput());
#endif
        }

        /// <summary>
        /// Requests to stop recording audio for the currently interacting NPC.
        /// </summary>
        public void RequestStopRecordAudio()
        {
            // No need to SetInteractionTarget here, stop applies to the current target.
            if (_currentInteractingNPC == null)
            {
                ConvaiLogger.Warn($"[{nameof(ConvaiGRPCWebAPI)}] {nameof(RequestStopRecordAudio)} called but no NPC was interacting.", ConvaiLogger.LogCategory.Character);
                OnPlayerSpeakingChanged?.Invoke(false); // Ensure state reset
                return;
            }

            ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] {nameof(RequestStopRecordAudio)} called for {_currentInteractingNPC.name}", ConvaiLogger.LogCategory.Character);

            // 发送语音停止状态到React
            SendOutputToWeb("voice_recording", "Voice recording stopped", _currentInteractingNPC.characterName, new { recording = false });

#if UNITY_WEBGL && !UNITY_EDITOR
            try { endAudioChunk(); } catch (Exception e) { ConvaiLogger.Error($"JS call endAudioChunk failed: {e.Message}", ConvaiLogger.LogCategory.Character); }
#else
            // Unity Editor: Stop voice simulation
            StopCoroutine(nameof(SimulateVoiceInput));
            ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] Voice simulation stopped in Editor.", ConvaiLogger.LogCategory.Character);
#endif
            OnPlayerSpeakingChanged?.Invoke(false); // Notify listeners
        }

        /// <summary>
        /// Requests to send text data. Sets the interaction target to the current candidate first.
        /// </summary>
        /// <param name="text">The text message to send.</param>
        public void RequestSendTextData(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) { ConvaiLogger.Warn($"[{nameof(ConvaiGRPCWebAPI)}] {nameof(RequestSendTextData)} called with empty text.", ConvaiLogger.LogCategory.Character); return; }

            // Set/Confirm the interaction target before sending text
            SetInteractionTarget(_interactionCandidateNPC);

            if (_currentInteractingNPC == null)
            {
                ConvaiLogger.Error($"[{nameof(ConvaiGRPCWebAPI)}] {nameof(RequestSendTextData)} failed: No interaction target NPC set. Is player looking at an NPC?", ConvaiLogger.LogCategory.Character);
                SendOutputToWeb("system_error", "No NPC selected for text interaction", "System");
                return;
            }

            ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] {nameof(RequestSendTextData)} for {_currentInteractingNPC.name}: {text}", ConvaiLogger.LogCategory.Character);

            // 发送用户文本输入到React（立即显示）
            SendOutputToWeb("user_text", text, "User");

#if UNITY_WEBGL && !UNITY_EDITOR
             try { sendTextRequest(text); } catch (Exception e) { ConvaiLogger.Error($"JS call sendTextRequest failed: {e.Message}", ConvaiLogger.LogCategory.Character); }
#else
            // Unity Editor: Use simulated response for testing (avoids HTTP issues)
            StartCoroutine(SendTextViaSimulation(text));
#endif
        }

        /// <summary>
        /// Sends interaction feedback (like/dislike) via the JavaScript library.
        /// </summary>
        public void SendFeedback(string characterID, string sessionID, bool thumbsUp, string feedbackText)
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            try { sendFeedback(characterID, sessionID, thumbsUp, feedbackText); } catch (Exception e) { ConvaiLogger.Error($"JS call sendFeedback failed: {e.Message}", ConvaiLogger.LogCategory.Character); }
#else
            ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] JS Interop: sendFeedback(CharID: {characterID}, Session: {sessionID}, Like: {thumbsUp}, Text: {feedbackText}) called (Editor Dummy).", ConvaiLogger.LogCategory.Character);
#endif
            
            // 发送反馈信息到React
            SendOutputToWeb("feedback_sent", $"Feedback: {(thumbsUp ? "👍" : "👎")} {feedbackText}", _currentInteractingNPC?.characterName ?? "");
        }

        /// <summary>
        /// Sends a trigger name and message via the JavaScript library to the current active NPC.
        /// </summary>
        /// <param name="triggerConfig">Configuration containing the trigger name and message.</param>
        public void SendTriggerConfig(TriggerConfig triggerConfig) // Assumes TriggerConfig is defined elsewhere
        {
            // Uses _currentInteractingNPC which should be set by SetInteractionTarget via Requests methods
            if (_currentInteractingNPC == null) { ConvaiLogger.Warn($"[{nameof(ConvaiGRPCWebAPI)}] {nameof(SendTriggerConfig)} called, but no active NPC.", ConvaiLogger.LogCategory.Character); return; }
            if (triggerConfig == null) { ConvaiLogger.Warn($"[{nameof(ConvaiGRPCWebAPI)}] {nameof(SendTriggerConfig)} called with null config.", ConvaiLogger.LogCategory.Character); return; }

            string triggerName = triggerConfig.TriggerName ?? string.Empty;
            string triggerMessage = triggerConfig.TriggerMessage ?? string.Empty;
            ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] Sending Trigger: Name='{triggerName}', Message='{triggerMessage}' to {_currentInteractingNPC.name}", ConvaiLogger.LogCategory.Character);

#if UNITY_WEBGL && !UNITY_EDITOR
            try { sendTriggerData(triggerName, triggerMessage); } catch (Exception e) { ConvaiLogger.Error($"JS call sendTriggerData failed: {e.Message}", ConvaiLogger.LogCategory.Character); }
#else
            ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] JS Interop: sendTriggerData(Name: {triggerName}, Msg: {triggerMessage}) called (Editor Dummy).", ConvaiLogger.LogCategory.Character);
#endif

            // 发送触发器信息到React
            SendOutputToWeb("trigger_sent", $"Trigger: {triggerName} - {triggerMessage}", _currentInteractingNPC.characterName);
        }

        /// <summary>
        /// Updates the Action Configuration on the JavaScript side for the current active NPC.
        /// </summary>
        /// <param name="actionConfig">The action configuration object (type assumed defined elsewhere).</param>
        public void UpdateActionConfig(ActionConfig actionConfig) // Assumes ActionConfig is defined elsewhere
        {
            // Uses _currentInteractingNPC which should be set by SetInteractionTarget via Requests methods
            if (_currentInteractingNPC == null) { ConvaiLogger.Warn($"[{nameof(ConvaiGRPCWebAPI)}] {nameof(UpdateActionConfig)} called, but no active NPC.", ConvaiLogger.LogCategory.Character); return; }
            if (actionConfig == null) { ConvaiLogger.Warn($"[{nameof(ConvaiGRPCWebAPI)}] {nameof(UpdateActionConfig)} called with null config for {_currentInteractingNPC.name}.", ConvaiLogger.LogCategory.Character); return; }

            string actionConfigJson = GetJsonString(actionConfig, "Action Config for Update");
            if (string.IsNullOrEmpty(actionConfigJson)) return;

#if UNITY_WEBGL && !UNITY_EDITOR
             try { setActionConfig(actionConfigJson); } catch (Exception e) { ConvaiLogger.Error($"JS call setActionConfig failed: {e.Message}", ConvaiLogger.LogCategory.Character); }
#else
            ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] JS Interop: setActionConfig('{actionConfigJson}') called (Editor Dummy).", ConvaiLogger.LogCategory.Character);
#endif

            // 发送配置更新信息到React
            SendOutputToWeb("action_config_updated", "Action configuration updated", _currentInteractingNPC.characterName);
        }

        /// <summary>
        /// Public method to explicitly request interruption of the currently speaking character.
        /// </summary>
        public void InterruptCharacterSpeech()
        {
            // Calls the internal method that handles JS call and local state update
            InterruptCharacterSpeechInternal();
        }

        #endregion

        #region Audio Control Methods

        /// <summary> Toggles the audio playback volume (mute/unmute) via JS interop. </summary>
        public void ToggleAudioVolume()
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            try { toggleAudioVolume(); } catch (Exception e) { ConvaiLogger.Error($"JS call toggleAudioVolume failed: {e.Message}", ConvaiLogger.LogCategory.Character); }
#else
            ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] JS Interop: toggleAudioVolume() called (Editor Dummy).", ConvaiLogger.LogCategory.Character);
#endif
        }

        /// <summary> Pauses audio playback via JS interop. </summary>
        public void PauseAudio()
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            try { pauseAudio(); } catch (Exception e) { ConvaiLogger.Error($"JS call pauseAudio failed: {e.Message}", ConvaiLogger.LogCategory.Character); }
#else
            ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] JS Interop: pauseAudio() called (Editor Dummy).", ConvaiLogger.LogCategory.Character);
#endif
        }

        /// <summary> Resumes paused audio playback via JS interop. </summary>
        public void ResumeAudio()
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            try { resumeAudio(); } catch (Exception e) { ConvaiLogger.Error($"JS call resumeAudio failed: {e.Message}", ConvaiLogger.LogCategory.Character); }
#else
            ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] JS Interop: resumeAudio() called (Editor Dummy).", ConvaiLogger.LogCategory.Character);
#endif
        }

        /// <summary> Gets the last known audio volume level (set via SetAudioVolume callback). </summary>
        public float GetAudioVolume()
        {
            // Request update from JS side; value is returned via SetAudioVolume callback.
#if UNITY_WEBGL && !UNITY_EDITOR
            try { getAudioVolume(); } catch (Exception e) { ConvaiLogger.Error($"JS call getAudioVolume failed: {e.Message}", ConvaiLogger.LogCategory.Character); }
#endif
            return _audioVolume; // Return cached value
        }

        #endregion

        #region Callbacks from JavaScript (Invoked by JSLib)

        /// <summary> Callback for user's transcribed text. Updates UI and sends to web. </summary>
        public void OnUserResponseReceived(string text)
        {
            _convaiChatUIHandler?.SendPlayerText(text);
            // Send user's transcribed voice text to web interface
            SendOutputToWeb("user_text", text, "User", new { source = "voice" });
        }

        /// <summary> Callback for character's text response. Updates UI, prevents duplicates, and sends to web. </summary>
        public void OnTextResponseReceived(string responseText)
        {
            if (_currentInteractingNPC == null) { ConvaiLogger.Warn($"[{nameof(ConvaiGRPCWebAPI)}] {nameof(OnTextResponseReceived)} ignored: No active NPC.", ConvaiLogger.LogCategory.Character); return; }
            if (_convaiChatUIHandler == null) return;

            // Update UI only if text is new and not empty
            if (!string.IsNullOrEmpty(responseText) && responseText != _lastReceivedText)
            {
                _convaiChatUIHandler.SendCharacterText(_currentInteractingNPC.characterName, responseText);
                _lastReceivedText = responseText; // Update cache
                
                // Send NPC response to web interface
                SendOutputToWeb("npc_text", responseText, _currentInteractingNPC.characterName);
            }
        }

        /// <summary> Callback reporting current audio volume from JS. Updates local cache. </summary>
        public void SetAudioVolume(string volume)
        {
            if (float.TryParse(volume, NumberStyles.Any, CultureInfo.InvariantCulture, out float parsedVolume))
            {
                _audioVolume = Mathf.Clamp01(parsedVolume); // Clamp between 0 and 1
                // 发送音量信息到React
                SendOutputToWeb("audio_volume", _audioVolume.ToString("F2"), "", new { volume = _audioVolume });
            }
            else
            {
                ConvaiLogger.Warn($"[{nameof(ConvaiGRPCWebAPI)}] Failed to parse audio volume value: {volume}", ConvaiLogger.LogCategory.Character);
            }
        }

        /// <summary> Callback reporting character speaking status from JS. Invokes C# event and sends to web. </summary>
        public void SetTalkingStatus(string talkingStatus)
        {
            bool isTalking = talkingStatus == "true";
            switch (talkingStatus)
            {
                case "true":
                    OnCharacterSpeakingChanged?.Invoke(true);
                    break;
                case "false":
                    OnCharacterSpeakingChanged?.Invoke(false);
                    break;
            }
            
            // Send talking status to web interface
            SendOutputToWeb("talking_status", isTalking ? "NPC is speaking" : "NPC stopped speaking", _currentInteractingNPC?.characterName ?? "", new { isTalking = isTalking });
        }

        /// <summary> Callback for viseme data stream from JS. </summary>
        public void OnVisemeResponseReceived(string visemeDataString)
        {
            if (_currentInteractingNPC?.LipSync == null) return; // Ignore if no target or target has no LipSync
            if (string.IsNullOrWhiteSpace(visemeDataString) || visemeDataString.Length <= 2) return; // Ignore empty "[]"

            VisemesData pooledVisemesData = null;
            try
            {
                string[] dataValues = visemeDataString.Trim('[', ']').Split(',');
                Viseme visemeStruct = new Viseme();
                int loopCount = Mathf.Min(dataValues.Length, 15);
                for (int i = 0; i < loopCount; i++)
                {
                    if (float.TryParse(dataValues[i], NumberStyles.Float, CultureInfo.InvariantCulture, out float value))
                        visemeStruct.SetFieldValue(i, value);
                }
                pooledVisemesData = _visemesDataPool.GetObject();
                pooledVisemesData.Visemes = visemeStruct;
                ProcessVisemeData(pooledVisemesData);
            }
            catch (Exception e) { ConvaiLogger.Error($"[{nameof(ConvaiGRPCWebAPI)}] Viseme Processing Error: {e.Message}\nData: {visemeDataString}", ConvaiLogger.LogCategory.Character); }
            finally { if (pooledVisemesData != null && _visemesDataPool != null) _visemesDataPool.ReleaseObject(pooledVisemesData); }
        }

        /// <summary> Callback for Narrative Design/Behaviour Tree section updates from JS. </summary>
        public void OnBTResponseReceived(string narrativeSectionID)
        {
            if (_currentInteractingNPC?.NarrativeDesignManager == null) return; // Ignore if no target/component
            ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] Narrative Section ID Received for {_currentInteractingNPC.name}: {narrativeSectionID}", ConvaiLogger.LogCategory.Character);
            _currentInteractingNPC.NarrativeDesignManager.UpdateCurrentSection(narrativeSectionID);
            
            // 发送叙事设计信息到React
            SendOutputToWeb("narrative_section", $"Narrative section: {narrativeSectionID}", _currentInteractingNPC.characterName, new { sectionId = narrativeSectionID });
        }

        /// <summary> Callback for Action responses from JS. </summary>
        public void OnActionResponseReceived(string actionResponse)
        {
            if (_currentInteractingNPC?.ActionsHandler == null) return; // Ignore if no target/component
            if (_currentInteractingNPC.ActionsHandler.actionResponseList == null)
                _currentInteractingNPC.ActionsHandler.actionResponseList = new List<string>();
            _currentInteractingNPC.ActionsHandler.actionResponseList.Add(actionResponse);
            ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] Action Response Received for {_currentInteractingNPC.name}: {actionResponse}", ConvaiLogger.LogCategory.Character);
            
            // 发送动作响应信息到React
            SendOutputToWeb("action_response", actionResponse, _currentInteractingNPC.characterName);
        }

        #endregion

        #region Internal Helper Methods

        /// <summary> Loads the API key from the 'ConvaiAPIKey' ScriptableObject in Resources. </summary>
        private void LoadAPIKey()
        {
            try
            {
                ConvaiAPIKeySetup keySetup = Resources.Load<ConvaiAPIKeySetup>("ConvaiAPIKey");
                if (keySetup != null && !string.IsNullOrEmpty(keySetup.APIKey)) { APIKey = keySetup.APIKey; }
                else { APIKey = string.Empty; ConvaiLogger.Error($"[{nameof(ConvaiGRPCWebAPI)}] Convai API Key ('Resources/ConvaiAPIKey.asset') not found or empty. Use Convai > Setup menu.", ConvaiLogger.LogCategory.Character); }
            }
            catch (Exception e) { ConvaiLogger.Error($"[{nameof(ConvaiGRPCWebAPI)}] Error loading API Key: {e.Message}", ConvaiLogger.LogCategory.Character); APIKey = string.Empty; }
        }

        /// <summary> Internal wrapper to initialize the Convai JS client via DllImport. </summary>
        private void InitializeConvaiClientWrapper(string characterID, bool enableAudioRecorder, string actionConfigJson = "", string templateKeysJson = "")
        {
            if (string.IsNullOrEmpty(APIKey) || string.IsNullOrEmpty(characterID)) { ConvaiLogger.Error($"[{nameof(ConvaiGRPCWebAPI)}] Cannot initialize client: Missing API Key or Character ID.", ConvaiLogger.LogCategory.Character); return; }
            ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] Requesting JS Client Init for Character: {characterID}", ConvaiLogger.LogCategory.Character);
#if UNITY_WEBGL && !UNITY_EDITOR
            try { initializeConvaiClient(APIKey, characterID, enableAudioRecorder, actionConfigJson, templateKeysJson); }
            catch (Exception e) { ConvaiLogger.Error($"[{nameof(ConvaiGRPCWebAPI)}] JS call initializeConvaiClient failed for {characterID}: {e.Message}", ConvaiLogger.LogCategory.Character); }
#else
            ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] JS Client init skipped in Editor for {characterID}.", ConvaiLogger.LogCategory.Character);
#endif
            
            // 发送客户端初始化信息到React
            SendOutputToWeb("client_initialized", $"Convai client initialized for {characterID}", _currentInteractingNPC?.characterName ?? characterID);
        }

        /// <summary> Processes viseme data, copying the value to the NPC's LipSync component safely. </summary>
        private void ProcessVisemeData(VisemesData pooledVisemesData)
        {
            if (_currentInteractingNPC?.LipSync == null) return;
            try
            {
                Viseme visemeValue = pooledVisemesData.Visemes;
                if (visemeValue.Sil == -2)
                {
                    if (_currentInteractingNPC.LipSync.FaceDataList == null)
                        _currentInteractingNPC.LipSync.FaceDataList = new List<List<VisemesData>>();
                    _currentInteractingNPC.LipSync.FaceDataList.Add(new List<VisemesData>());
                }
                else
                {
                    List<List<VisemesData>> faceDataList = _currentInteractingNPC.LipSync.FaceDataList;
                    if (faceDataList == null || faceDataList.Count == 0) return;
                    VisemesData dataCopy = new VisemesData { Visemes = visemeValue };
                    faceDataList[faceDataList.Count - 1].Add(dataCopy);
                }
            }
            catch (Exception e) { ConvaiLogger.Error($"[{nameof(ConvaiGRPCWebAPI)}] Error processing viseme: {e.Message}", ConvaiLogger.LogCategory.Character); }
        }

        /// <summary> Helper to safely convert an object to JSON string. </summary>
        /// <param name="obj">Object to serialize.</param>
        /// <param name="context">Context string for error logging.</param>
        /// <returns>JSON string or empty string if null or error.</returns>
        private string GetJsonString(object obj, string context)
        {
            if (obj == null) return string.Empty;
            try
            {
                return JsonUtility.ToJson(obj);
            }
            catch (Exception e)
            {
                string npcName = _currentInteractingNPC != null ? _currentInteractingNPC.name : "Unknown NPC";
                ConvaiLogger.Error($"[{nameof(ConvaiGRPCWebAPI)}] Error serializing {context} for {npcName}: {e.Message}", ConvaiLogger.LogCategory.Character);
                return string.Empty;
            }
        }

        #endregion

#if !UNITY_WEBGL || UNITY_EDITOR
        #region HTTP REST API Methods (Unity Editor Support)

        /// <summary>
        /// Sends text via simulated response (Unity Editor only) - for UI testing
        /// </summary>
        private IEnumerator SendTextViaSimulation(string text)
        {
            if (_currentInteractingNPC == null)
            {
                ConvaiLogger.Error($"[{nameof(ConvaiGRPCWebAPI)}] Cannot simulate response: No active NPC", ConvaiLogger.LogCategory.Character);
                yield break;
            }

            if (_isProcessingRequest)
            {
                ConvaiLogger.Warn($"[{nameof(ConvaiGRPCWebAPI)}] Simulation already in progress, skipping", ConvaiLogger.LogCategory.Character);
                yield break;
            }

            _isProcessingRequest = true;
            ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] Simulating response for: {text}", ConvaiLogger.LogCategory.Character);

            // Simulate network delay
            yield return new WaitForSeconds(1.0f);

            // Generate simulated response based on user input
            string simulatedResponse = GenerateSimulatedResponse(text, _currentInteractingNPC.characterName);
            
            // Simulate the JavaScript callback
            OnTextResponseReceived(simulatedResponse);
            
            ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] Simulated response: {simulatedResponse}", ConvaiLogger.LogCategory.Character);

            _isProcessingRequest = false;
        }

        /// <summary>
        /// Simulates voice input process (Unity Editor only)
        /// </summary>
        private IEnumerator SimulateVoiceInput()
        {
            if (_currentInteractingNPC == null) yield break;

            ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] Starting voice simulation for {_currentInteractingNPC.name}", ConvaiLogger.LogCategory.Character);

            // Simulate recording time (3 seconds)
            yield return new WaitForSeconds(3.0f);

            // Simulate voice transcription
            string[] simulatedVoiceInputs = {
                "Hello there!",
                "How are you doing?",
                "What can you tell me about yourself?",
                "I'm interested in learning more.",
                "Thank you for your help."
            };

            int randomIndex = UnityEngine.Random.Range(0, simulatedVoiceInputs.Length);
            string simulatedTranscription = simulatedVoiceInputs[randomIndex];

            // Simulate the voice transcription callback
            OnUserResponseReceived(simulatedTranscription);
            
            ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] Simulated voice transcription: '{simulatedTranscription}'", ConvaiLogger.LogCategory.Character);

            // Wait a moment, then generate NPC response
            yield return new WaitForSeconds(0.5f);

            // Process the transcribed text as if it was sent
            yield return StartCoroutine(SendTextViaSimulation(simulatedTranscription));
        }

        /// <summary>
        /// Generates a simulated NPC response for testing
        /// </summary>
        private string GenerateSimulatedResponse(string userInput, string npcName)
        {
            string[] responses = {
                $"Hello! I'm {npcName}. You said: '{userInput}'. How can I help you?",
                $"That's interesting! As {npcName}, I think about '{userInput}' quite often.",
                $"I'm {npcName}, and I appreciate you sharing '{userInput}' with me.",
                $"Thanks for telling me '{userInput}'. What else would you like to discuss?",
                $"As {npcName}, I find '{userInput}' fascinating. Tell me more!"
            };
            
            int randomIndex = UnityEngine.Random.Range(0, responses.Length);
            return responses[randomIndex];
        }

        /// <summary>
        /// Sends text to Convai via HTTP REST API (Unity Editor only) - BACKUP METHOD
        /// </summary>
        private IEnumerator SendTextViaHTTP(string text)
        {
            if (string.IsNullOrEmpty(APIKey) || _currentInteractingNPC == null)
            {
                ConvaiLogger.Error($"[{nameof(ConvaiGRPCWebAPI)}] Cannot send HTTP request: Missing API Key or NPC", ConvaiLogger.LogCategory.Character);
                yield break;
            }

            if (_isProcessingRequest)
            {
                ConvaiLogger.Warn($"[{nameof(ConvaiGRPCWebAPI)}] HTTP request already in progress, skipping", ConvaiLogger.LogCategory.Character);
                yield break;
            }

            _isProcessingRequest = true;
            ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] Sending HTTP request: {text}", ConvaiLogger.LogCategory.Character);

            // Prepare request data in the correct format for Convai API
            var requestData = new
            {
                userText = text,
                charID = _currentInteractingNPC.characterID,
                sessionID = string.IsNullOrEmpty(_currentSessionID) ? "-1" : _currentSessionID,
                voiceResponse = false,  // Set to false for text-only in Editor
                streamAudio = false
            };

            string jsonData = JsonUtility.ToJson(requestData);
            byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonData);

            // Create UnityWebRequest - try the correct endpoint
            using (UnityWebRequest request = new UnityWebRequest($"{CONVAI_API_BASE_URL}/character/getResponse", "POST"))
            {
                request.uploadHandler = new UploadHandlerRaw(bodyRaw);
                request.downloadHandler = new DownloadHandlerBuffer();
                request.SetRequestHeader("Content-Type", "application/json");
                request.SetRequestHeader("CONVAI-API-KEY", APIKey);

                // Send request
                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.Success)
                {
                    try
                    {
                        // Parse response
                        var response = JsonUtility.FromJson<ConvaiHTTPResponse>(request.downloadHandler.text);
                        if (!string.IsNullOrEmpty(response.text))
                        {
                            // Update session ID if provided
                            if (!string.IsNullOrEmpty(response.sessionID))
                            {
                                _currentSessionID = response.sessionID;
                            }

                            // Simulate the JavaScript callback
                            OnTextResponseReceived(response.text);
                            
                            ConvaiLogger.DebugLog($"[{nameof(ConvaiGRPCWebAPI)}] HTTP Response received: {response.text}", ConvaiLogger.LogCategory.Character);
                        }
                    }
                    catch (Exception e)
                    {
                        ConvaiLogger.Error($"[{nameof(ConvaiGRPCWebAPI)}] Failed to parse HTTP response: {e.Message}", ConvaiLogger.LogCategory.Character);
                    }
                }
                else
                {
                    ConvaiLogger.Error($"[{nameof(ConvaiGRPCWebAPI)}] HTTP request failed: {request.error}", ConvaiLogger.LogCategory.Character);
                }
            }

            _isProcessingRequest = false;
        }

        /// <summary>
        /// Response data structure for Convai HTTP API
        /// </summary>
        [System.Serializable]
        private class ConvaiHTTPResponse
        {
            public string text;
            public string sessionID;
            public string audio;
        }

        #endregion
#endif

        #region External JavaScript Functions (DllImport)

#if UNITY_WEBGL && !UNITY_EDITOR
        // Ensure this matches the actual JS function signature, including defaults if used
        [DllImport("__Internal")] private static extern void initMicrophone();
        [DllImport("__Internal")] private static extern void startAudioChunk();
        [DllImport("__Internal")] private static extern void endAudioChunk();
        [DllImport("__Internal")] private static extern void initializeConvaiClient(string apiKey, string characterId, bool enableAudioRecorder, string actionConfig = "", string templateKeys = "");
        [DllImport("__Internal")] private static extern void sendTextRequest(string request);
        [DllImport("__Internal")] private static extern void sendFeedback(string character_id, string session_id, bool thumbs_up, string feedback_text);
        [DllImport("__Internal")] private static extern void sendTriggerData(string triggerName, string triggerMessage);
        [DllImport("__Internal")] private static extern void setActionConfig(string actionConfigJson);
        [DllImport("__Internal")] private static extern void interruptCharacter();
        [DllImport("__Internal")] private static extern void toggleAudioVolume();
        [DllImport("__Internal")] private static extern void pauseAudio();
        [DllImport("__Internal")] private static extern void resumeAudio();
        [DllImport("__Internal")] private static extern void getAudioVolume();
#endif
        #endregion
    }
}

