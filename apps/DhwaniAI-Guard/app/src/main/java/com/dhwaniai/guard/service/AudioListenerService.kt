package com.dhwaniai.guard.service

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Binder
import android.os.IBinder
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.dhwaniai.guard.DhwaniGuardApp
import com.dhwaniai.guard.MainActivity
import com.dhwaniai.guard.engine.AcousticInferenceEngine
import com.dhwaniai.guard.engine.ThreatAssessment
import com.dhwaniai.guard.engine.ThreatAssessmentEngine
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class AudioListenerService : Service() {

    companion object {
        private const val TAG = "AudioListenerService"
        private const val NOTIFICATION_ID = 1
        private const val ALERT_NOTIFICATION_ID = 2
        private const val SAMPLE_RATE = AcousticInferenceEngine.SAMPLE_RATE
        private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_FLOAT
    }

    inner class LocalBinder : Binder() {
        fun getService(): AudioListenerService = this@AudioListenerService
    }

    private val binder = LocalBinder()
    private var inferenceEngine: AcousticInferenceEngine? = null
    private val threatEngine = ThreatAssessmentEngine()
    private var audioRecord: AudioRecord? = null
    private var listeningJob: Job? = null
    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())

    // Observable state
    private val _isListening = MutableStateFlow(false)
    val isListening: StateFlow<Boolean> = _isListening

    private val _latestAssessment = MutableStateFlow<ThreatAssessment?>(null)
    val latestAssessment: StateFlow<ThreatAssessment?> = _latestAssessment

    private val _audioLevel = MutableStateFlow(0f)
    val audioLevel: StateFlow<Float> = _audioLevel

    // Event log
    private val _eventLog = MutableStateFlow<List<EventLogEntry>>(emptyList())
    val eventLog: StateFlow<List<EventLogEntry>> = _eventLog

    override fun onBind(intent: Intent?): IBinder = binder

    override fun onCreate() {
        super.onCreate()
        try {
            inferenceEngine = AcousticInferenceEngine(this)
            Log.i(TAG, "Inference engine initialized successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize inference engine", e)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIFICATION_ID, createListeningNotification())
        startListening()
        return START_STICKY
    }

    override fun onDestroy() {
        stopListening()
        inferenceEngine?.close()
        scope.cancel()
        super.onDestroy()
    }

    fun startListening() {
        if (_isListening.value) return
        if (inferenceEngine == null) {
            Log.e(TAG, "Cannot start: inference engine not initialized")
            return
        }

        val minBufferSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT)
        val bufferSize = maxOf(
            minBufferSize * 2,
            AcousticInferenceEngine.EXPECTED_SAMPLES * 4 // 160KB
        )

        try {
            // Prefer VOICE_RECOGNITION to disable aggressive OEM AGC & noise suppression
            // Fallback to MIC if VOICE_RECOGNITION fails on the hardware
            val sources = intArrayOf(
                MediaRecorder.AudioSource.VOICE_RECOGNITION,
                MediaRecorder.AudioSource.MIC
            )

            var record: AudioRecord? = null
            for (source in sources) {
                try {
                    val candidate = AudioRecord(
                        source,
                        SAMPLE_RATE,
                        CHANNEL_CONFIG,
                        AUDIO_FORMAT,
                        bufferSize
                    )
                    if (candidate.state == AudioRecord.STATE_INITIALIZED) {
                        record = candidate
                        Log.i(TAG, "AudioRecord initialized successfully with source $source")
                        break
                    } else {
                        candidate.release()
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to initialize AudioRecord with source $source", e)
                }
            }

            if (record == null) {
                Log.e(TAG, "AudioRecord failed to initialize with any audio source")
                return
            }

            audioRecord = record
            audioRecord?.startRecording()
            _isListening.value = true
            threatEngine.reset()

            listeningJob = scope.launch {
                continuousListeningLoop()
            }

            Log.i(TAG, "Continuous acoustic listening started")
        } catch (e: SecurityException) {
            Log.e(TAG, "Microphone permission denied", e)
        }
    }

    fun stopListening() {
        _isListening.value = false
        listeningJob?.cancel()
        listeningJob = null
        try {
            audioRecord?.stop()
            audioRecord?.release()
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping AudioRecord", e)
        }
        audioRecord = null
        threatEngine.reset()
        _audioLevel.value = 0f
        Log.i(TAG, "Listening stopped")
    }

    /**
     * Main continuous listening loop.
     * Uses a gap-free sliding window accumulator matching the web dashboard:
     * - Reads small hardware chunks (2048 floats = 128ms) continuously.
     * - Slides the 40,000-sample (2.5s) window seamlessly with zero discontinuities.
     * - Runs V3 TFLite inference every 1.0s (16,000 samples).
     * - Provides real-time audio amplitude updates to the UI visualizer.
     */
    private suspend fun continuousListeningLoop() {
        val windowSamples = AcousticInferenceEngine.EXPECTED_SAMPLES // 40000 samples = 2.5s
        val hopSamples = 16000 // 1.0s hop interval matching web dashboard

        // 40000-sample rolling audio buffer
        val buffer = FloatArray(windowSamples)
        var totalSamplesCollected = 0
        var samplesSinceInference = 0

        // Hardware chunk size (2048 floats = 128ms @ 16kHz)
        val readChunkSize = 2048
        val readChunk = FloatArray(readChunkSize)

        while (currentCoroutineContext().isActive && _isListening.value) {
            val record = audioRecord ?: break

            val read = record.read(readChunk, 0, readChunkSize, AudioRecord.READ_BLOCKING)
            if (read <= 0) {
                delay(10)
                continue
            }

            // Real-time instantaneous peak audio level for UI visualizer
            var maxAmp = 0f
            for (i in 0 until read) {
                val absVal = kotlin.math.abs(readChunk[i])
                if (absVal > maxAmp) maxAmp = absVal
            }
            _audioLevel.value = maxAmp

            // Continuous sliding buffer update:
            // Shift buffer left by `read` samples and append new audio at the end
            if (read < windowSamples) {
                System.arraycopy(buffer, read, buffer, 0, windowSamples - read)
                System.arraycopy(readChunk, 0, buffer, windowSamples - read, read)
            } else {
                System.arraycopy(readChunk, read - windowSamples, buffer, 0, windowSamples)
            }

            totalSamplesCollected += read
            samplesSinceInference += read

            // Only run inference when:
            // 1. Initial 2.5s window has been completely filled with live audio
            // 2. Exactly `hopSamples` (1.0s) have elapsed since previous evaluation
            if (totalSamplesCollected >= windowSamples && samplesSinceInference >= hopSamples) {
                samplesSinceInference = 0

                try {
                    val snapshot = buffer.clone()
                    val result = inferenceEngine!!.classify(snapshot)
                    val assessment = threatEngine.assess(result)
                    _latestAssessment.value = assessment

                    // Log dangerous events (Mask specific class name -> generic "Alert")
                    if (result.isDangerous && assessment.isSustained) {
                        addLogEntry(
                            EventLogEntry(
                                timestamp = System.currentTimeMillis(),
                                eventClass = "ALERT",
                                label = "Alert",
                                confidence = result.confidence,
                                threatScore = assessment.threatScore,
                                situationLevel = assessment.situationLevel
                            )
                        )
                    }

                    // Trigger alert if needed
                    if (assessment.shouldAlert) {
                        triggerAlert(assessment)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Inference error", e)
                }
            }
        }
    }

    private fun triggerAlert(assessment: ThreatAssessment) {
        Log.w(TAG, "ALERT: Unusual acoustic event detected (Score: ${assessment.threatScore})")

        // Vibrate phone with rhythmic emergency pulses
        vibrateDevice()

        // Show generic alert notification without exposing sound class name
        val notification = NotificationCompat.Builder(this, DhwaniGuardApp.CHANNEL_ALERT)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle(assessment.alertTitle)
            .setContentText(assessment.alertBody)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setContentIntent(createMainActivityIntent())
            .build()

        val manager = getSystemService(NotificationManager::class.java)
        manager.notify(ALERT_NOTIFICATION_ID, notification)
    }

    private fun vibrateDevice() {
        val vibrator = if (android.os.Build.VERSION.SDK_INT >= 31) {
            val vm = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vm.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }

        val effect = VibrationEffect.createWaveform(
            longArrayOf(0, 400, 200, 400, 200, 600), // pattern
            -1 // no repeat
        )
        vibrator.vibrate(effect)
    }

    private fun addLogEntry(entry: EventLogEntry) {
        val current = _eventLog.value.toMutableList()
        current.add(0, entry) // newest first
        if (current.size > 50) current.removeLast()
        _eventLog.value = current
    }

    private fun createListeningNotification(): Notification {
        return NotificationCompat.Builder(this, DhwaniGuardApp.CHANNEL_LISTENING)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentTitle("DhwaniAI Guard Active")
            .setContentText("Monitoring ambient audio for threats...")
            .setOngoing(true)
            .setContentIntent(createMainActivityIntent())
            .build()
    }

    private fun createMainActivityIntent(): PendingIntent {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        return PendingIntent.getActivity(
            this, 0, intent, PendingIntent.FLAG_IMMUTABLE
        )
    }
}

data class EventLogEntry(
    val timestamp: Long,
    val eventClass: String,
    val label: String,
    val confidence: Float,
    val threatScore: Int,
    val situationLevel: String
)
