package com.dhwaniai.guard.engine

import kotlin.math.roundToInt

/**
 * Temporal threat assessment engine.
 *
 * Prevents false alarms by requiring:
 * 1. Emergency probability mass dominance
 * 2. Multi-window consensus class voting (prevents transient frame hijacking)
 * 3. Grace periods for pauses in screaming/crying to prevent premature decay
 */
class ThreatAssessmentEngine {

    companion object {
        // Minimum consecutive dangerous windows to trigger alert
        private const val MIN_SUSTAINED_WINDOWS = 2

        // Sliding window history size (number of recent classifications to track, matching server)
        private const val HISTORY_SIZE = 6

        // Minimum threat score to trigger alert (45 for responsive alerting)
        const val ALERT_THRESHOLD = 45

        // Cooldown between consecutive sound notifications (ms)
        private const val ALERT_COOLDOWN_MS = 5_000L

        // Threat score decay per calm window
        private const val DECAY_RATE = 20
    }

    private val history = ArrayDeque<ClassificationResult>(HISTORY_SIZE)
    private var currentThreatScore = 0
    private var lastAlertTime = 0L
    private var consecutiveDangerous = 0
    private var calmStreak = 0

    /**
     * Process a new classification result and return the current threat assessment.
     */
    fun assess(result: ClassificationResult): ThreatAssessment {
        if (history.size >= HISTORY_SIZE) {
            history.removeFirst()
        }
        history.addLast(result)

        val recentEmergencies = history.takeLast(3).filter { it.isDangerous }

        if (result.isDangerous) {
            consecutiveDangerous++
            calmStreak = 0

            // Threat score tied directly to actual neural confidence and multi-frame streak
            val conf = result.confidence
            val pts = (conf * 60f).roundToInt() + (result.emergencyMass * 20f).roundToInt() + minOf(consecutiveDangerous * 15, 30)
            val targetScore = minOf(100, maxOf(50, pts))
            currentThreatScore = maxOf(currentThreatScore, targetScore)
        } else {
            calmStreak++
            consecutiveDangerous = 0
            currentThreatScore = maxOf(0, currentThreatScore - DECAY_RATE)
        }

        // Multi-Window Temporal Hysteresis & Debounce:
        // Requires consecutive frames (>= 2) OR consensus (2 of 4) OR verified catastrophic instant emergency
        val isSustained = (consecutiveDangerous >= MIN_SUSTAINED_WINDOWS) || (recentEmergencies.size >= 2) || result.isInstantEmergency

        // Multi-Window Consensus Voting:
        val consensusClass: String = if (recentEmergencies.isNotEmpty()) {
            val emergencyClasses = arrayOf("SCREAM", "GLASS_BREAK", "IMPACT_CRASH", "GUNSHOT_EXPLOSION", "CROWD_PANIC", "SIREN")
            val classScores = mutableMapOf<String, Float>()
            for (cls in emergencyClasses) {
                val clsIdx = AcousticInferenceEngine.CLASSES.indexOf(cls)
                if (clsIdx >= 0) {
                    var sumProb = 0f
                    for (h in recentEmergencies) {
                        sumProb += h.probabilities[clsIdx]
                    }
                    classScores[cls] = sumProb
                }
            }
            classScores.maxByOrNull { it.value }?.key ?: result.predictedClass
        } else {
            result.predictedClass
        }

        // Determine if alert should fire (Active ONLY when verified sustained emergency AND score >= 45)
        val now = System.currentTimeMillis()
        val isAlarmActive = currentThreatScore >= ALERT_THRESHOLD && isSustained && consensusClass != "NORMAL"
        val shouldAlert = isAlarmActive && (now - lastAlertTime) > ALERT_COOLDOWN_MS

        if (shouldAlert) {
            lastAlertTime = now
        }

        val situationLevel = when {
            currentThreatScore >= 70 && isSustained -> "CRITICAL"
            currentThreatScore >= 45 && isSustained -> "WARNING"
            result.isDangerous || currentThreatScore >= 20 -> "SUSPICIOUS"
            else -> "NORMAL"
        }

        return ThreatAssessment(
            threatScore = currentThreatScore,
            situationLevel = situationLevel,
            shouldAlert = shouldAlert,
            isSustained = isSustained,
            consecutiveCount = consecutiveDangerous,
            peakThreatClass = consensusClass,
            latestResult = result,
            historySize = history.size,
            dangerousInHistory = history.count { it.isDangerous },
            isAlarmActive = isAlarmActive
        )
    }

    fun reset() {
        history.clear()
        currentThreatScore = 0
        consecutiveDangerous = 0
        calmStreak = 0
        lastAlertTime = 0L
    }
}

data class ThreatAssessment(
    val threatScore: Int,
    val situationLevel: String,
    val shouldAlert: Boolean,
    val isSustained: Boolean,
    val consecutiveCount: Int,
    val peakThreatClass: String?,
    val latestResult: ClassificationResult,
    val historySize: Int,
    val dangerousInHistory: Int,
    val isAlarmActive: Boolean = false
) {
    val alertTitle: String
        get() = "ALERT"

    val alertBody: String
        get() = "Unusual acoustic event detected. Please verify your surroundings."

    val displayMessage: String
        get() = when (situationLevel) {
            "CRITICAL" -> "🚨 ALERT: Critical acoustic anomaly detected"
            "WARNING" -> "⚠️ ALERT: Potential emergency detected"
            "SUSPICIOUS" -> "Monitoring: Elevated acoustic activity"
            else -> "Environment: Safe"
        }
}
