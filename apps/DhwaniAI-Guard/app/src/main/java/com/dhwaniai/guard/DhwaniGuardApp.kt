package com.dhwaniai.guard

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build

class DhwaniGuardApp : Application() {

    companion object {
        const val CHANNEL_LISTENING = "dhwaniai_listening"
        const val CHANNEL_ALERT = "dhwaniai_alert"
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        // Persistent listening notification (low priority, silent)
        val listeningChannel = NotificationChannel(
            CHANNEL_LISTENING,
            "Listening Service",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Shows when DhwaniAI Guard is actively listening"
            setShowBadge(false)
        }

        // Alert notification (high priority, sound + vibrate)
        val alertChannel = NotificationChannel(
            CHANNEL_ALERT,
            "Threat Alerts",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Critical alerts when threats are detected"
            enableVibration(true)
            vibrationPattern = longArrayOf(0, 500, 200, 500, 200, 500)
        }

        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(listeningChannel)
        manager.createNotificationChannel(alertChannel)
    }
}
