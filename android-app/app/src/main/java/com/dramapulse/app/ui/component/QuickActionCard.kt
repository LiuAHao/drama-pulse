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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.dramapulse.app.core.design.Dimens
import androidx.compose.material3.Icon

@Composable
fun QuickActionCard(
    icon: ImageVector,
    label: String,
    selected: Boolean = false,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val backgroundColor = if (selected) MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
    else MaterialTheme.colorScheme.surface
    val iconColor = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.primary
    val textColor = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface

    Column(
        modifier = modifier
            .clip(RoundedCornerShape(Dimens.CardRadius))
            .background(backgroundColor)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            imageVector = icon,
            contentDescription = label,
            tint = iconColor,
            modifier = Modifier.size(28.dp)
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelLarge,
            color = textColor
        )
    }
}
