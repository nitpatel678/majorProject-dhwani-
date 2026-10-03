package com.dhwaniai.guard.engine

import android.content.Context
import org.tensorflow.lite.Interpreter
import java.io.FileInputStream
import java.nio.MappedByteBuffer
import java.nio.channels.FileChannel
import kotlin.math.*

/**
 * DhwaniAI On-Device Acoustic Inference Engine
 *
 * Mirrors the exact feature pipeline from the training notebook:
 * - 16kHz sample rate
 * - 2.5s analysis window
 * - STFT: frame_length=512, frame_step=256
 * - 64 mel bins (20Hz - 8000Hz)
 * - Output shape: [155, 64, 1] log-mel spectrogram
 * - 7 classes: SCREAM, GLASS_BREAK, IMPACT_CRASH, GUNSHOT_EXPLOSION, CROWD_PANIC, SIREN, NORMAL
 */
class AcousticInferenceEngine(context: Context) {

    companion object {
        const val SAMPLE_RATE = 16000
        const val CLIP_DURATION = 2.5f
        const val EXPECTED_SAMPLES = (SAMPLE_RATE * CLIP_DURATION).toInt() // 40000

        // STFT parameters matching training
        private const val FRAME_LENGTH = 512
        private const val FRAME_STEP = 256
        private const val NUM_SPECTROGRAM_BINS = FRAME_LENGTH / 2 + 1 // 257
        private const val NUM_MEL_BINS = 64
        private const val SPEC_TIME_STEPS = 155
        private const val LOWER_EDGE_HZ = 20.0f
        private const val UPPER_EDGE_HZ = 8000.0f

        val CLASSES = arrayOf(
            "SCREAM",             // 0
            "GLASS_BREAK",        // 1
            "IMPACT_CRASH",       // 2
            "GUNSHOT_EXPLOSION",  // 3
            "CROWD_PANIC",        // 4
            "SIREN",              // 5
            "NORMAL"              // 6
        )

        val CLASS_LABELS = mapOf(
            "SCREAM" to "Screaming",
            "GLASS_BREAK" to "Glass Breaking",
            "IMPACT_CRASH" to "Vehicle Impact",
            "GUNSHOT_EXPLOSION" to "Gunshot/Explosion",
            "CROWD_PANIC" to "Crowd Panic",
            "SIREN" to "Emergency Siren",
            "NORMAL" to "Normal Ambient"
        )

        // Calibrated confidence thresholds (tuned for mobile acoustic capture)
        private val CLASS_THRESHOLDS = mapOf(
            "GUNSHOT_EXPLOSION" to 0.55f,
            "IMPACT_CRASH" to 0.45f,
            "SCREAM" to 0.45f,
            "GLASS_BREAK" to 0.50f,
            "CROWD_PANIC" to 0.40f,
            "SIREN" to 0.45f,
            "NORMAL" to 0.25f
        )

        // Threat severity weights
        val THREAT_WEIGHTS = mapOf(
            "GUNSHOT_EXPLOSION" to 1.0f,
            "IMPACT_CRASH" to 0.90f,
            "CROWD_PANIC" to 0.75f,
            "GLASS_BREAK" to 0.70f,
            "SCREAM" to 0.65f,
            "SIREN" to 0.30f,
            "NORMAL" to 0.0f
        )
    }

    private val interpreter: Interpreter
    private val melFilterBank: Array<FloatArray>

    init {
        val model = loadModelFile(context)
        val options = Interpreter.Options().apply {
            setNumThreads(2)
        }
        interpreter = Interpreter(model, options)
        melFilterBank = createMelFilterBank()
    }

    private fun loadModelFile(context: Context): MappedByteBuffer {
        val fd = context.assets.openFd("dhwaniai_model.tflite")
        val inputStream = FileInputStream(fd.fileDescriptor)
        val channel = inputStream.channel
        return channel.map(FileChannel.MapMode.READ_ONLY, fd.startOffset, fd.declaredLength)
    }

    /**
     * Run inference on raw PCM audio samples (16kHz, mono, float32 normalized [-1, 1]).
     * Returns a ClassificationResult with class, confidence, and all probabilities.
     */
    fun classify(audioSamples: FloatArray): ClassificationResult {
        // Step 1: Ensure correct length (40000 samples = 2.5s)
        val samples = normalizeLength(audioSamples)

        // Step 2: Compute STFT and spectrogram
        val (spectrogram, stftMagnitude, numFrames) = computeLogMelSpectrogramWithStft(samples)

        // Step 3: Compute complete V3 Acoustic DSP Physics
        val physics = computeAcousticPhysics(samples, stftMagnitude, numFrames)

        // Step 4: Run TFLite inference
        val inputBuffer = Array(1) { Array(SPEC_TIME_STEPS) { Array(NUM_MEL_BINS) { FloatArray(1) } } }
        for (t in 0 until SPEC_TIME_STEPS) {
            for (m in 0 until NUM_MEL_BINS) {
                inputBuffer[0][t][m][0] = spectrogram[t][m]
            }
        }

        val outputBuffer = Array(1) { FloatArray(CLASSES.size) }
        interpreter.run(inputBuffer, outputBuffer)

        val probabilities = outputBuffer[0]

        // Step 5: Apply V3 acoustic physics consistency & anti-spoofing gates
        return applyThresholds(probabilities, physics)
    }

    private fun normalizeLength(audio: FloatArray): FloatArray {
        return when {
            audio.size < EXPECTED_SAMPLES -> {
                val padded = FloatArray(EXPECTED_SAMPLES)
                audio.copyInto(padded)
                padded
            }
            audio.size > EXPECTED_SAMPLES -> audio.copyOfRange(0, EXPECTED_SAMPLES)
            else -> audio
        }
    }

    private fun computeAcousticPhysics(
        samples: FloatArray,
        stftMagnitude: Array<FloatArray>,
        numFrames: Int
    ): AcousticPhysics {
        // RMS & Peak
        var sumSquares = 0.0
        var peak = 0.0f
        for (s in samples) {
            sumSquares += (s * s).toDouble()
            val a = abs(s)
            if (a > peak) peak = a
        }
        val rms = sqrt(sumSquares / samples.size).toFloat()
        val crestFactor = peak / (rms + 1e-6f)

        // Zero Crossing Rate
        var zeroCrossings = 0
        for (i in 0 until samples.size - 1) {
            if ((samples[i] >= 0f && samples[i + 1] < 0f) || (samples[i] < 0f && samples[i + 1] >= 0f)) {
                zeroCrossings++
            }
        }
        val zcr = zeroCrossings.toFloat() / (samples.size - 1)

        // Spectral Energy Bands (<600Hz, 600-3000Hz, >=3000Hz) & Centroid
        var eLow = 0.0
        var eMid = 0.0
        var eHigh = 0.0
        var numSum = 0.0
        var denSum = 0.0

        for (t in 0 until numFrames) {
            for (k in 0 until NUM_SPECTROGRAM_BINS) {
                val mag = stftMagnitude[t][k].toDouble()
                val power = mag * mag
                val freq = k * 31.25 // bin frequency in Hz (16000 / 512 = 31.25)
                numSum += freq * mag
                denSum += mag

                when {
                    freq < 600.0 -> eLow += power
                    freq < 3000.0 -> eMid += power
                    else -> eHigh += power
                }
            }
        }

        val totalE = eLow + eMid + eHigh + 1e-9
        val lowRatio = (eLow / totalE).toFloat()
        val midRatio = (eMid / totalE).toFloat()
        val highRatio = (eHigh / totalE).toFloat()
        val centroid = (numSum / (denSum + 1e-9)).toFloat()

        return AcousticPhysics(
            rms = rms,
            peak = peak,
            crestFactor = crestFactor,
            lowRatio = lowRatio,
            midRatio = midRatio,
            highRatio = highRatio,
            centroid = centroid,
            zcr = zcr
        )
    }

    /**
     * Compute log-mel spectrogram matching the training pipeline:
     * tf.signal.stft(audio, frame_length=512, frame_step=256)
     * → magnitude → mel filter bank (64 bins) → log
     *
     * Returns: Triple(logMelSpectrogram, stftMagnitudes, numFrames)
     */
    private fun computeLogMelSpectrogramWithStft(audio: FloatArray): Triple<Array<FloatArray>, Array<FloatArray>, Int> {
        // Step 1: STFT
        val numFrames = (audio.size - FRAME_LENGTH) / FRAME_STEP + 1
        val stftMagnitude = Array(numFrames) { FloatArray(NUM_SPECTROGRAM_BINS) }

        val window = hannWindow(FRAME_LENGTH)

        for (frameIdx in 0 until numFrames) {
            val start = frameIdx * FRAME_STEP
            val frame = FloatArray(FRAME_LENGTH)
            for (i in 0 until FRAME_LENGTH) {
                frame[i] = if (start + i < audio.size) audio[start + i] * window[i] else 0f
            }

            // FFT
            val fftResult = fft(frame)

            // Magnitude of first NUM_SPECTROGRAM_BINS complex values
            for (k in 0 until NUM_SPECTROGRAM_BINS) {
                val real = fftResult[2 * k]
                val imag = fftResult[2 * k + 1]
                stftMagnitude[frameIdx][k] = sqrt(real * real + imag * imag)
            }
        }

        // Step 2: Apply mel filter bank
        val actualFrames = minOf(numFrames, SPEC_TIME_STEPS)
        val melSpec = Array(SPEC_TIME_STEPS) { FloatArray(NUM_MEL_BINS) }

        for (t in 0 until actualFrames) {
            for (m in 0 until NUM_MEL_BINS) {
                var sum = 0f
                for (k in 0 until NUM_SPECTROGRAM_BINS) {
                    sum += stftMagnitude[t][k] * melFilterBank[k][m]
                }
                melSpec[t][m] = sum
            }
        }

        // Step 3: Log scale (matching tf.math.log(mel + 1e-6))
        val logMelSpec = Array(SPEC_TIME_STEPS) { t ->
            FloatArray(NUM_MEL_BINS) { m ->
                ln(melSpec[t][m] + 1e-6f)
            }
        }

        return Triple(logMelSpec, stftMagnitude, numFrames)
    }

    private fun hannWindow(length: Int): FloatArray {
        return FloatArray(length) { i ->
            (0.5f * (1 - cos(2.0 * PI * i / length))).toFloat()
        }
    }

    /**
     * Simple radix-2 FFT. Input must be power-of-2 length.
     * Returns interleaved [real0, imag0, real1, imag1, ...].
     */
    private fun fft(input: FloatArray): FloatArray {
        val n = input.size
        val fftSize = Integer.highestOneBit(n - 1) shl 1
        val real = FloatArray(fftSize)
        val imag = FloatArray(fftSize)
        input.copyInto(real, endIndex = minOf(input.size, fftSize))

        // Bit-reversal permutation
        var j = 0
        for (i in 0 until fftSize) {
            if (i < j) {
                val tmpR = real[i]; real[i] = real[j]; real[j] = tmpR
                val tmpI = imag[i]; imag[i] = imag[j]; imag[j] = tmpI
            }
            var m = fftSize / 2
            while (m >= 1 && j >= m) {
                j -= m
                m /= 2
            }
            j += m
        }

        // Cooley-Tukey
        var step = 2
        while (step <= fftSize) {
            val halfStep = step / 2
            val angle = -2.0 * PI / step
            for (group in 0 until fftSize step step) {
                for (k in 0 until halfStep) {
                    val theta = angle * k
                    val wr = cos(theta).toFloat()
                    val wi = sin(theta).toFloat()
                    val idx1 = group + k
                    val idx2 = group + k + halfStep
                    val tR = wr * real[idx2] - wi * imag[idx2]
                    val tI = wr * imag[idx2] + wi * real[idx2]
                    real[idx2] = real[idx1] - tR
                    imag[idx2] = imag[idx1] - tI
                    real[idx1] = real[idx1] + tR
                    imag[idx1] = imag[idx1] + tI
                }
            }
            step *= 2
        }

        // Interleave output
        val result = FloatArray(fftSize * 2)
        for (i in 0 until fftSize) {
            result[2 * i] = real[i]
            result[2 * i + 1] = imag[i]
        }
        return result
    }

    /**
     * Create mel filter bank matching tf.signal.linear_to_mel_weight_matrix
     * Shape: [NUM_SPECTROGRAM_BINS, NUM_MEL_BINS]
     */
    private fun createMelFilterBank(): Array<FloatArray> {
        val bank = Array(NUM_SPECTROGRAM_BINS) { FloatArray(NUM_MEL_BINS) }

        val melLow = hzToMel(LOWER_EDGE_HZ)
        val melHigh = hzToMel(UPPER_EDGE_HZ)

        val melPoints = FloatArray(NUM_MEL_BINS + 2) { i ->
            melToHz(melLow + (melHigh - melLow) * i / (NUM_MEL_BINS + 1))
        }

        val binPoints = FloatArray(NUM_MEL_BINS + 2) { i ->
            melPoints[i] * FRAME_LENGTH / SAMPLE_RATE
        }

        for (m in 0 until NUM_MEL_BINS) {
            val left = binPoints[m]
            val center = binPoints[m + 1]
            val right = binPoints[m + 2]

            for (k in 0 until NUM_SPECTROGRAM_BINS) {
                val freq = k.toFloat()
                bank[k][m] = when {
                    freq < left -> 0f
                    freq < center -> (freq - left) / (center - left)
                    freq < right -> (right - freq) / (right - center)
                    else -> 0f
                }
            }
        }

        return bank
    }

    private fun hzToMel(hz: Float): Float = 2595f * log10(1f + hz / 700f)
    private fun melToHz(mel: Float): Float = 700f * (10f.pow(mel / 2595f) - 1f)

    /**
     * Calibrated V3 Hybrid Acoustic DSP Physics + Anti-Spoofing Gate.
     * Evaluates physical spectral consistency across low (<600Hz), mid (600-3000Hz), and high (>=3000Hz)
     * frequency bands, crest factor, spectral centroid, and zero-crossing rate.
     */
    private fun applyThresholds(probabilities: FloatArray, physics: AcousticPhysics): ClassificationResult {
        val normalProb = probabilities[6]
        val topRawIdx = probabilities.indices.maxByOrNull { probabilities[it] } ?: 6
        val topRawClass = CLASSES[topRawIdx]
        val topRawConf = probabilities[topRawIdx]

        val screamProb = probabilities[0]
        val glassProb = probabilities[1]
        val crashProb = probabilities[2]
        val gunProb = probabilities[3]
        val panicProb = probabilities[4]
        val sirenProb = probabilities[5]

        val emergencyMass = screamProb + glassProb + crashProb + gunProb + panicProb + sirenProb
        val kineticMass = crashProb + gunProb

        var isEmergency = false
        var validatedClass = "NORMAL"
        var isInstantEmergency = false

        val isPureSiren = (physics.midRatio >= 0.80f && physics.lowRatio <= 0.12f && physics.highRatio <= 0.04f)
        val isViolentImpact = (physics.peak >= 0.65f && physics.rms >= 0.065f)

        // -------------------------------------------------------------
        // Gate 1: Energy Floor (Digital Silence & Ambient Noise Floor)
        // -------------------------------------------------------------
        if (physics.rms < 0.010f || (physics.rms < 0.016f && physics.peak < 0.22f)) {
            isEmergency = false
            validatedClass = "NORMAL"
        }
        // -------------------------------------------------------------
        // Gate 2: Clear Ambient Normal Dominance
        // -------------------------------------------------------------
        else if (normalProb >= 0.65f && physics.crestFactor < 4.5f && physics.peak < 0.60f) {
            isEmergency = false
            validatedClass = "NORMAL"
        }
        // -------------------------------------------------------------
        // Gate 3: Universal Conversational Speech, Narration & Dialogue Protection
        // Conversational speech, podcast, YouTube review, movie dialogue:
        // centroid < 1850Hz, highRatio < 0.14, zcr < 0.15, rms < 0.080, peak < 0.60
        // Exceptions: pure mid-band electronic sirens & violent kinetic impacts
        // -------------------------------------------------------------
        else if (physics.centroid < 1850f && physics.highRatio < 0.14f && physics.zcr < 0.15f &&
                 physics.rms < 0.080f && physics.peak < 0.60f && !isPureSiren && !isViolentImpact) {
            isEmergency = false
            validatedClass = "NORMAL"
        }
        // Additional Gate 3b: Expressive or direct mic speech
        else if (physics.lowRatio >= 0.80f && physics.highRatio < 0.06f && physics.zcr < 0.08f && physics.centroid < 1600f) {
            isEmergency = false
            validatedClass = "NORMAL"
        }
        else if (physics.lowRatio >= 0.50f && physics.centroid < 1650f && physics.zcr < 0.14f && physics.highRatio < 0.10f &&
                 !(physics.peak >= 0.75f && physics.rms >= 0.10f)) {
            isEmergency = false
            validatedClass = "NORMAL"
        }
        // -------------------------------------------------------------
        // Gate 4: Sub-Bass Thuds, Wrestling Slams & Mechanical Desk Taps Rejection
        // -------------------------------------------------------------
        else if (physics.lowRatio >= 0.65f && topRawClass in arrayOf("SCREAM", "SIREN", "GLASS_BREAK")) {
            isEmergency = false
            validatedClass = "NORMAL"
        }
        else if (physics.lowRatio >= 0.72f && physics.midRatio < 0.24f && physics.rms < 0.070f && !(physics.peak >= 0.65f && physics.rms >= 0.080f)) {
            isEmergency = false
            validatedClass = "NORMAL"
        }
        // -------------------------------------------------------------
        // Gate 5: Laptop/Phone Speaker High-Mid Friction & Quiet ASMR Rejection
        // -------------------------------------------------------------
        else if (physics.midRatio >= 0.65f && physics.lowRatio <= 0.18f && physics.rms < 0.035f && topRawConf < 0.75f) {
            isEmergency = false
            validatedClass = "NORMAL"
        }
        else {
            // ---------------------------------------------------------
            // Class-Specific Acoustic & DSP Physics Validation (Production V5)
            // ---------------------------------------------------------

            // --- GLASS BREAK ---
            // High-frequency brittle shatter: highRatio >= 0.20, centroid >= 2400, zcr >= 0.15, peak >= 0.25
            if ((glassProb >= 0.20f || topRawClass == "GLASS_BREAK") &&
                (physics.highRatio >= 0.20f && physics.centroid >= 2400f && physics.zcr >= 0.15f && physics.peak >= 0.25f && physics.lowRatio < 0.50f)) {
                isEmergency = true
                validatedClass = "GLASS_BREAK"
            }

            // --- SCREAM (VOCAL DISTRESS) ---
            // High-pitch hyper-phonation shriek
            if (!isEmergency && (screamProb >= 0.18f || (topRawClass == "SCREAM" && emergencyMass >= 0.35f))) {
                if (physics.lowRatio <= 0.25f && physics.midRatio >= 0.65f && physics.centroid >= 1750f && physics.zcr >= 0.13f && physics.rms >= 0.035f && physics.peak >= 0.28f) {
                    isEmergency = true
                    validatedClass = "SCREAM"
                }
            }

            // Pure Vocal Shriek (LowR <= 0.05, MidR >= 0.75, Centroid >= 2300, ZCR >= 0.14)
            if (!isEmergency && (physics.lowRatio <= 0.05f && physics.midRatio >= 0.75f && physics.centroid >= 2300f && physics.zcr >= 0.14f && physics.rms >= 0.045f && physics.peak >= 0.35f && emergencyMass >= 0.35f)) {
                isEmergency = true
                validatedClass = "SCREAM"
            }

            // --- SIREN (CONTINUOUS ALERT TONE) ---
            // Pure tone mid-band acoustic signature
            if (!isEmergency && (sirenProb >= 0.15f || topRawClass == "SIREN" || isPureSiren)) {
                if (physics.midRatio >= 0.65f && physics.lowRatio <= 0.35f && physics.centroid >= 850f && physics.rms >= 0.018f) {
                    isEmergency = true
                    validatedClass = "SIREN"
                }
            }

            // --- KINETIC IMPACT: CRASH OR GUNSHOT / EXPLOSION ---
            if (!isEmergency && (kineticMass >= 0.20f || topRawClass in arrayOf("IMPACT_CRASH", "GUNSHOT_EXPLOSION"))) {
                val isGun = (physics.peak >= 0.65f && physics.rms >= 0.050f && (physics.crestFactor >= 3.2f || physics.peak >= 0.75f) && (gunProb >= 0.18f || topRawClass == "GUNSHOT_EXPLOSION"))
                val isCrash = (physics.peak >= 0.55f && physics.rms >= 0.050f && physics.lowRatio >= 0.18f && physics.lowRatio < 0.82f && (crashProb >= 0.18f || topRawClass == "IMPACT_CRASH" || kineticMass >= 0.30f))
                val isBlast = (physics.peak >= 0.70f && physics.rms >= 0.070f && kineticMass >= 0.22f)

                if (isGun || isCrash || isBlast) {
                    isEmergency = true
                    if (isGun && gunProb >= crashProb) {
                        validatedClass = "GUNSHOT_EXPLOSION"
                        // ONLY catastrophic supersonic shockwave qualifies as instant emergency!
                        if (physics.peak >= 0.85f && physics.crestFactor >= 4.0f && gunProb >= 0.50f) {
                            isInstantEmergency = true
                        }
                    } else if (isCrash) {
                        validatedClass = "IMPACT_CRASH"
                    } else {
                        validatedClass = if (gunProb >= crashProb) "GUNSHOT_EXPLOSION" else "IMPACT_CRASH"
                    }
                }
            }

            // --- CROWD PANIC ---
            // Multi-vocal chaotic distress: panicProb >= 0.28, rms >= 0.060, peak >= 0.45, centroid >= 1350
            if (!isEmergency && (panicProb >= 0.28f || (topRawClass == "CROWD_PANIC" && panicProb >= 0.22f))) {
                if (physics.rms >= 0.060f && physics.peak >= 0.45f && physics.zcr >= 0.08f && physics.lowRatio < 0.60f) {
                    isEmergency = true
                    validatedClass = "CROWD_PANIC"
                }
            }
        }

        val finalClass = if (isEmergency) validatedClass else "NORMAL"
        val finalConf = if (isEmergency) probabilities[CLASSES.indexOf(validatedClass)] else normalProb

        return ClassificationResult(
            predictedClass = finalClass,
            confidence = finalConf,
            probabilities = probabilities.toList(),
            rms = physics.rms,
            label = CLASS_LABELS[finalClass] ?: finalClass,
            threatWeight = THREAT_WEIGHTS[finalClass] ?: 0f,
            emergencyMass = emergencyMass,
            isEmergency = isEmergency,
            isInstantEmergency = isInstantEmergency,
            physics = physics
        )
    }

    fun close() {
        interpreter.close()
    }
}

data class AcousticPhysics(
    val rms: Float,
    val peak: Float,
    val crestFactor: Float,
    val lowRatio: Float,
    val midRatio: Float,
    val highRatio: Float,
    val centroid: Float,
    val zcr: Float
)

data class ClassificationResult(
    val predictedClass: String,
    val confidence: Float,
    val probabilities: List<Float>,
    val rms: Float,
    val label: String,
    val threatWeight: Float,
    val emergencyMass: Float = 0f,
    val isEmergency: Boolean = false,
    val isInstantEmergency: Boolean = false,
    val physics: AcousticPhysics? = null
) {
    val isDangerous: Boolean
        get() = isEmergency && predictedClass != "NORMAL" && predictedClass != "SIREN"

    val threatLevel: String
        get() = when {
            threatWeight >= 0.90f -> "CRITICAL"
            threatWeight >= 0.65f -> "HIGH"
            threatWeight >= 0.30f -> "MODERATE"
            else -> "SAFE"
        }
}
