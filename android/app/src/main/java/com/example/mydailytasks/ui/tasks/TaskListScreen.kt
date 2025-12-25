package com.example.mydailytasks.ui.tasks

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.mydailytasks.data.Task
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import androidx.compose.runtime.LaunchedEffect

@Composable
fun TaskListScreen(modifier: Modifier = Modifier, initialTaskId: Int? = null, viewModel: TasksViewModel = viewModel(factory = TasksViewModel.Factory)) {
    val tasks by viewModel.tasks.collectAsState(initial = emptyList())
    var showDialog by remember { mutableStateOf(false) }
    var selectedTask by remember { mutableStateOf<Task?>(null) }

    LaunchedEffect(initialTaskId, tasks) {
        if (initialTaskId != null && initialTaskId != -1) {
            val taskToEdit = tasks.find { it.id == initialTaskId }
            if (taskToEdit != null) {
                selectedTask = taskToEdit
                showDialog = true
            }
        }
    }

    Scaffold(
        modifier = modifier,
        floatingActionButton = {
            FloatingActionButton(onClick = {
                selectedTask = null
                showDialog = true
            }) {
                Icon(Icons.Default.Add, contentDescription = "Add Task")
            }
        }
    ) { paddingValues ->
        LazyColumn(modifier = Modifier.padding(paddingValues)) {
            items(tasks) { task ->
                TaskItem(
                    task = task,
                    onEdit = {
                        selectedTask = it
                        showDialog = true
                    },
                    onDelete = { viewModel.deleteTask(it) }
                )
            }
        }
    }

    if (showDialog) {
        TaskEditDialog(
            task = selectedTask,
            onDismiss = { showDialog = false },
            onSave = { task ->
                if (selectedTask == null) {
                    viewModel.insertTask(task)
                } else {
                    viewModel.updateTask(task)
                }
                showDialog = false
            }
        )
    }
}