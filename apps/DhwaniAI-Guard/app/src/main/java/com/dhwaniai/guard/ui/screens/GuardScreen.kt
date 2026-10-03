package com.dhwaniai.guard.ui.screens

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dhwaniai.guard.engine.ThreatAssessment
import com.dhwaniai.guard.service.EventLogEntry
import com.dhwaniai.guard.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*
import kotlin.math.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GuardScreen(
    isListening: Boolean,
    assessment: ThreatAssessment?,
    audioLevel: Float,
    eventLog: List<EventLogEntry>,
    onStartListening: () -> Unit,
    onStopListening: () -> Unit
) {
    val statusColor = when (assessment?.situationLevel) {
        "CRITICAL" -> StatusCritical
        "WARNING" -> StatusWarning
        "SUSPICIOUS" -> StatusSuspicious
        else -> StatusSafe
    }

    var acknowledgedAlertTime by remember { mutableStateOf(0L) }
    val isAlarmActive = assessment?.isAlarmActive == true
    val showEmergencyModal = isAlarmActive && (System.currentTimeMillis() - acknowledgedAlertTime > 12_000L)

    // In-App Modern Generic Alert Modal
    if (showEmergencyModal) {
        AlertDialog(
            onDismissRequest = { acknowledgedAlertTime = System.currentTimeMillis() },
            icon = {
                Box(
                    modifier = Modifier
                        .size(76.dp)
                        .clip(CircleShape)
                        .background(AccentRedDim)
                        .border(2.dp, AccentRed, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Filled.Warning,
                        contentDescription = null,
                        tint = AccentRed,
                        modifier = Modifier.size(42.dp)
                    )
                }
            },
            title = {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                    Text(
                        text = "ALERT",
                        fontWeight = FontWeight.Black,
                        fontSize = 28.sp,
                        color = AccentRed,
                        letterSpacing = 4.sp,
                        textAlign = TextAlign.Center
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = "UNUSUAL ACOUSTIC EVENT DETECTED",
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp,
                        color = TextSecondary,
                        letterSpacing = 1.5.sp
                    )
                }
            },
            text = {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Spacer(Modifier.height(8.dp))
                    Text(
                        text = "An elevated threat pattern was identified in your immediate physical environment.",
                        fontSize = 14.sp,
                        color = TextPrimary,
                        textAlign = TextAlign.Center,
                        lineHeight = 20.sp
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        text = "Please verify your surroundings and take appropriate safety precautions.",
                        fontSize = 13.sp,
                        color = TextSecondary,
                        textAlign = TextAlign.Center,
                        lineHeight = 18.sp
                    )
                    Spacer(Modifier.height(16.dp))

                    Surface(
                        color = DarkSurface,
                        shape = RoundedCornerShape(12.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("THREAT STATUS", color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 1.sp)
                            Text(
                                text = assessment?.situationLevel ?: "WARNING",
                                color = AccentRed,
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 13.sp,
                                letterSpacing = 1.sp
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { acknowledgedAlertTime = System.currentTimeMillis() },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = AccentRed,
                        contentColor = Color.White
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text(
                        "ACKNOWLEDGE ALERT",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        letterSpacing = 1.5.sp
                    )
                }
            },
            containerColor = DarkCard,
            shape = RoundedCornerShape(24.dp),
            modifier = Modifier.border(1.dp, AccentRedGlow, RoundedCornerShape(24.dp))
        )
    }

    Scaffold(
        containerColor = DarkBackground,
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(end = 16.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(if (isListening) AccentGreenDim else DarkCardElevated)
                                    .border(1.dp, if (isListening) AccentGreen else DarkBorder, RoundedCornerShape(10.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    Icons.Filled.Shield,
                                    contentDescription = null,
                                    tint = if (isListening) AccentGreen else TextSecondary,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                            Spacer(Modifier.width(12.dp))
                            Column {
                                Text(
                                    "DhwaniAI Guard",
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 18.sp,
                                    color = TextPrimary,
                                    letterSpacing = 0.5.sp
                                )
                                Text(
                                    "Edge Threat Sentinel",
                                    fontSize = 11.sp,
                                    color = TextSecondary,
                                    letterSpacing = 1.sp
                                )
                            }
                        }

                        // Live Status Pill
                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = if (isListening) AccentGreenDim else DarkCard,
                            border = androidx.compose.foundation.BorderStroke(1.dp, if (isListening) AccentGreen.copy(alpha = 0.4f) else DarkBorder),
                            modifier = Modifier.padding(start = 8.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                            ) {
                                val pulseDotAlpha by rememberInfiniteTransition(label = "dot").animateFloat(
                                    initialValue = 0.3f,
                                    targetValue = 1f,
                                    animationSpec = infiniteRepeatable(
                                        animation = tween(800, easing = EaseInOutSine),
                                        repeatMode = RepeatMode.Reverse
                                    ),
                                    label = "dotAlpha"
                                )
                                Box(
                                    modifier = Modifier
                                        .size(7.dp)
                                        .clip(CircleShape)
                                        .background(if (isListening) AccentGreen.copy(alpha = pulseDotAlpha) else TextMuted)
                                )
                                Spacer(Modifier.width(6.dp))
                                Text(
                                    text = if (isListening) "ACTIVE" else "STANDBY",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isListening) AccentGreen else TextMuted,
                                    letterSpacing = 1.sp
                                )
                            }
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = DarkBackground,
                    titleContentColor = TextPrimary
                )
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            contentPadding = PaddingValues(top = 8.dp, bottom = 32.dp)
        ) {
            // Cyber Radar Scanner & Threat Gauge
            item {
                CyberRadarTarget(
                    isListening = isListening,
                    audioLevel = audioLevel,
                    assessment = assessment,
                    statusColor = statusColor
                )
            }

            // Real-Time Audio Frequency Visualizer Bars
            item {
                AudioEqualizerVisualizer(
                    isListening = isListening,
                    audioLevel = audioLevel,
                    statusColor = statusColor
                )
            }

            // Main Control Button
            item {
                CyberControlButton(
                    isListening = isListening,
                    onStart = onStartListening,
                    onStop = onStopListening
                )
            }

            // Quick Stats Matrix (4-tile grid)
            item {
                QuickStatsGrid(isListening = isListening)
            }

            // Threat Analysis Card
            if (isListening) {
                item {
                    ModernThreatCard(assessment = assessment, statusColor = statusColor)
                }
            }

            // Event Log
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "SECURITY TIMELINE",
                        color = TextSecondary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        letterSpacing = 1.5.sp
                    )
                    Text(
                        "${eventLog.size} events",
                        color = TextMuted,
                        fontSize = 11.sp
                    )
                }
            }

            if (eventLog.isEmpty()) {
                item {
                    EmptySecurityLogCard(isListening = isListening)
                }
            } else {
                items(eventLog.take(15)) { entry ->
                    ModernEventLogCard(entry)
                }
            }
        }
    }
}

@Composable
fun CyberRadarTarget(
    isListening: Boolean,
    audioLevel: Float,
    assessment: ThreatAssessment?,
    statusColor: Color
) {
    val infiniteTransition = rememberInfiniteTransition(label = "radar")

    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = if (isListening) 1.03f else 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = EaseInOutSine),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale"
    )

    val radarAngle by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(4000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "angle"
    )

    val animatedColor by animateColorAsState(
        targetValue = statusColor,
        animationSpec = tween(500),
        label = "statusColor"
    )

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp),
        contentAlignment = Alignment.Center
    ) {
        Canvas(
            modifier = Modifier
                .size(240.dp)
                .scale(pulseScale)
        ) {
            val center = Offset(size.width / 2, size.height / 2)
            val maxRadius = size.minDimension / 2

            // Target ring 1 (Outer border)
            drawCircle(
                color = DarkBorder,
                radius = maxRadius,
                center = center,
                style = Stroke(width = 1.5.dp.toPx())
            )

            // Target ring 2 (Mid concentric ring)
            drawCircle(
                color = DarkBorderSubtle,
                radius = maxRadius * 0.72f,
                center = center,
                style = Stroke(width = 1.dp.toPx())
            )

            // Target ring 3 (Inner target ring)
            drawCircle(
                color = DarkBorderSubtle,
                radius = maxRadius * 0.45f,
                center = center,
                style = Stroke(width = 1.dp.toPx())
            )

            // Subtle Crosshairs
            drawLine(
                color = DarkBorderSubtle.copy(alpha = 0.6f),
                start = Offset(center.x - maxRadius, center.y),
                end = Offset(center.x + maxRadius, center.y),
                strokeWidth = 1.dp.toPx()
            )
            drawLine(
                color = DarkBorderSubtle.copy(alpha = 0.6f),
                start = Offset(center.x, center.y - maxRadius),
                end = Offset(center.x, center.y + maxRadius),
                strokeWidth = 1.dp.toPx()
            )

            if (isListening) {
                // Sonar Sweep Radar Beam
                drawArc(
                    brush = Brush.sweepGradient(
                        colors = listOf(
                            Color.Transparent,
                            animatedColor.copy(alpha = 0.02f),
                            animatedColor.copy(alpha = 0.18f)
                        ),
                        center = center
                    ),
                    startAngle = radarAngle - 60f,
                    sweepAngle = 60f,
                    useCenter = true
                )

                // Threat Score Arc
                val score = assessment?.threatScore ?: 0
                val sweep = (score / 100f) * 360f
                drawArc(
                    brush = Brush.sweepGradient(
                        colors = listOf(animatedColor.copy(alpha = 0.4f), animatedColor),
                        center = center
                    ),
                    startAngle = -90f,
                    sweepAngle = sweep,
                    useCenter = false,
                    style = Stroke(width = 7.dp.toPx(), cap = StrokeCap.Round)
                )

                // Reactive Audio Level Inner Wave
                val waveRadius = maxRadius * (0.45f + audioLevel.coerceIn(0f, 1f) * 0.22f)
                drawCircle(
                    color = animatedColor.copy(alpha = 0.25f),
                    radius = waveRadius,
                    center = center,
                    style = Stroke(width = 2.dp.toPx())
                )
            }
        }

        // Center Cyber Readout
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            if (isListening) {
                Text(
                    text = (assessment?.threatScore ?: 0).toString(),
                    fontSize = 54.sp,
                    fontWeight = FontWeight.Black,
                    color = animatedColor,
                    fontFamily = FontFamily.Monospace,
                    letterSpacing = (-1).sp
                )

                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = animatedColor.copy(alpha = 0.15f),
                    border = androidx.compose.foundation.BorderStroke(1.dp, animatedColor.copy(alpha = 0.4f)),
                    modifier = Modifier.padding(top = 2.dp)
                ) {
                    Text(
                        text = assessment?.situationLevel ?: "NORMAL",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = animatedColor,
                        letterSpacing = 2.sp,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
            } else {
                Icon(
                    Icons.Outlined.Shield,
                    contentDescription = null,
                    tint = TextMuted,
                    modifier = Modifier.size(52.dp)
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    "STANDBY",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextMuted,
                    letterSpacing = 3.sp
                )
            }
        }
    }
}

@Composable
fun AudioEqualizerVisualizer(
    isListening: Boolean,
    audioLevel: Float,
    statusColor: Color
) {
    Surface(
        color = DarkSurface,
        shape = RoundedCornerShape(16.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Filled.GraphicEq,
                    contentDescription = null,
                    tint = if (isListening) statusColor else TextMuted,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    text = if (isListening) "SPECTRUM ACTIVITY" else "AUDIO SENSOR IDLE",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextSecondary,
                    letterSpacing = 1.sp
                )
            }

            // 16 Real-time animated equalizer bars
            Row(
                horizontalArrangement = Arrangement.spacedBy(3.dp),
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.height(24.dp)
            ) {
                val barCount = 16
                for (i in 0 until barCount) {
                    val normalizedIdx = (i - barCount / 2f) / (barCount / 2f)
                    val curve = exp(-2.0 * normalizedIdx * normalizedIdx).toFloat()

                    val targetHeight = if (isListening) {
                        val base = 4.dp
                        val ampScale = audioLevel.coerceIn(0f, 1f) * 20.dp.value
                        val variation = (sin((i * 0.7f + System.currentTimeMillis() * 0.005f)) * 0.5f + 0.5f)
                        (base + (ampScale * curve * (0.4f + 0.6f * variation)).dp).coerceIn(4.dp, 24.dp)
                    } else {
                        4.dp
                    }

                    Box(
                        modifier = Modifier
                            .width(3.dp)
                            .height(targetHeight)
                            .clip(RoundedCornerShape(1.5.dp))
                            .background(
                                if (isListening) {
                                    Brush.verticalGradient(
                                        listOf(statusColor, statusColor.copy(alpha = 0.4f))
                                    )
                                } else {
                                    Brush.verticalGradient(listOf(DarkBorder, DarkBorder))
                                }
                            )
                    )
                }
            }
        }
    }
}

@Composable
fun CyberControlButton(
    isListening: Boolean,
    onStart: () -> Unit,
    onStop: () -> Unit
) {
    Button(
        onClick = if (isListening) onStop else onStart,
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = if (isListening) DarkCardElevated else AccentGreen,
            contentColor = if (isListening) AccentRed else DarkBackground
        ),
        shape = RoundedCornerShape(18.dp),
        border = androidx.compose.foundation.BorderStroke(
            1.5.dp,
            if (isListening) AccentRed.copy(alpha = 0.6f) else AccentGreen
        )
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Icon(
                if (isListening) Icons.Filled.Stop else Icons.Filled.Mic,
                contentDescription = null,
                modifier = Modifier.size(22.dp)
            )
            Spacer(Modifier.width(10.dp))
            Text(
                if (isListening) "DISARM SENTINEL" else "ACTIVATE PROTECTION",
                fontWeight = FontWeight.ExtraBold,
                fontSize = 15.sp,
                letterSpacing = 1.5.sp
            )
        }
    }
}

@Composable
fun QuickStatsGrid(isListening: Boolean) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        StatTile(
            title = "DSP ENGINE",
            value = "V3 HYBRID",
            subtitle = "Edge Neural",
            activeColor = AccentCyan,
            modifier = Modifier.weight(1f)
        )
        StatTile(
            title = "LATENCY",
            value = if (isListening) "4.2 ms" else "---",
            subtitle = "Zero Queue",
            activeColor = AccentGreen,
            modifier = Modifier.weight(1f)
        )
        StatTile(
            title = "STREAM",
            value = "16 kHz",
            subtitle = "Continuous",
            activeColor = AccentBlue,
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
fun StatTile(
    title: String,
    value: String,
    subtitle: String,
    activeColor: Color,
    modifier: Modifier = Modifier
) {
    Surface(
        color = DarkCard,
        shape = RoundedCornerShape(14.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorderSubtle),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = title,
                fontSize = 9.sp,
                fontWeight = FontWeight.Bold,
                color = TextMuted,
                letterSpacing = 1.sp
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text = value,
                fontSize = 14.sp,
                fontWeight = FontWeight.Black,
                color = activeColor,
                fontFamily = FontFamily.Monospace
            )
            Spacer(Modifier.height(2.dp))
            Text(
                text = subtitle,
                fontSize = 10.sp,
                color = TextSecondary
            )
        }
    }
}

@Composable
fun ModernThreatCard(
    assessment: ThreatAssessment?,
    statusColor: Color
) {
    val score = assessment?.threatScore ?: 0

    Surface(
        color = DarkCard,
        shape = RoundedCornerShape(18.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(18.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        "TEMPORAL ASSESSMENT",
                        color = TextMuted,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.5.sp
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = if (assessment?.isAlarmActive == true) "Active Alert Triggered" else "Live Physical Monitoring",
                        color = TextPrimary,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = statusColor.copy(alpha = 0.15f),
                    border = androidx.compose.foundation.BorderStroke(1.dp, statusColor.copy(alpha = 0.5f))
                ) {
                    Text(
                        text = assessment?.situationLevel ?: "NORMAL",
                        color = statusColor,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 11.sp,
                        letterSpacing = 1.sp,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            Spacer(Modifier.height(16.dp))

            // Animated Threat Score Progress Bar
            val animatedProgress by animateFloatAsState(
                targetValue = (score / 100f).coerceIn(0f, 1f),
                animationSpec = tween(400, easing = EaseOutCubic),
                label = "threatBar"
            )

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(10.dp)
                    .clip(RoundedCornerShape(5.dp))
                    .background(DarkSurface)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .fillMaxWidth(animatedProgress)
                        .clip(RoundedCornerShape(5.dp))
                        .background(
                            Brush.horizontalGradient(
                                listOf(statusColor.copy(alpha = 0.5f), statusColor)
                            )
                        )
                )
            }

            Spacer(Modifier.height(14.dp))

            // Metric Details
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text("RMS AMPLITUDE", color = TextMuted, fontSize = 10.sp, fontWeight = FontWeight.SemiBold)
                    Text(
                        String.format("%.4f", assessment?.latestResult?.rms ?: 0f),
                        color = TextPrimary,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        fontSize = 12.sp
                    )
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("VERIFICATION", color = TextMuted, fontSize = 10.sp, fontWeight = FontWeight.SemiBold)
                    Text(
                        if (assessment?.isSustained == true) "CONFIRMED" else "ANALYZING",
                        color = if (assessment?.isSustained == true) AccentOrange else TextSecondary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("STREAK", color = TextMuted, fontSize = 10.sp, fontWeight = FontWeight.SemiBold)
                    Text(
                        "${assessment?.consecutiveCount ?: 0} frames",
                        color = TextPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp
                    )
                }
            }
        }
    }
}

@Composable
fun EmptySecurityLogCard(isListening: Boolean) {
    Surface(
        color = DarkCard,
        shape = RoundedCornerShape(14.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorderSubtle),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                Icons.Outlined.CheckCircle,
                contentDescription = null,
                tint = if (isListening) AccentGreen else TextMuted,
                modifier = Modifier.size(36.dp)
            )
            Spacer(Modifier.height(10.dp))
            Text(
                "No Threat Events Recorded",
                color = TextPrimary,
                fontWeight = FontWeight.SemiBold,
                fontSize = 14.sp
            )
            Spacer(Modifier.height(4.dp))
            Text(
                if (isListening) "Acoustic background is calm and within safety thresholds."
                else "Activate protection to begin continuous spatial threat monitoring.",
                color = TextSecondary,
                fontSize = 12.sp,
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
fun ModernEventLogCard(entry: EventLogEntry) {
    val timeFormat = remember { SimpleDateFormat("HH:mm:ss", Locale.getDefault()) }
    val eventColor = when (entry.situationLevel) {
        "CRITICAL" -> AccentRed
        "WARNING" -> AccentOrange
        else -> AccentYellow
    }

    Surface(
        color = DarkCard,
        shape = RoundedCornerShape(14.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorderSubtle),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(10.dp)
                    .clip(CircleShape)
                    .background(eventColor)
            )

            Spacer(Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    "ALERT",
                    color = TextPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    letterSpacing = 1.sp
                )
                Text(
                    "Threat Score: ${entry.threatScore}/100",
                    color = TextSecondary,
                    fontSize = 12.sp
                )
            }

            Column(horizontalAlignment = Alignment.End) {
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = eventColor.copy(alpha = 0.15f)
                ) {
                    Text(
                        entry.situationLevel,
                        color = eventColor,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 10.sp,
                        letterSpacing = 0.5.sp,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                    )
                }
                Spacer(Modifier.height(4.dp))
                Text(
                    timeFormat.format(Date(entry.timestamp)),
                    color = TextMuted,
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace
                )
            }
        }
    }
}
