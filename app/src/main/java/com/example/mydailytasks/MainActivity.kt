package com.example.mydailytasks

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.example.mydailytasks.ui.tasks.TaskListScreen
import com.example.mydailytasks.ui.theme.MyDailyTasksTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val taskId = intent.getIntExtra("task_id", -1)

        setContent {
            MyDailyTasksTheme {
                Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
                    TaskListScreen(modifier = Modifier.padding(innerPadding), initialTaskId = if (taskId != -1) taskId else null)
                }
            }
        }
    }
}