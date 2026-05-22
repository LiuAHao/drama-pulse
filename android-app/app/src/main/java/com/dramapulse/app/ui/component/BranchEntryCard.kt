package com.dramapulse.app.ui.component

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.dramapulse.app.ui.theme.Accent

@Composable
fun BranchEntryCard(
    onGoToBranch: () -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp))
            .background(Color.Black.copy(alpha = 0.88f))
            .padding(24.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "全剧终",
                style = MaterialTheme.typography.headlineLarge,
                color = Accent
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "选择你的结局方向",
                style = MaterialTheme.typography.bodyLarge,
                color = Color.White.copy(alpha = 0.7f)
            )
            Spacer(modifier = Modifier.height(24.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(Accent)
                    .clickable(onClick = onGoToBranch),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "进入分支",
                    style = MaterialTheme.typography.bodyLarge,
                    color = Color.White
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "关闭",
                style = MaterialTheme.typography.bodySmall,
                color = Color.White.copy(alpha = 0.4f),
                modifier = Modifier.clickable(onClick = onDismiss)
            )
        }
    }
}
