package com.example.mydailytasks

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.example.mydailytasks.data.TaskDatabase
import com.example.mydailytasks.notifications.NotificationScheduler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class OnBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            val taskDao = TaskDatabase.getDatabase(context).taskDao()
            val notificationScheduler = NotificationScheduler(context)

            CoroutineScope(Dispatchers.IO).launch {
                val tasks = taskDao.getAllTasks().first()
                tasks.forEach { task ->
                    notificationScheduler.schedule(task)
                }
            }
        }
    }
}