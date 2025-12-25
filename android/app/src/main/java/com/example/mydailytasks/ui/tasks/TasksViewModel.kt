package com.example.mydailytasks.ui.tasks

import android.app.Application
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.example.mydailytasks.data.Task
import com.example.mydailytasks.data.TaskDatabase
import com.example.mydailytasks.notifications.NotificationScheduler
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class TasksViewModel(application: Application) : ViewModel() {
    private val taskDao = TaskDatabase.getDatabase(application).taskDao()
    private val notificationScheduler = NotificationScheduler(application)

    val tasks = taskDao.getAllTasks()

    private suspend fun hasOverlap(newTask: Task): Boolean {
        return taskDao.getAllTasks().first().any {
            it.id != newTask.id &&
            ((newTask.startTime.isBefore(it.endTime) && newTask.endTime.isAfter(it.startTime)) ||
            (it.startTime.isBefore(newTask.endTime) && it.endTime.isAfter(newTask.startTime)) ||
            (newTask.startTime == it.startTime && newTask.endTime == it.endTime))
        }
    }

    fun insertTask(task: Task) {
        viewModelScope.launch {
            if (!hasOverlap(task)) {
                taskDao.insert(task)
                // To get the id, we need to query the database for the newly inserted task.
                // For simplicity for now, I'll schedule with the current task object.
                // In a real app, you would query for the task after insertion.
                notificationScheduler.schedule(task)
            } else {
                // Handle overlap, e.g., show a toast or a dialog to the user
                // For now, I'll just print a message
                println("Task overlap detected: $task")
            }
        }
    }

    fun updateTask(task: Task) {
        viewModelScope.launch {
            if (!hasOverlap(task)) {
                taskDao.update(task)
                notificationScheduler.schedule(task)
            } else {
                // Handle overlap
                println("Task overlap detected: $task")
            }
        }
    }

    fun deleteTask(task: Task) {
        viewModelScope.launch {
            taskDao.delete(task)
            notificationScheduler.cancel(task)
        }
    }

    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                val application = this[ViewModelProvider.AndroidViewModelFactory.APPLICATION_KEY] as Application
                TasksViewModel(application)
            }
        }
    }
}