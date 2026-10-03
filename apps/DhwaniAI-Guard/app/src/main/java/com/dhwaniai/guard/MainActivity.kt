package com.dhwaniai.guard

import android.Manifest
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.rememberMultiplePermissionsState
import com.dhwaniai.guard.ui.GuardViewModel
import com.dhwaniai.guard.ui.screens.GuardScreen
import com.dhwaniai.guard.ui.theme.*

class MainActivity : ComponentActivity() {

    private val viewModel: GuardViewModel by viewModels()

    @OptIn(ExperimentalPermissionsApi::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            DhwaniGuardTheme {
                val permissionsState = rememberMultiplePermissionsState(
                    listOf(
                        Manifest.permission.RECORD_AUDIO,
                        Manifest.permission.POST_NOTIFICATIONS
                    )
                )

                if (permissionsState.allPermissionsGranted) {
                    val isListening by viewModel.isListening.collectAsState()
                    val assessment by viewModel.assessment.collectAsState()
                    val audioLevel by viewModel.audioLevel.collectAsState()
                    val eventLog by viewModel.eventLog.collectAsState()

                    GuardScreen(
                        isListening = isListening,
                        assessment = assessment,
                        audioLevel = audioLevel,
                        eventLog = eventLog,
                        onStartListening = { viewModel.startListening() },
                        onStopListening = { viewModel.stopListening() }
                    )
                } else {
                    PermissionScreen(
                        onRequestPermissions = { permissionsState.launchMultiplePermissionRequest() }
                    )
                }
            }
        }
    }

    override fun onStart() {
        super.onStart()
        viewModel.bindService()
    }

    override fun onStop() {
        viewModel.unbindService()
        super.onStop()
    }
}

@Composable
fun PermissionScreen(onRequestPermissions: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBackground),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(32.dp)
        ) {
            Icon(
                Icons.Filled.Mic,
                contentDescription = null,
                tint = AccentGreen,
                modifier = Modifier.size(72.dp)
            )

            Spacer(Modifier.height(24.dp))

            Text(
                "Microphone Access Required",
                color = TextPrimary,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )

            Spacer(Modifier.height(12.dp))

            Text(
                "DhwaniAI Guard needs microphone access to continuously monitor ambient audio for potential threats.",
                color = TextSecondary,
                fontSize = 14.sp,
                textAlign = TextAlign.Center,
                lineHeight = 22.sp
            )

            Spacer(Modifier.height(32.dp))

            Button(
                onClick = onRequestPermissions,
                colors = ButtonDefaults.buttonColors(
                    containerColor = AccentGreen,
                    contentColor = DarkBackground
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
            ) {
                Text("Grant Permissions", fontWeight = FontWeight.SemiBold)
            }
        }
    }
}
