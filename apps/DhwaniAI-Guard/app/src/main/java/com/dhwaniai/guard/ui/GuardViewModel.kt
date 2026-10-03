package com.dhwaniai.guard.ui

import android.app.Application
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.IBinder
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.dhwaniai.guard.engine.ThreatAssessment
import com.dhwaniai.guard.service.AudioListenerService
import com.dhwaniai.guard.service.EventLogEntry
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class GuardViewModel(application: Application) : AndroidViewModel(application) {

    private var service: AudioListenerService? = null
    private var bound = false

    private val _isListening = MutableStateFlow(false)
    val isListening: StateFlow<Boolean> = _isListening

    private val _assessment = MutableStateFlow<ThreatAssessment?>(null)
    val assessment: StateFlow<ThreatAssessment?> = _assessment

    private val _audioLevel = MutableStateFlow(0f)
    val audioLevel: StateFlow<Float> = _audioLevel

    private val _eventLog = MutableStateFlow<List<EventLogEntry>>(emptyList())
    val eventLog: StateFlow<List<EventLogEntry>> = _eventLog

    private val connection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
            val localBinder = binder as AudioListenerService.LocalBinder
            service = localBinder.getService()
            bound = true

            // Collect service state flows
            viewModelScope.launch {
                service!!.isListening.collect { _isListening.value = it }
            }
            viewModelScope.launch {
                service!!.latestAssessment.collect { _assessment.value = it }
            }
            viewModelScope.launch {
                service!!.audioLevel.collect { _audioLevel.value = it }
            }
            viewModelScope.launch {
                service!!.eventLog.collect { _eventLog.value = it }
            }
        }

        override fun onServiceDisconnected(name: ComponentName?) {
            service = null
            bound = false
        }
    }

    fun bindService() {
        val context = getApplication<Application>()
        val intent = Intent(context, AudioListenerService::class.java)
        context.bindService(intent, connection, Context.BIND_AUTO_CREATE)
    }

    fun unbindService() {
        if (bound) {
            getApplication<Application>().unbindService(connection)
            bound = false
        }
    }

    fun startListening() {
        val context = getApplication<Application>()
        val intent = Intent(context, AudioListenerService::class.java)
        context.startForegroundService(intent)

        // Bind if not already
        if (!bound) bindService()
    }

    fun stopListening() {
        service?.stopListening()
        val context = getApplication<Application>()
        context.stopService(Intent(context, AudioListenerService::class.java))
        _isListening.value = false
        _assessment.value = null
    }

    override fun onCleared() {
        unbindService()
        super.onCleared()
    }
}
