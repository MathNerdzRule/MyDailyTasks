package com.example.mydailytasks

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat

class NotificationReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val taskId = intent.getIntExtra("task_id", -1)
        val taskTitle = intent.getStringExtra("task_title")
        val taskStartTime = intent.getStringExtra("task_start_time")
        val taskEndTime = intent.getStringExtra("task_end_time")

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val notificationIntent = Intent(context, MainActivity::class.java).apply {
            putExtra("task_id", taskId)
        }
        val pendingIntent = PendingIntent.getActivity(context, taskId, notificationIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

        val notification = NotificationCompat.Builder(context, "task_channel")
            .setContentTitle(taskTitle)
            .setContentText("From $taskStartTime to $taskEndTime")
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()

        notificationManager.notify(taskId, notification)
    }
}